/** E1-E5 — approve & seal (UC-04, FR-INT-01/02/03, FR-QR-01). */
import { ulid } from "ulid";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { logEntries, attachments, seals, signingKeys, verificationTokens, notifications } from "../../db/schema/index.js";
import { canonicalStringify } from "../../lib/canonical.js";
import { sha256hex, signDigest, signingAvailable } from "../../lib/crypto.js";
import { ApiError } from "../../middleware/error.js";
import { env } from "../../config/env.js";
import { appendAudit } from "../audit/audit.service.js";

export async function approveAndSeal(entryId: string, approverId: string) {
  if (!signingAvailable()) {
    // UC-04 exception flow: signing unavailable → refuse approval, entry stays Submitted
    console.error("SIGNING_UNAVAILABLE: Signing service is not configured; approval refused.");
    throw new ApiError(503, "SIGNING_UNAVAILABLE", "We couldn't complete this right now. Please try again shortly, or contact your administrator if it continues.");
  }
  const entry = await db.query.logEntries.findFirst({ where: eq(logEntries.id, entryId) });
  if (!entry) throw new ApiError(404, "NOT_FOUND", "We couldn't find this entry. It may have been deleted.");
  if (entry.state !== "submitted") throw new ApiError(409, "NOT_SUBMITTED", "Only submitted entries can be approved.");

  const activeKey = await db.query.signingKeys.findFirst({ where: and(eq(signingKeys.kid, env.ED25519_KID), eq(signingKeys.status, "active")) });
  if (!activeKey) {
    console.error(`KEY_NOT_PUBLISHED: Active signing key ${env.ED25519_KID} is not published in signing_keys.`);
    throw new ApiError(503, "KEY_NOT_PUBLISHED", "We couldn't complete this right now. Please try again shortly, or contact your administrator if it continues.");
  }

  const files = await db.query.attachments.findMany({ where: eq(attachments.entryId, entryId), columns: { id: true, sha256: true, filename: true } });
  const approvedAt = new Date();

  // FR-INT-01 — canonical payload
  const payload = {
    entryId: entry.id,
    version: entry.version,
    studentId: entry.studentId,
    approverId,
    approvedAt: approvedAt.toISOString(),
    workDate: entry.workDate,
    hours: String(entry.hours),
    activity: entry.activity,
    reflection: entry.reflection ?? null,
    skills: entry.skills,
    attachments: files.map((f) => ({ id: f.id, sha256: f.sha256 })).sort((a, b) => a.id.localeCompare(b.id)),
  };
  const digest = sha256hex(canonicalStringify(payload));   // FR-INT-02
  const signature = signDigest(digest);
  const token = ulid();                                     // FR-QR-01

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx.update(logEntries)
      .set({ state: "approved", decidedAt: approvedAt, decidedBy: approverId, updatedAt: approvedAt })
      .where(and(eq(logEntries.id, entryId), eq(logEntries.state, "submitted"))).returning();
    if (!updated) throw new ApiError(409, "RACE", "This entry was already reviewed by another supervisor.");
    const [seal] = await tx.insert(seals).values({
      entryId, canonicalPayload: payload, digestSha256: digest, signatureEd25519: signature,
      kid: env.ED25519_KID, sealedAt: approvedAt, sealedBy: approverId,
    }).returning();
    const [vt] = await tx.insert(verificationTokens).values({ tokenUlid: token, scope: "entry", entryId }).returning();
    // supersede the prior version on correction approval (FR-LOG-13 / UC-06)
    if (updated.supersedesId) {
      await tx.update(logEntries).set({ state: "superseded", updatedAt: approvedAt })
        .where(eq(logEntries.id, updated.supersedesId));
    }
    await tx.insert(notifications).values({
      recipientId: entry.studentId, type: "entry.approved",
      payload: { entryId, workDate: entry.workDate, token },
    });
    return { entry: updated, seal, token: vt.tokenUlid };
  });

  await appendAudit({
    actorId: approverId, action: "entry.approve", targetType: "log_entry", targetId: entryId,
    metadata: { digest, kid: env.ED25519_KID, token, version: entry.version },
  });
  return result;
}

export async function rejectEntry(entryId: string, approverId: string, reason: string) {
  const entry = await db.query.logEntries.findFirst({ where: eq(logEntries.id, entryId) });
  if (!entry) throw new ApiError(404, "NOT_FOUND", "We couldn't find this entry. It may have been deleted.");
  if (entry.state !== "submitted") throw new ApiError(409, "NOT_SUBMITTED", "Only submitted entries can be rejected.");
  const now = new Date();
  const [updated] = await db.update(logEntries)
    .set({ state: "rejected", decidedAt: now, decidedBy: approverId, rejectReason: reason, updatedAt: now })
    .where(and(eq(logEntries.id, entryId), eq(logEntries.state, "submitted"))).returning();
  if (!updated) throw new ApiError(409, "RACE", "This entry was already reviewed by another supervisor.");
  await db.insert(notifications).values({
    recipientId: entry.studentId, type: "entry.rejected", payload: { entryId, workDate: entry.workDate, reason },
  });
  await appendAudit({ actorId: approverId, action: "entry.reject", targetType: "log_entry", targetId: entryId, metadata: { reason } });
  return updated;
}
