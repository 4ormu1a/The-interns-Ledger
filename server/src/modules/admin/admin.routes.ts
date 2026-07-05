/** Sprint 6 — Admin portal API
 *  I1-I3 user/assignment mgmt, K1b audit trail, L1 key lifecycle,
 *  M1 erasure/export, FR-ADM-01..07, AC-09/10/11 */
import { Router } from "express";
import { z } from "zod";
import { and, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  users, internships, assignments, logEntries,
  signingKeys, verificationTokens, auditLog,
  assessments, seals, notifications, attachments,
} from "../../db/schema/index.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { ApiError } from "../../middleware/error.js";
import { appendAudit, verifyChain } from "../audit/audit.service.js";
import { hash } from "@node-rs/argon2";
import { sendProvisionEmail } from "../../lib/email.js";
import { newOpaqueToken, sha256hex } from "../../lib/tokens.js";
import { emailTokens, refreshTokens } from "../../db/schema/users.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));

/* ─────────────────────────────────────────────────────────────
   OVERVIEW  (FR-ADM-05)
──────────────────────────────────────────────────────────────── */
adminRouter.get("/overview", async (_req, res, next) => {
  try {
    const [userCount, internshipCount, entryCount, pendingCount, auditCount] = await Promise.all([
      db.execute(sql`SELECT count(*)::int AS n FROM users WHERE erased_at IS NULL`),
      db.execute(sql`SELECT count(*)::int AS n FROM internships`),
      db.execute(sql`SELECT count(*)::int AS n FROM log_entries`),
      db.execute(sql`SELECT count(*)::int AS n FROM log_entries WHERE state = 'submitted'`),
      db.execute(sql`SELECT count(*)::int AS n FROM audit_log`),
    ]);
    const byRole = await db.execute(sql`
      SELECT role, count(*)::int AS n FROM users WHERE erased_at IS NULL GROUP BY role`);
    res.json({ data: {
      users: (userCount.rows[0] as { n: number }).n,
      internships: (internshipCount.rows[0] as { n: number }).n,
      entries: (entryCount.rows[0] as { n: number }).n,
      pendingReview: (pendingCount.rows[0] as { n: number }).n,
      auditRows: (auditCount.rows[0] as { n: number }).n,
      byRole: Object.fromEntries((byRole.rows as { role: string; n: number }[]).map(r => [r.role, r.n])),
    } });
  } catch (e) { next(e); }
});

/* ─────────────────────────────────────────────────────────────
   USER MANAGEMENT  (FR-ADM-01)
──────────────────────────────────────────────────────────────── */

// List users
adminRouter.get("/users", async (req, res, next) => {
  try {
    const { role, status, q, limit = "50", offset = "0" } = req.query as Record<string, string>;
    const conditions = [];
    if (role) conditions.push(eq(users.role, role as typeof users.role._.data));
    if (status) conditions.push(eq(users.status, status as typeof users.status._.data));
    if (q) conditions.push(or(ilike(users.fullName, `%${q}%`), ilike(users.email, `%${q}%`))!);

    const rows = await db.query.users.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: (u, { desc }) => [desc(u.createdAt)],
      limit: Math.min(Number(limit), 200),
      offset: Number(offset),
      columns: { passwordHash: false },
    });
    res.json({ data: rows });
  } catch (e) { next(e); }
});

// Provision non-student user (industry_supervisor | faculty_supervisor | admin)
const provisionSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["industry_supervisor", "faculty_supervisor", "admin"]),
});

