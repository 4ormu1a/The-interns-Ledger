import { Router } from "express";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/client.js";
import { internships, logEntries, users, assignments } from "../../db/schema/index.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { loadOwnedInternship } from "../../middleware/scope.js";
import { ApiError } from "../../middleware/error.js";

const createSchema = z.object({
  company: z.string().min(2).max(160),
  location: z.string().min(2).max(160),
  roleTitle: z.string().min(2).max(160),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requiredHours: z.number().int().min(1).max(5000),
  requiredWeeks: z.number().int().min(1).max(104),
}).refine((d) => d.endDate > d.startDate, { message: "Your end date needs to be after your start date." });

export const internshipsRouter = Router();
internshipsRouter.use(requireAuth);

// FR-LOG-01 — student creates internship metadata
internshipsRouter.post("/", requireRole("student"), validate(createSchema), async (req, res, next) => {
  try {
    const [row] = await db.insert(internships).values({ ...req.body, studentId: req.user!.sub }).returning();
    res.status(201).json({ data: row });
  } catch (e) { next(e); }
});

internshipsRouter.get("/", async (req, res, next) => {
  try {
    const u = req.user!;
    const rows = u.role === "admin"
      ? await db.query.internships.findMany({ orderBy: [desc(internships.createdAt)] })
      : await db.query.internships.findMany({ where: eq(internships.studentId, u.sub), orderBy: [desc(internships.createdAt)] });
    res.json({ data: rows });
  } catch (e) { next(e); }
});

internshipsRouter.get("/:id", loadOwnedInternship, async (req, res) => {
  res.json({ data: (req as never as { internship: unknown }).internship });
});

// FR-LOG-12 / BR-09 — progress from approved entries only
internshipsRouter.get("/:id/progress", loadOwnedInternship, async (req, res, next) => {
  try {
    const internship = (req as never as { internship: { id: string; requiredHours: number; requiredWeeks: number; startDate: string; endDate: string } }).internship;
    const approved = await db.query.logEntries.findMany({
      where: and(eq(logEntries.internshipId, internship.id), eq(logEntries.state, "approved")),
      columns: { hours: true, workDate: true },
    });
    const totalHours = approved.reduce((s, e) => s + Number(e.hours), 0);
    const weeks = new Set(approved.map((e) => { // ISO week buckets
      const d = new Date(e.workDate); const t = new Date(d); t.setDate(d.getDate() + 4 - (d.getDay() || 7));
      return `${t.getFullYear()}-${Math.ceil((((t.getTime() - new Date(t.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7)}`;
    })).size;
    res.json({ data: {
      approvedHours: totalHours, approvedEntries: approved.length, weeksWithApprovedWork: weeks,
      requiredHours: internship.requiredHours, requiredWeeks: internship.requiredWeeks,
      percentComplete: Math.min(100, Math.round((totalHours / internship.requiredHours) * 100)),
    } });
  } catch (e) { next(e); }
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["industry_supervisor", "department_supervisor"]).default("industry_supervisor")
});

internshipsRouter.post("/:id/invite-supervisor", loadOwnedInternship, validate(inviteSchema), async (req, res, next) => {
  try {
    const internship = (req as never as { internship: { id: string; company: string } }).internship;
    const { email } = req.body;
    const role = "industry_supervisor"; // Force students to only invite industry supervisors
    
    // Check if the user is already assigned
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (user) {
      const existingAssignment = await db.query.assignments.findFirst({
        where: and(
          eq(assignments.internshipId, internship.id),
          eq(assignments.supervisorId, user.id)
        )
      });
      // In a real app we might auto-assign them here if they have an account,
      // but for now we'll just let the invite flow handle it or return an error.
    }

    const { newOpaqueToken, sha256hex } = await import("../../lib/tokens.js");
    const { sendSupervisorInviteEmail } = await import("../../lib/email.js");
    const { invitations } = await import("../../db/schema/index.js");

    const token = newOpaqueToken();
    const tokenHash = sha256hex(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(invitations).values({
      internshipId: internship.id,
      inviterId: req.user!.sub,
      email,
      role: role as "industry_supervisor" | "department_supervisor",
      tokenHash,
      expiresAt
    });

    await sendSupervisorInviteEmail(email, req.user!.name, internship.company, role, token);

    res.status(200).json({ message: "Invitation sent successfully" });
  } catch (e) { next(e); }
});

// Submit for department review
internshipsRouter.post("/:id/submit-for-review", loadOwnedInternship, async (req, res, next) => {
  try {
    const internship = (req as never as { internship: { id: string; requiredHours: number } }).internship;
    
    // Validate 100% of required hours are logged and approved
    const approved = await db.query.logEntries.findMany({
      where: and(eq(logEntries.internshipId, internship.id), eq(logEntries.state, "approved")),
      columns: { hours: true },
    });
    
    const totalHours = approved.reduce((s, e) => s + Number(e.hours), 0);
    if (totalHours < internship.requiredHours) {
      throw new ApiError(400, "VALIDATION_FAILED", "You still need to log more hours before you can submit your final report. Keep logging — you're almost there.");
    }
    
    // Check if there are any pending/draft entries left? We could enforce this.
    // For now, we trust the approved hours >= required hours.

    // Check if already submitted
    const { internshipSubmissions } = await import("../../db/schema/departments.js");
    const existing = await db.query.internshipSubmissions.findFirst({
      where: eq(internshipSubmissions.internshipId, internship.id)
    });

    if (existing && existing.status !== "changes_requested") {
      throw new ApiError(400, "ALREADY_EXISTS", "You've already submitted this internship for review.");
    }

    if (existing && existing.status === "changes_requested") {
      await db.update(internshipSubmissions)
        .set({ status: "submitted_to_department", submittedAt: new Date(), comment: null })
        .where(eq(internshipSubmissions.id, existing.id));
    } else {
      await db.insert(internshipSubmissions).values({
        studentId: req.user!.sub,
        internshipId: internship.id,
      });
    }

    res.json({ message: "Submitted successfully" });
  } catch (e) { next(e); }
});
