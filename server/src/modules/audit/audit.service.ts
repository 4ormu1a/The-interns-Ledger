/** K1a — append-only, hash-chained audit log (FR-AUD-01/02).
 *  Serialised via pg advisory xact lock so the chain never forks under concurrent writes. */
import { sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { canonicalStringify } from "../../lib/canonical.js";
import { sha256hex } from "../../lib/crypto.js";

export interface AuditEvent {
  actorId: string | null;
  action: string;          // e.g. entry.approve, entry.reject, auth.login
  targetType: string;      // e.g. log_entry, user, token
  targetId?: string;
  metadata?: Record<string, unknown>;
}

const GENESIS = "0".repeat(64);

/** Opens its own tx to hold the advisory lock briefly. */
export async function appendAudit(ev: AuditEvent) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('audit_log'))`);
    const prev = await tx.execute(sql`SELECT hash FROM audit_log ORDER BY seq DESC LIMIT 1`);
    const prevHash = (prev.rows[0]?.hash as string | undefined) ?? GENESIS;
    const record = { ...ev, metadata: ev.metadata ?? null };
    const hash = sha256hex(prevHash + canonicalStringify(record));
    await tx.execute(sql`
      INSERT INTO audit_log (actor_id, action, target_type, target_id, metadata, prev_hash, hash)
      VALUES (${ev.actorId}, ${ev.action}, ${ev.targetType}, ${ev.targetId ?? null},
              ${ev.metadata ? JSON.stringify(ev.metadata) : null}, ${prevHash}, ${hash})`);
  });
}

/** AC-11 — walk the chain and recompute every hash. */
export async function verifyChain(): Promise<{ valid: boolean; checked: number; brokenAtSeq?: number }> {
  const rows = await db.execute(sql`SELECT seq, actor_id, action, target_type, target_id, metadata, prev_hash, hash FROM audit_log ORDER BY seq ASC`);
  let prevHash = GENESIS;
  for (const r of rows.rows) {
    const record = {
      actorId: r.actor_id as string | null, action: r.action as string, targetType: r.target_type as string,
      ...(r.target_id ? { targetId: r.target_id as string } : {}),
      metadata: (r.metadata as Record<string, unknown> | null),
    };
    const expect = sha256hex(prevHash + canonicalStringify(record));
    if (r.prev_hash !== prevHash || r.hash !== expect) return { valid: false, checked: rows.rows.length, brokenAtSeq: r.seq as number };
    prevHash = r.hash as string;
  }
  return { valid: true, checked: rows.rows.length };
}