adminRouter.post("/users", async (req, res, next) => {
  try {
    const body = provisionSchema.parse(req.body);
    const existing = await db.query.users.findFirst({ where: eq(users.email, body.email) });
    if (existing) throw new ApiError(409, "EMAIL_TAKEN", "An account with this email already exists.");

    // Generate temporary password; user must reset via forgot-password
    const tempPw = newOpaqueToken().slice(0, 20);
    const passwordHash = await hash(tempPw, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
    const [user] = await db.insert(users).values({
      role: body.role,
      email: body.email,
      passwordHash,
      fullName: body.fullName,
      status: "active", // admin-provisioned users skip email-verify
      emailVerifiedAt: new Date(),
    }).returning({ id: users.id, email: users.email, role: users.role, fullName: users.fullName, status: users.status, createdAt: users.createdAt });

    // Issue a password-reset token so they can set their own password
    const resetToken = newOpaqueToken();
    await db.insert(emailTokens).values({
      userId: user.id, purpose: "reset", tokenHash: sha256hex(resetToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000), // 7 days
    });
    await sendProvisionEmail(user.email, user.fullName, resetToken);

    await appendAudit({ actorId: req.user!.sub, action: "user.provision", targetType: "user",
      targetId: user.id, metadata: { role: body.role, email: body.email } });
    res.status(201).json({ data: user });
  } catch (e) { next(e); }
});

// Update user (deactivate / reactivate / role change)
const patchUserSchema = z.object({
  status: z.enum(["active", "deactivated"]).optional(),
  role: z.enum(["industry_supervisor", "faculty_supervisor", "admin"]).optional(),
}).refine(d => d.status !== undefined || d.role !== undefined, { message: "Nothing to update" });

adminRouter.patch("/users/:id", async (req, res, next) => {
  try {
    const body = patchUserSchema.parse(req.body);
    const target = await db.query.users.findFirst({ where: eq(users.id, req.params.id) });
    if (!target) throw new ApiError(404, "NOT_FOUND", "User not found");
    if (target.role === "student" && body.role) throw new ApiError(400, "INVALID", "Cannot change a student's role");

    const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (body.status) updates.status = body.status;
    if (body.role) updates.role = body.role;

    const [updated] = await db.update(users).set(updates).where(eq(users.id, req.params.id))
      .returning({ id: users.id, role: users.role, status: users.status, updatedAt: users.updatedAt });

    // If deactivated, revoke all their sessions
    if (body.status === "deactivated") {
      await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.userId, req.params.id));
    }
    await appendAudit({ actorId: req.user!.sub, action: "user.update", targetType: "user",
      targetId: req.params.id, metadata: body });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

/* ─────────────────────────────────────────────────────────────
   ASSIGNMENT MANAGEMENT  (FR-ADM-02/03/04)
──────────────────────────────────────────────────────────────── */

// List lightweight internships for assignment dropdowns
adminRouter.get("/internships", async (_req, res, next) => {
  try {
    const rows = await db.execute(sql`
      SELECT i.id, i.company, i.role_title, u.full_name AS student_name
      FROM internships i
      JOIN users u ON u.id = i.student_id
      ORDER BY i.created_at DESC
    `);
    res.json({ data: rows.rows });
  } catch (e) { next(e); }
});

// List all assignments (join internship + supervisor info)
adminRouter.get("/assignments", async (req, res, next) => {
  try {
    const { internshipId, supervisorId } = req.query as Record<string, string>;
    const rows = await db.execute(sql`
      SELECT a.id, a.internship_id, a.supervisor_id, a.kind, a.is_primary_approver, a.created_at,
             i.company, i.role_title,
             s.full_name AS supervisor_name, s.email AS supervisor_email, s.role AS supervisor_role,
             u.full_name AS student_name
      FROM assignments a
      JOIN internships i ON i.id = a.internship_id
      JOIN users s ON s.id = a.supervisor_id
      JOIN users u ON u.id = i.student_id
      WHERE (${internshipId ?? null}::uuid IS NULL OR a.internship_id = ${internshipId ?? null}::uuid)
        AND (${supervisorId ?? null}::uuid IS NULL OR a.supervisor_id = ${supervisorId ?? null}::uuid)
      ORDER BY a.created_at DESC`);
    res.json({ data: rows.rows });
  } catch (e) { next(e); }
});

const assignSchema = z.object({
  internshipId: z.string().uuid(),
  supervisorId: z.string().uuid(),
  kind: z.enum(["industry", "faculty"]),
  isPrimaryApprover: z.boolean().default(false),
});

// Create assignment
adminRouter.post("/assignments", async (req, res, next) => {
  try {
    const body = assignSchema.parse(req.body);
    const intern = await db.query.internships.findFirst({ where: eq(internships.id, body.internshipId) });
    if (!intern) throw new ApiError(404, "NOT_FOUND", "Internship not found");
    const supervisor = await db.query.users.findFirst({ where: eq(users.id, body.supervisorId) });
    if (!supervisor) throw new ApiError(404, "NOT_FOUND", "Supervisor not found");
    if (supervisor.role === "student") throw new ApiError(400, "INVALID", "Students cannot be assigned as supervisors");

    const [row] = await db.insert(assignments).values(body).returning();
    await appendAudit({ actorId: req.user!.sub, action: "assignment.create", targetType: "assignment",
      targetId: row.id, metadata: { internshipId: body.internshipId, supervisorId: body.supervisorId, kind: body.kind } });
    res.status(201).json({ data: row });
  } catch (e) { next(e); }
});

// Delete assignment
adminRouter.delete("/assignments/:id", async (req, res, next) => {
  try {
    const row = await db.query.assignments.findFirst({ where: eq(assignments.id, req.params.id) });
    if (!row) throw new ApiError(404, "NOT_FOUND", "Assignment not found");
    await db.delete(assignments).where(eq(assignments.id, req.params.id));
    await appendAudit({ actorId: req.user!.sub, action: "assignment.delete", targetType: "assignment",
      targetId: req.params.id, metadata: { internshipId: row.internshipId, supervisorId: row.supervisorId } });
    res.json({ data: { deleted: true } });
  } catch (e) { next(e); }
});

// Reassign submitted entries from one supervisor to another (FR-ADM-04)
const reassignSchema = z.object({
  internshipId: z.string().uuid(),
  fromSupervisorId: z.string().uuid(),
  toSupervisorId: z.string().uuid(),
});

adminRouter.post("/assignments/reassign", async (req, res, next) => {
  try {
    const body = reassignSchema.parse(req.body);
    // Verify target supervisor exists and is assigned
    const toSup = await db.query.users.findFirst({ where: eq(users.id, body.toSupervisorId) });
    if (!toSup) throw new ApiError(404, "NOT_FOUND", "Target supervisor not found");
    const toAssignment = await db.query.assignments.findFirst({
      where: and(eq(assignments.internshipId, body.internshipId), eq(assignments.supervisorId, body.toSupervisorId)),
    });
    if (!toAssignment) throw new ApiError(400, "INVALID", "Target supervisor is not assigned to this internship");

    // Update the primary approver assignment from old to new (BR-05)
    const fromAssignment = await db.query.assignments.findFirst({
      where: and(eq(assignments.internshipId, body.internshipId), eq(assignments.supervisorId, body.fromSupervisorId),
        eq(assignments.isPrimaryApprover, true)),
    });
    let requeued = 0;
    if (fromAssignment) {
      await db.update(assignments).set({ supervisorId: body.toSupervisorId })
        .where(eq(assignments.id, fromAssignment.id));
      // Count submitted entries that are now re-queued under new supervisor
      const result = await db.execute(sql`
        SELECT count(*)::int AS n FROM log_entries
        WHERE internship_id = ${body.internshipId} AND state = 'submitted'`);
      requeued = (result.rows[0] as { n: number }).n;
    }

    await appendAudit({ actorId: req.user!.sub, action: "assignment.reassign", targetType: "assignment",
      targetId: fromAssignment?.id ?? body.internshipId,
      metadata: { from: body.fromSupervisorId, to: body.toSupervisorId, internshipId: body.internshipId, requeued } });
    res.json({ data: { reassigned: true, requeued } });
  } catch (e) { next(e); }
});

/* ─────────────────────────────────────────────────────────────
   AUDIT TRAIL  (FR-AUD-03, AC-11)
──────────────────────────────────────────────────────────────── */
adminRouter.get("/audit", async (req, res, next) => {
  try {
    const { actor, action, from, to, limit = "100", offset = "0" } = req.query as Record<string, string>;
    const conditions = [];
    if (actor) conditions.push(eq(auditLog.actorId, actor));
    if (action) conditions.push(ilike(auditLog.action, `%${action}%`));
    if (from) conditions.push(gte(auditLog.createdAt, new Date(from)));
    if (to) conditions.push(lte(auditLog.createdAt, new Date(to)));

    const rows = await db.select().from(auditLog)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditLog.seq))
      .limit(Math.min(Number(limit), 500))
      .offset(Number(offset));
    // Also join actor names for display
    const actorIds = [...new Set(rows.filter(r => r.actorId).map(r => r.actorId!))];
    const actorNames: Record<string, string> = {};
    if (actorIds.length) {
      const actorRows = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, actorIds));
      for (const r of actorRows) actorNames[r.id] = r.fullName ?? '';
    }
    const enriched = rows.map(r => ({ ...r, actorName: r.actorId ? (actorNames[r.actorId] ?? r.actorId) : null }));
    res.json({ data: enriched });
  } catch (e) { next(e); }
});

