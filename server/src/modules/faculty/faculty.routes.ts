/** J1-J2 — faculty: read-only verified progress + assessments (FR-FAC-01/02/03, BR-11). */
import { Router } from "express";
import { z } from "zod";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client.js";
import { assignments, internships, logEntries, users, assessments, seals } from "../../db/schema/index.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { ApiError } from "../../middleware/error.js";
import { appendAudit } from "../audit/audit.service.js";

export const facultyRouter = Router();
facultyRouter.use(requireAuth, requireRole("faculty_supervisor"));

async function assignedIds(facultyId: string) {
  const rows = await db.query.assignments.findMany({
    where: and(eq(assignments.supervisorId, facultyId), eq(assignments.kind, "faculty")),
    columns: { internshipId: true },
  });
  return rows.map((r) => r.internshipId);
}

facultyRouter.get("/students", async (req, res, next) => {
  try {
    const ids = await assignedIds(req.user!.sub);
    if (!ids.length) return res.json({ data: [] });
    const rows = await db.select({
      internshipId: internships.id, company: internships.company, roleTitle: internships.roleTitle,
      requiredHours: internships.requiredHours, studentName: users.fullName,
    }).from(internships).innerJoin(users, eq(users.id, internships.studentId)).where(inArray(internships.id, ids));
    const approved = await db.query.logEntries.findMany({
      where: and(inArray(logEntries.internshipId, ids), eq(logEntries.state, "approved")),
      columns: { internshipId: true, hours: true },
    });
    const hoursBy = new Map<string, number>();
    for (const e of approved) hoursBy.set(e.internshipId, (hoursBy.get(e.internshipId) ?? 0) + Number(e.hours));
    res.json({ data: rows.map((r) => ({ ...r, approvedHours: hoursBy.get(r.internshipId) ?? 0 })) });
  } catch (e) { next(e); }
});

facultyRouter.get("/students/:internshipId/logbook", async (req, res, next) => {
  try {
    const ids = await assignedIds(req.user!.sub);
    if (!ids.includes(req.params.internshipId)) throw new ApiError(403, "FORBIDDEN", "Not your student.");
    const entries = await db.query.logEntries.findMany({
      where: and(eq(logEntries.internshipId, req.params.internshipId),
        inArray(logEntries.state, ["approved", "superseded"])), // read-only verified history
      orderBy: [asc(logEntries.workDate)],
    });
    const sealRows = entries.length ? await db.query.seals.findMany({ where: inArray(seals.entryId, entries.map((e) => e.id)) }) : [];
    const sealBy = new Map(sealRows.map((s) => [s.entryId, { digest: s.digestSha256, kid: s.kid, sealedAt: s.sealedAt }]));
    res.json({ data: entries.map((e) => ({ ...e, seal: sealBy.get(e.id) ?? null })) });
  } catch (e) { next(e); }
});

const assessmentSchema = z.object({
  internshipId: z.string().uuid(), type: z.enum(["midterm", "final"]),
  grade: z.string().min(1).max(8), comments: z.string().max(4000).optional(),
});

facultyRouter.post("/assessments", validate(assessmentSchema), async (req, res, next) => {
  try {
    const ids = await assignedIds(req.user!.sub);
    if (!ids.includes(req.body.internshipId)) throw new ApiError(403, "FORBIDDEN", "Not your student.");
    const existing = await db.query.assessments.findFirst({
      where: and(eq(assessments.internshipId, req.body.internshipId), eq(assessments.type, req.body.type)),
    });
    if (existing) throw new ApiError(409, "ALREADY_ASSESSED", `A ${req.body.type} assessment already exists for this internship.`);
    const [row] = await db.insert(assessments).values({ ...req.body, facultyId: req.user!.sub }).returning();
    await appendAudit({ actorId: req.user!.sub, action: "assessment.record", targetType: "assessment", targetId: row.id,
      metadata: { internshipId: req.body.internshipId, type: req.body.type, grade: req.body.grade } });
    res.status(201).json({ data: row });
  } catch (e) { next(e); }
});

facultyRouter.get("/assessments", async (req, res, next) => {
  try {
    const ids = await assignedIds(req.user!.sub);
    if (!ids.length) return res.json({ data: [] });
    res.json({ data: await db.query.assessments.findMany({ where: inArray(assessments.internshipId, ids) }) });
  } catch (e) { next(e); }
});
