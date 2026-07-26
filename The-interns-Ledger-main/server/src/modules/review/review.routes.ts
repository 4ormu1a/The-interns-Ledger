/** D1-D2 — supervisor review surface. Scope: assigned students only (FR-SUP-01, BR-12). */
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client.js";
import { assignments, internships, logEntries, users, entryComments, attachments, seals } from "../../db/schema/index.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { ApiError } from "../../middleware/error.js";
import { approveAndSeal, rejectEntry } from "./seal.service.js";

export const reviewRouter = Router();
reviewRouter.use(requireAuth, requireRole("industry_supervisor", "admin"));

const reviewLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 500, standardHeaders: true, legacyHeaders: false });

/** internship ids where caller is the (industry) supervisor — admins only count when explicitly assigned (BR-12) */
async function assignedInternshipIds(supervisorId: string) {
  const rows = await db.query.assignments.findMany({
    where: and(eq(assignments.supervisorId, supervisorId), eq(assignments.kind, "industry")),
    columns: { internshipId: true },
  });
  return rows.map((r) => r.internshipId);
}

async function assertEntryInScope(entryId: string, supervisorId: string) {
  const entry = await db.query.logEntries.findFirst({ where: eq(logEntries.id, entryId) });
  if (!entry) throw new ApiError(404, "NOT_FOUND", "We couldn't find this entry. It may have been deleted.");
  const ids = await assignedInternshipIds(supervisorId);
  if (!ids.includes(entry.internshipId)) throw new ApiError(403, "FORBIDDEN", "This entry belongs to a student outside of your assigned group.");
  return entry;
}

reviewRouter.get("/queue", async (req, res, next) => {
  try {
    const ids = await assignedInternshipIds(req.user!.sub);
    if (ids.length === 0) return res.json({ data: [] });
    const rows = await db.select({
      id: logEntries.id, workDate: logEntries.workDate, hours: logEntries.hours,
      activity: logEntries.activity, version: logEntries.version, submittedAt: logEntries.submittedAt,
      studentName: users.fullName, internshipId: logEntries.internshipId,
    }).from(logEntries)
      .innerJoin(users, eq(users.id, logEntries.studentId))
      .where(and(inArray(logEntries.internshipId, ids), eq(logEntries.state, "submitted")))
      .orderBy(logEntries.submittedAt);
    res.json({ data: rows });
  } catch (e) { next(e); }
});

reviewRouter.get("/entries/:id", async (req, res, next) => {
  try {
    const entry = await assertEntryInScope(req.params.id, req.user!.sub);
    let previousEntry = null;
    if (entry.supersedesId) {
      const prev = await db.query.logEntries.findFirst({ where: eq(logEntries.id, entry.supersedesId), columns: { activity: true, reflection: true } });
      if (prev) previousEntry = prev;
    }
    const [student, files, comments] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, entry.studentId), columns: { fullName: true, email: true } }),
      db.query.attachments.findMany({ where: eq(attachments.entryId, entry.id) }),
      db.query.entryComments.findMany({ where: eq(entryComments.entryId, entry.id) }),
    ]);
    res.json({ data: { ...entry, student, attachments: files, comments, previousEntry } });
  } catch (e) { next(e); }
});

reviewRouter.post("/entries/:id/approve", reviewLimiter, async (req, res, next) => {
  try {
    await assertEntryInScope(req.params.id, req.user!.sub);
    const result = await approveAndSeal(req.params.id, req.user!.sub);
    res.json({ data: { state: "approved", digest: result.seal.digestSha256, kid: result.seal.kid, token: result.token } });
  } catch (e) { next(e); }
});

reviewRouter.post("/entries/:id/reject", reviewLimiter, validate(z.object({ reason: z.string().min(5).max(1000) })), async (req, res, next) => {
  try {
    await assertEntryInScope(req.params.id, req.user!.sub);
    res.json({ data: await rejectEntry(req.params.id, req.user!.sub, req.body.reason) }); // BR-06
  } catch (e) { next(e); }
});

reviewRouter.post("/entries/:id/comments", validate(z.object({ body: z.string().min(1).max(2000) })), async (req, res, next) => {
  try {
    const entry = await assertEntryInScope(req.params.id, req.user!.sub);
    const [row] = await db.insert(entryComments).values({ entryId: entry.id, authorId: req.user!.sub, body: req.body.body }).returning();
    res.status(201).json({ data: row });
  } catch (e) { next(e); }
});

reviewRouter.get("/students", async (req, res, next) => {
  try {
    const ids = await assignedInternshipIds(req.user!.sub);
    if (ids.length === 0) return res.json({ data: [] });
    const rows = await db.select({
      internshipId: internships.id, company: internships.company, roleTitle: internships.roleTitle,
      requiredHours: internships.requiredHours, studentId: users.id, studentName: users.fullName,
    }).from(internships).innerJoin(users, eq(users.id, internships.studentId))
      .where(inArray(internships.id, ids));

    const entries = await db.query.logEntries.findMany({
      where: inArray(logEntries.internshipId, ids),
      columns: { internshipId: true, state: true, hours: true, submittedAt: true }
    });

    const enriched = rows.map(r => {
      const studentEntries = entries.filter(e => e.internshipId === r.internshipId);
      const approvedHours = studentEntries.filter(e => e.state === 'approved').reduce((acc, e) => acc + Number(e.hours), 0);
      const pendingHours = studentEntries.filter(e => e.state === 'submitted').reduce((acc, e) => acc + Number(e.hours), 0);
      const lastActive = studentEntries.reduce((latest, e) => {
        if (!e.submittedAt) return latest;
        return latest && new Date(latest) > new Date(e.submittedAt) ? latest : e.submittedAt;
      }, null as Date | null);
      return { ...r, approvedHours, pendingHours, lastActive };
    });
    
    res.json({ data: enriched });
  } catch (e) { next(e); }
});

reviewRouter.get("/history", async (req, res, next) => {
  try {
    const ids = await assignedInternshipIds(req.user!.sub);
    if (ids.length === 0) return res.json({ data: [] });
    const rows = await db.select({
      id: logEntries.id, workDate: logEntries.workDate, state: logEntries.state,
      decidedAt: logEntries.decidedAt, rejectReason: logEntries.rejectReason,
      studentName: users.fullName, version: logEntries.version,
      digestSha256: seals.digestSha256, kid: seals.kid,
    }).from(logEntries).innerJoin(users, eq(users.id, logEntries.studentId))
      .leftJoin(seals, eq(seals.entryId, logEntries.id))
      .where(and(inArray(logEntries.internshipId, ids), eq(logEntries.decidedBy, req.user!.sub)))
      .orderBy(desc(logEntries.decidedAt)).limit(100);

    if (rows.length === 0) return res.json({ data: [] });

    const rowIds = rows.map(r => r.id);
    const superseding = await db.select({ supersedesId: logEntries.supersedesId })
      .from(logEntries)
      .where(inArray(logEntries.supersedesId, rowIds));
    const supersededSet = new Set(superseding.map(s => s.supersedesId));

    const enriched = rows.map(r => ({ ...r, isSuperseded: supersededSet.has(r.id) }));
    res.json({ data: enriched });
  } catch (e) { next(e); }
});