// AC-11 — verify the entire audit hash chain
adminRouter.post("/audit/verify-chain", async (req, res, next) => {
  try {
    const result = await verifyChain();
    await appendAudit({ actorId: req.user!.sub, action: "audit.verify_chain", targetType: "audit_log",
      metadata: { valid: result.valid, checked: result.checked } });
    res.json({ data: result });
  } catch (e) { next(e); }
});

/* ─────────────────────────────────────────────────────────────
   SIGNING KEY LIFECYCLE  (FR-ADM-06, AC-09)
──────────────────────────────────────────────────────────────── */
adminRouter.get("/keys", async (_req, res, next) => {
  try {
    const rows = await db.query.signingKeys.findMany({ orderBy: (k, { desc }) => [desc(k.createdAt)] });
    res.json({ data: rows });
  } catch (e) { next(e); }
});

const registerKeySchema = z.object({
  kid: z.string().min(3).regex(/^[A-Z0-9_-]+$/, "kid must be uppercase alphanumeric/dash/underscore"),
  publicKey: z.string().min(50), // PEM public key only — private never enters system
});

adminRouter.post("/keys", async (req, res, next) => {
  try {
    const body = registerKeySchema.parse(req.body);
    const existing = await db.query.signingKeys.findFirst({ where: eq(signingKeys.kid, body.kid) });
    if (existing) throw new ApiError(409, "KID_TAKEN", "A key with this kid already exists.");
    const [row] = await db.insert(signingKeys).values({ kid: body.kid, publicKey: body.publicKey, status: "active" }).returning();
    await appendAudit({ actorId: req.user!.sub, action: "key.register", targetType: "signing_key",
      targetId: body.kid, metadata: { kid: body.kid } });
    res.status(201).json({ data: row });
  } catch (e) { next(e); }
});

