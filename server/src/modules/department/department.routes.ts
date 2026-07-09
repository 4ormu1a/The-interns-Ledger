import { Router } from "express";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  departments,
  supervisorDepartments,
  internshipSubmissions,
  submissionFlags,
  attentionRules
} from "../../db/schema/departments.js";
import { users, internships, logEntries } from "../../db/schema/index.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { ApiError } from "../../middleware/error.js";

export const departmentRouter = Router();
departmentRouter.use(requireAuth, requireRole("department_supervisor"));

// 1. Final submissions inbox
departmentRouter.get("/submissions", async (req, res, next) => {
  try {
    const supervisorId = req.user!.sub;
    const result = await db.execute(sql`
      SELECT sub.*, 
             u.full_name as student_name, 
             i.company, 
             i.required_hours,
             (SELECT SUM(hours) FROM log_entries le WHERE le.internship_id = i.id AND le.state = 'approved') as completed_hours
      FROM internship_submissions sub
      JOIN users u ON u.id = sub.student_id
      JOIN internships i ON i.id = sub.internship_id
      JOIN supervisor_departments sd ON sd.department_id = u.department_id
      WHERE sd.supervisor_id = ${supervisorId}
        AND sub.status = 'submitted_to_department'
    `);
    res.json({ data: result.rows });
  } catch (e) { next(e); }
});

// 2. Submission detail
departmentRouter.get("/submissions/:id", async (req, res, next) => {
  try {
    const supervisorId = req.user!.sub;
    const submissionId = req.params.id;

    // Fetch submission with scope check
    const result = await db.execute(sql`
      SELECT sub.*, 
             u.full_name as student_name, 
             i.company, 
             i.required_hours
      FROM internship_submissions sub
      JOIN users u ON u.id = sub.student_id
      JOIN internships i ON i.id = sub.internship_id
      JOIN supervisor_departments sd ON sd.department_id = u.department_id
      WHERE sd.supervisor_id = ${supervisorId} AND sub.id = ${submissionId}
    `);
    const submission = result.rows[0];

    if (!submission) throw new ApiError(404, "NOT_FOUND", "Submission not found or unauthorized");

    // Fetch logs for the internship
    const logs = await db.query.logEntries.findMany({
      where: eq(logEntries.internshipId, submission.internship_id),
      orderBy: (logs, { desc }) => [desc(logs.workDate)],
    });

    res.json({ data: { submission, logs } });
  } catch (e) { next(e); }
});

// Accept submission
departmentRouter.post("/submissions/:id/accept", async (req, res, next) => {
  try {
    const supervisorId = req.user!.sub;
    const submissionId = req.params.id;

    const result = await db.execute(sql`
      SELECT sub.id FROM internship_submissions sub
      JOIN users u ON u.id = sub.student_id
      JOIN supervisor_departments sd ON sd.department_id = u.department_id
      WHERE sd.supervisor_id = ${supervisorId} AND sub.id = ${submissionId}
    `);
    const sub = result.rows[0];
    if (!sub) throw new ApiError(404, "NOT_FOUND", "Submission not found or unauthorized");

    await db.update(internshipSubmissions)
      .set({ 
        status: "department_approved", 
        departmentSupervisorId: supervisorId, 
        decidedAt: new Date() 
      })
      .where(eq(internshipSubmissions.id, submissionId));

    res.json({ message: "Submission accepted" });
  } catch (e) { next(e); }
});

// Request changes
const requestChangesSchema = z.object({
  comment: z.string().min(5),
  flaggedEntries: z.array(z.string().uuid()).optional(),
});

departmentRouter.post("/submissions/:id/request-changes", validate(requestChangesSchema), async (req, res, next) => {
  try {
    const supervisorId = req.user!.sub;
    const submissionId = req.params.id;
    const { comment, flaggedEntries } = req.body;

    const result = await db.execute(sql`
      SELECT sub.id FROM internship_submissions sub
      JOIN users u ON u.id = sub.student_id
      JOIN supervisor_departments sd ON sd.department_id = u.department_id
      WHERE sd.supervisor_id = ${supervisorId} AND sub.id = ${submissionId}
    `);
    const sub = result.rows[0];
    if (!sub) throw new ApiError(404, "NOT_FOUND", "Submission not found or unauthorized");

    await db.update(internshipSubmissions)
      .set({ 
        status: "changes_requested", 
        departmentSupervisorId: supervisorId, 
        decidedAt: new Date(),
        comment
      })
      .where(eq(internshipSubmissions.id, submissionId));

    if (flaggedEntries && flaggedEntries.length > 0) {
      await db.insert(submissionFlags).values(
        flaggedEntries.map((logEntryId: string) => ({
          submissionId,
          logEntryId,
          comment: "Flagged during review",
          createdBy: supervisorId
        }))
      );
    }

    res.json({ message: "Changes requested" });
  } catch (e) { next(e); }
});

departmentRouter.get("/stats", async (req, res, next) => {
  try {
    const supervisorId = req.user!.sub;
    
    // Inbox count
    const inboxResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM internship_submissions sub
      JOIN users u ON u.id = sub.student_id
      JOIN supervisor_departments sd ON sd.department_id = u.department_id
      WHERE sd.supervisor_id = ${supervisorId}
        AND sub.status = 'submitted_to_department'
    `);
    const inboxCount = Number((inboxResult.rows[0] as any)?.count || 0);

    // Attention count (using the < 50% logic for now)
    const result = await db.execute(sql`
      SELECT i.required_hours,
             COALESCE((SELECT SUM(hours) FROM log_entries le WHERE le.internship_id = i.id AND le.state = 'approved'), 0) as completed_hours
      FROM users u
      JOIN internships i ON i.student_id = u.id
      JOIN supervisor_departments sd ON sd.department_id = u.department_id
      WHERE sd.supervisor_id = ${supervisorId}
    `);
    
    const attentionCount = result.rows.filter((r: any) => 
      r.required_hours && (Number(r.completed_hours) / r.required_hours) < 0.5
    ).length;

    res.json({ data: { inbox: inboxCount, attention: attentionCount } });
  } catch (e) { next(e); }
});

// 4. My students
departmentRouter.get("/students", async (req, res, next) => {
  try {
    const supervisorId = req.user!.sub;
    const result = await db.execute(sql`
      SELECT u.id, u.full_name, u.email, d.name as department_name, i.company, i.required_hours,
             COALESCE((SELECT SUM(hours) FROM log_entries le WHERE le.internship_id = i.id AND le.state = 'approved'), 0) as completed_hours
      FROM users u
      JOIN departments d ON d.id = u.department_id
      JOIN supervisor_departments sd ON sd.department_id = u.department_id
      LEFT JOIN internships i ON i.student_id = u.id AND i.status = 'active'
      WHERE sd.supervisor_id = ${supervisorId}
        AND u.role = 'student'
    `);
    res.json({ data: result.rows });
  } catch (e) { next(e); }
});