adminRouter.post("/keys/:kid/retire", async (req, res, next) => {
  try {
    const row = await db.query.signingKeys.findFirst({ where: eq(signingKeys.kid, req.params.kid) });
    if (!row) throw new ApiError(404, "NOT_FOUND", "Key not found");
    if (row.status !== "active") throw new ApiError(400, "INVALID", `Key is already ${row.status}`);
    await db.update(signingKeys).set({ status: "retired", retiredAt: new Date() }).where(eq(signingKeys.kid, req.params.kid));
    await appendAudit({ actorId: req.user!.sub, action: "key.retire", targetType: "signing_key",
      targetId: req.params.kid });
    res.json({ data: { kid: req.params.kid, status: "retired" } });
  } catch (e) { next(e); }
});

adminRouter.post("/keys/:kid/revoke", async (req, res, next) => {
  try {
    const row = await db.query.signingKeys.findFirst({ where: eq(signingKeys.kid, req.params.kid) });
    if (!row) throw new ApiError(404, "NOT_FOUND", "Key not found");
    if (row.status === "revoked") throw new ApiError(400, "INVALID", "Key is already revoked");
    await db.update(signingKeys).set({ status: "revoked", retiredAt: new Date() }).where(eq(signingKeys.kid, req.params.kid));
    await appendAudit({ actorId: req.user!.sub, action: "key.revoke", targetType: "signing_key",
      targetId: req.params.kid });
    res.json({ data: { kid: req.params.kid, status: "revoked" } });
  } catch (e) { next(e); }
});

/* ─────────────────────────────────────────────────────────────
   VERIFICATION TOKEN MANAGEMENT  (FR-QR-06)
──────────────────────────────────────────────────────────────── */
adminRouter.get("/tokens", async (req, res, next) => {
  try {
    const { scope, revoked, limit = "50", offset = "0" } = req.query as Record<string, string>;
    const conditions = [];
    if (scope) conditions.push(eq(verificationTokens.scope, scope as "entry" | "report"));
    if (revoked === "true") conditions.push(sql`${verificationTokens.revokedAt} IS NOT NULL`);
    if (revoked === "false") conditions.push(isNull(verificationTokens.revokedAt));

    const rows = await db.query.verificationTokens.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: Math.min(Number(limit), 200),
      offset: Number(offset),
    });
    res.json({ data: rows });
  } catch (e) { next(e); }
});

const revokeTokenSchema = z.object({ reason: z.string().min(5) });

adminRouter.post("/tokens/:id/revoke", async (req, res, next) => {
  try {
    const body = revokeTokenSchema.parse(req.body);
    const token = await db.query.verificationTokens.findFirst({ where: eq(verificationTokens.id, req.params.id) });
    if (!token) throw new ApiError(404, "NOT_FOUND", "Token not found");
    if (token.revokedAt) throw new ApiError(400, "ALREADY_REVOKED", "Token is already revoked");
    await db.update(verificationTokens).set({ revokedAt: new Date(), revokeReason: body.reason })
      .where(eq(verificationTokens.id, req.params.id));
    await appendAudit({ actorId: req.user!.sub, action: "token.revoke", targetType: "verification_token",
      targetId: token.tokenUlid, metadata: { reason: body.reason } });
    res.json({ data: { revoked: true, tokenUlid: token.tokenUlid } });
  } catch (e) { next(e); }
});

/* ─────────────────────────────────────────────────────────────
   CRYPTO-SHREDDING ERASURE  (FR-ADM-07, AC-10)
──────────────────────────────────────────────────────────────── */
const erasureSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(5), // data-protection ground: Ghana DPA 2012
});

adminRouter.post("/erasure", async (req, res, next) => {
  try {
    const body = erasureSchema.parse(req.body);
    const user = await db.query.users.findFirst({ where: eq(users.id, body.userId) });
    if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");
    if (user.erasedAt) throw new ApiError(400, "ALREADY_ERASED", "User data already erased");

    // Tombstone PII — preserve UUID and role for audit FK integrity
    const tombstoneEmail = `erased-${body.userId}@erased.invalid`;
    const unusableHash = await hash(newOpaqueToken(), { memoryCost: 1024, timeCost: 1, parallelism: 1 });
    await db.update(users).set({
      fullName: "[Redacted]",
      email: tombstoneEmail,
      passwordHash: unusableHash,
      erasedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(users.id, body.userId));

    // Revoke all sessions
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.userId, body.userId));

    // Soft-delete attachment metadata (blob URLs already point to nothing useful; actual blob deletion
    // is out-of-band — Blob SDK has no list/delete-by-prefix in free tier; URLs become dead links)
    await db.execute(sql`UPDATE attachments SET deleted_at = NOW()
      WHERE entry_id IN (SELECT id FROM log_entries WHERE student_id = ${body.userId}) AND deleted_at IS NULL`);

    // Notification PII cleanup
    await db.execute(sql`DELETE FROM notifications WHERE recipient_id = ${body.userId}`);

    await appendAudit({ actorId: req.user!.sub, action: "user.erase", targetType: "user",
      targetId: body.userId, metadata: { reason: body.reason } });
    res.json({ data: { erased: true, userId: body.userId } });
  } catch (e) { next(e); }
});

/* ─────────────────────────────────────────────────────────────
   DATA EXPORT  (FR-ADM-07 / §13.5)
──────────────────────────────────────────────────────────────── */
adminRouter.post("/export", async (req, res, next) => {
  try {
    const { userId } = z.object({ userId: z.string().uuid() }).parse(req.body);
    const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { passwordHash: false } });
    if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");

    const userInternships = await db.query.internships.findMany({ where: eq(internships.studentId, userId) });
    const internshipIds = userInternships.map(i => i.id);

    const [entries, userAssessments, userNotifications] = await Promise.all([
      internshipIds.length
        ? db.query.logEntries.findMany({ where: (le, { inArray }) => inArray(le.internshipId, internshipIds) })
        : [],
      internshipIds.length
        ? db.query.assessments.findMany({ where: (a, { inArray }) => inArray(a.internshipId, internshipIds) })
        : [],
      db.query.notifications.findMany({ where: eq(notifications.recipientId, userId) }),
    ]);

    const entryIds = entries.map(e => e.id);
    const [entrySeals, entryAttachments] = await Promise.all([
      entryIds.length ? db.query.seals.findMany({ where: (s, { inArray }) => inArray(s.entryId, entryIds) }) : [],
      entryIds.length ? db.query.attachments.findMany({ where: (a, { inArray }) => inArray(a.entryId, entryIds) }) : [],
    ]);

    await appendAudit({ actorId: req.user!.sub, action: "user.export", targetType: "user",
      targetId: userId });

    res.json({ data: {
      exportedAt: new Date().toISOString(),
      subject: user,
      internships: userInternships,
      entries,
      seals: entrySeals,
      attachments: entryAttachments,
      assessments: userAssessments,
      notifications: userNotifications,
    } });
  } catch (e) { next(e); }
});
