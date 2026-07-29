import { Router } from "express";
import { z } from "zod";
import { eq, sql, and } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  departments,
  supervisorDepartments,
  internshipSubmissions,
  submissionFlags,
} from "../../db/schema/departments.js";
import {
  users,
  internships,
  logEntries,
} from "../../db/schema/index.js";
import {
  reports,
  verificationTokens,
  assessments,
} from "../../db/schema/integrity.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { ApiError } from "../../middleware/error.js";

export const departmentRouter = Router();
departmentRouter.use(requireAuth, requireRole("department_supervisor"));

// ─── Helper: derive year group ───────────────────────────────────────────────
// Priority 1: use current_level directly if stored (100→1, 200→2, etc.)
// Priority 2: derive from UMaT index_number format: SRI.41.008.136.22
//   The 5th dot-segment (last 2 chars) is the 2-digit admission year.
//   Academic year = current calendar year - (2000 + admissionYear2d) + 1, clamped 1–4.
function deriveYearGroup(indexNumber: string | null, currentLevel?: number | null): number {
  // If we have the stored level, use it directly
  if (currentLevel && [100, 200, 300, 400].includes(currentLevel)) {
    return currentLevel / 100;
  }
  if (!indexNumber) return 1;
  // Split on dots: ["SRI", "41", "008", "136", "22"]
  const parts = indexNumber.trim().split(".");
  if (parts.length !== 5) return 1;
  const admissionYear2d = parseInt(parts[4], 10);
  if (isNaN(admissionYear2d)) return 1;
  const admissionYear = 2000 + admissionYear2d;
  const currentYear = new Date().getFullYear();
  return Math.max(1, Math.min(4, currentYear - admissionYear + 1));
}

// ─── 1. Dashboard ─────────────────────────────────────────────────────────────
departmentRouter.get("/dashboard", async (req, res, next) => {
  try {
    const supervisorId = req.user!.sub;

    // Get supervisor name and department
    const supResult = await db.execute(sql`
      SELECT u.full_name, d.name as department_name
      FROM users u
      LEFT JOIN supervisor_departments sd ON sd.supervisor_id = u.id
      LEFT JOIN departments d ON d.id = sd.department_id
      WHERE u.id = ${supervisorId}
      LIMIT 1
    `);
    const supRow = supResult.rows[0] as any;

    // Get all students and their internship data
    const studentsResult = await db.execute(sql`
      SELECT
        u.id, u.full_name, u.index_number, u.current_level,
        i.id as internship_id, i.required_hours, i.start_date, i.end_date,
        sub.id as submission_id, sub.status as submission_status, sub.submitted_at,
        COALESCE((
          SELECT SUM(le.hours::numeric)
          FROM log_entries le
          WHERE le.internship_id = i.id AND le.state = 'approved'
        ), 0) as completed_hours,
        (
          SELECT le.work_date FROM log_entries le
          WHERE le.internship_id = i.id
          ORDER BY le.work_date DESC LIMIT 1
        ) as last_entry_date
      FROM users u
      JOIN supervisor_departments sd ON sd.department_id = u.department_id
      LEFT JOIN internships i ON i.student_id = u.id AND i.status = 'active'
      LEFT JOIN internship_submissions sub ON sub.internship_id = i.id
      WHERE sd.supervisor_id = ${supervisorId}
        AND u.role = 'student'
    `);

    const now = new Date();
    const students = studentsResult.rows as any[];

    // Compute stats
    const yearGroupMap: Record<number, { year: number; label: string; total: number; onTrack: number; atRisk: number; completed: number }> = {};
    for (let y = 1; y <= 4; y++) {
      yearGroupMap[y] = { year: y, label: `Year ${y}`, total: 0, onTrack: 0, atRisk: 0, completed: 0 };
    }

    let pendingReports = 0;
    let atRiskCount = 0;
    let completedCount = 0;
    const recentDecisions: any[] = [];

    for (const s of students) {
      const year = deriveYearGroup(s.index_number, s.current_level);
      const yg = yearGroupMap[year];
      yg.total++;

      const completed = parseFloat(s.completed_hours || "0");
      const required = s.required_hours || 0;
      const pct = required > 0 ? completed / required : 0;

      // Check if final report pending DS review
      if (s.submission_status === "submitted_to_department") {
        pendingReports++;
      }

      // Determine at-risk
      let isAtRisk = false;
      if (s.start_date && s.end_date) {
        const start = new Date(s.start_date);
        const end = new Date(s.end_date);
        const totalDuration = end.getTime() - start.getTime();
        const elapsed = Math.max(0, Math.min(now.getTime() - start.getTime(), totalDuration));
        const expectedPct = totalDuration > 0 ? elapsed / totalDuration : 0;
        const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / 86400000);
        const inactivityDays = s.last_entry_date
          ? Math.floor((now.getTime() - new Date(s.last_entry_date).getTime()) / 86400000)
          : 999;

        isAtRisk = (
          (pct < expectedPct - 0.15 && daysRemaining < 28) ||
          inactivityDays > 7 ||
          (daysRemaining < 5 && pct < 1)
        );
      }

      if (pct >= 1 || s.submission_status === "department_approved") {
        yg.completed++;
        completedCount++;
      } else if (isAtRisk) {
        yg.atRisk++;
        atRiskCount++;
      } else {
        yg.onTrack++;
      }
    }

    // Recent decisions (last 5 approvals/changes)
    const decisionsResult = await db.execute(sql`
      SELECT sub.id, sub.status, sub.decided_at, u.full_name as student_name
      FROM internship_submissions sub
      JOIN users u ON u.id = sub.student_id
      JOIN supervisor_departments sd ON sd.department_id = u.department_id
      WHERE sd.supervisor_id = ${supervisorId}
        AND sub.department_supervisor_id = ${supervisorId}
        AND sub.decided_at IS NOT NULL
      ORDER BY sub.decided_at DESC
      LIMIT 5
    `);
    for (const d of decisionsResult.rows as any[]) {
      recentDecisions.push({
        id: d.id,
        studentName: d.student_name,
        action: d.status === "department_approved" ? "approved" : "changes_requested",
        date: d.decided_at,
      });
    }

    res.json({
      data: {
        supervisorName: supRow?.full_name ?? "Supervisor",
        departmentName: supRow?.department_name ?? "Department",
        yearGroups: Object.values(yearGroupMap).filter(yg => yg.total > 0),
        pendingReports,
        atRiskCount,
        totalStudents: students.length,
        completedCount,
        recentDecisions,
      },
    });
  } catch (e) { next(e); }
});

// ─── 2. Stats (nav badge) ──────────────────────────────────────────────────────
departmentRouter.get("/stats", async (req, res, next) => {
  try {
    const supervisorId = req.user!.sub;

    const inboxResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM internship_submissions sub
      JOIN users u ON u.id = sub.student_id
      JOIN supervisor_departments sd ON sd.department_id = u.department_id
      WHERE sd.supervisor_id = ${supervisorId}
        AND sub.status = 'submitted_to_department'
    `);
    const inboxCount = Number((inboxResult.rows[0] as any)?.count || 0);

    const studentsResult = await db.execute(sql`
      SELECT i.required_hours, i.start_date, i.end_date,
             COALESCE((SELECT SUM(le.hours::numeric) FROM log_entries le WHERE le.internship_id = i.id AND le.state = 'approved'), 0) as completed_hours,
             (SELECT le.work_date FROM log_entries le WHERE le.internship_id = i.id ORDER BY le.work_date DESC LIMIT 1) as last_entry_date
      FROM users u
      JOIN supervisor_departments sd ON sd.department_id = u.department_id
      LEFT JOIN internships i ON i.student_id = u.id AND i.status = 'active'
      WHERE sd.supervisor_id = ${supervisorId} AND u.role = 'student'
    `);

    const now = new Date();
    let attentionCount = 0;
    for (const r of studentsResult.rows as any[]) {
      if (!r.start_date || !r.end_date) continue;
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      const completed = parseFloat(r.completed_hours || "0");
      const required = r.required_hours || 0;
      const pct = required > 0 ? completed / required : 0;
      const totalDuration = end.getTime() - start.getTime();
      const elapsed = Math.max(0, Math.min(now.getTime() - start.getTime(), totalDuration));
      const expectedPct = totalDuration > 0 ? elapsed / totalDuration : 0;
      const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / 86400000);
      const inactivityDays = r.last_entry_date
        ? Math.floor((now.getTime() - new Date(r.last_entry_date).getTime()) / 86400000)
        : 999;
      if (
        (pct < expectedPct - 0.15 && daysRemaining < 28) ||
        inactivityDays > 7 ||
        (daysRemaining < 5 && pct < 1)
      ) {
        attentionCount++;
      }
    }

    res.json({ data: { inbox: inboxCount, attention: attentionCount } });
  } catch (e) { next(e); }
});

// ─── 3. My Students list ───────────────────────────────────────────────────────
departmentRouter.get("/students", async (req, res, next) => {
  try {
    const supervisorId = req.user!.sub;
    const { year } = req.query;

    const result = await db.execute(sql`
      SELECT
        u.id, u.full_name, u.email, u.index_number, u.current_level,
        d.name as department_name,
        i.id as internship_id, i.company, i.location, i.role_title,
        i.required_hours, i.start_date, i.end_date, i.status as internship_status,
        isup.full_name as industry_supervisor_name,
        isup.email as industry_supervisor_email,
        sub.status as report_status,
        COALESCE((
          SELECT SUM(le.hours::numeric)
          FROM log_entries le
          WHERE le.internship_id = i.id AND le.state = 'approved'
        ), 0) as completed_hours,
        (
          SELECT le.work_date FROM log_entries le
          WHERE le.internship_id = i.id
          ORDER BY le.work_date DESC LIMIT 1
        ) as last_entry_date
      FROM users u
      JOIN supervisor_departments sd ON sd.department_id = u.department_id
      JOIN departments d ON d.id = u.department_id
      LEFT JOIN internships i ON i.student_id = u.id AND i.status = 'active'
      LEFT JOIN assignments a ON a.internship_id = i.id AND a.kind = 'industry'
      LEFT JOIN users isup ON isup.id = a.supervisor_id
      LEFT JOIN internship_submissions sub ON sub.internship_id = i.id
      WHERE sd.supervisor_id = ${supervisorId}
        AND u.role = 'student'
      ORDER BY u.full_name ASC
    `);

    let rows = result.rows as any[];

    // Map to front-end shape
    const mapped = rows.map((r) => {
      const yearGroup = deriveYearGroup(r.index_number, r.current_level);
      const completed = parseFloat(r.completed_hours || "0");
      const required = r.required_hours || 0;
      const pct = required > 0 ? completed / required : 0;

      let reportStatus: string = "none";
      if (r.report_status === "submitted_to_department") reportStatus = "pending_review";
      else if (r.report_status === "department_approved") reportStatus = "approved";
      else if (r.report_status === "changes_requested") reportStatus = "changes_requested";

      return {
        id: r.id,
        fullName: r.full_name,
        email: r.email,
        yearGroup,
        programme: r.department_name ?? "Unknown",
        departmentName: r.department_name,
        company: r.company,
        location: r.location,
        roleTitle: r.role_title,
        industrySupervisorName: r.industry_supervisor_name,
        industrySupervisorCompany: r.company,
        requiredHours: required || null,
        completedHours: completed,
        internshipStatus: r.internship_status,
        internshipStartDate: r.start_date,
        internshipEndDate: r.end_date,
        reportStatus,
        lastEntryDate: r.last_entry_date,
      };
    });

    // Filter by year if requested
    const filtered = year ? mapped.filter(s => s.yearGroup === parseInt(year as string, 10)) : mapped;
    res.json({ data: filtered });
  } catch (e) { next(e); }
});

// ─── 4. Student Profile ─────────────────────────────────────────────────────
departmentRouter.get("/students/:studentId", async (req, res, next) => {
  try {
    const supervisorId = req.user!.sub;
    const { studentId } = req.params;

    // Scope check + base data
    const result = await db.execute(sql`
      SELECT
        u.id, u.full_name, u.email, u.index_number, u.current_level,
        d.name as department_name,
        i.id as internship_id, i.company, i.location, i.role_title,
        i.required_hours, i.start_date, i.end_date, i.status as internship_status,
        isup.full_name as industry_supervisor_name,
        sub.id as submission_id, sub.status as report_status,
        vt.token_ulid as sealed_report_token, vt.report_id as sealed_report_id
      FROM users u
      JOIN supervisor_departments sd ON sd.department_id = u.department_id
      JOIN departments d ON d.id = u.department_id
      LEFT JOIN internships i ON i.student_id = u.id AND i.status = 'active'
      LEFT JOIN assignments a ON a.internship_id = i.id AND a.kind = 'industry'
      LEFT JOIN users isup ON isup.id = a.supervisor_id
      LEFT JOIN internship_submissions sub ON sub.internship_id = i.id
      LEFT JOIN verification_tokens vt ON vt.report_id IS NOT NULL
        AND vt.report_id = (SELECT id FROM reports WHERE internship_id = i.id ORDER BY created_at DESC LIMIT 1)
        AND vt.revoked_at IS NULL
      WHERE sd.supervisor_id = ${supervisorId}
        AND u.id = ${studentId}
      LIMIT 1
    `);

    const row = result.rows[0] as any;
    if (!row) throw new ApiError(404, "NOT_FOUND", "Student not found or not in your department.");

    // Entry stats
    const statsResult = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE state IN ('submitted','approved','rejected')) as total_submitted,
        COUNT(*) FILTER (WHERE state = 'approved') as total_approved,
        COUNT(*) FILTER (WHERE state = 'rejected') as total_rejected,
        COALESCE(SUM(hours::numeric) FILTER (WHERE state = 'approved'), 0) as completed_hours,
        COALESCE(AVG(hours::numeric) FILTER (WHERE state = 'approved'), 0) as avg_hours
      FROM log_entries
      WHERE internship_id = ${row.internship_id ?? null}
    `);
    const stats = statsResult.rows[0] as any;

    // Days remaining
    const daysRemaining = row.end_date
      ? Math.ceil((new Date(row.end_date).getTime() - Date.now()) / 86400000)
      : null;

    // Assessments
    const assessResult = await db.execute(sql`
      SELECT a.id, a.type, a.grade, a.comments, a.created_at as assessed_at
      FROM assessments a
      JOIN internships i ON i.id = a.internship_id
      WHERE i.student_id = ${studentId}
        AND a.faculty_id = ${supervisorId}
      ORDER BY a.created_at DESC
    `);

    let reportStatus: string = "none";
    if (row.report_status === "submitted_to_department") reportStatus = "pending_review";
    else if (row.report_status === "department_approved") reportStatus = "approved";
    else if (row.report_status === "changes_requested") reportStatus = "changes_requested";

    const completedHours = parseFloat(stats?.completed_hours || "0");

    const assessments = (assessResult.rows as any[]).map(a => {
      // Competency ratings stored as JSON prefix: "P:4,Pr:3,L:4,I:4||"
      let practicalSkills = 3, professionalism = 3, logQuality = 3, industryReadiness = 3;
      let comments = a.comments || "";
      const ratingMatch = comments.match(/^P:(\d),Pr:(\d),L:(\d),I:(\d)\|\|/);
      if (ratingMatch) {
        practicalSkills = parseInt(ratingMatch[1]);
        professionalism = parseInt(ratingMatch[2]);
        logQuality = parseInt(ratingMatch[3]);
        industryReadiness = parseInt(ratingMatch[4]);
        comments = comments.replace(/^P:\d,Pr:\d,L:\d,I:\d\|\|/, "");
      }
      return {
        id: a.id,
        internshipId: row.internship_id,
        studentId,
        type: a.type,
        grade: a.grade,
        practicalSkills,
        professionalism,
        logQuality,
        industryReadiness,
        comments,
        assessedAt: a.assessed_at,
      };
    });

    res.json({
      data: {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        yearGroup: deriveYearGroup(row.index_number, row.current_level),
        programme: row.department_name ?? "Unknown",
        departmentName: row.department_name,
        company: row.company,
        location: row.location,
        roleTitle: row.role_title,
        requiredHours: row.required_hours,
        completedHours,
        internshipStatus: row.internship_status,
        internshipStartDate: row.start_date,
        internshipEndDate: row.end_date,
        industrySupervisorName: row.industry_supervisor_name,
        industrySupervisorCompany: row.company,
        reportStatus,
        lastEntryDate: null,
        totalEntriesSubmitted: parseInt(stats?.total_submitted || "0"),
        totalEntriesApproved: parseInt(stats?.total_approved || "0"),
        totalEntriesRejected: parseInt(stats?.total_rejected || "0"),
        avgHoursPerEntry: parseFloat(stats?.avg_hours || "0"),
        daysRemainingInWindow: daysRemaining,
        sealedReportToken: row.sealed_report_token ?? null,
        sealedReportId: row.sealed_report_id ?? null,
        assessments,
      },
    });
  } catch (e) { next(e); }
});

// ─── 5. Final Reports Inbox ────────────────────────────────────────────────────
departmentRouter.get("/reports", async (req, res, next) => {
  try {
    const supervisorId = req.user!.sub;
    const { year } = req.query;

    const result = await db.execute(sql`
      SELECT
        sub.id, sub.student_id, sub.status, sub.submitted_at, sub.comment,
        u.full_name as student_name, u.email as student_email, u.index_number, u.current_level,
        d.name as programme,
        i.company, i.required_hours, i.role_title,
        isup.full_name as industry_supervisor_name,
        COALESCE((
          SELECT SUM(le.hours::numeric) FROM log_entries le
          WHERE le.internship_id = i.id AND le.state = 'approved'
        ), 0) as completed_hours,
        vt.token_ulid as verification_token, vt.report_id
      FROM internship_submissions sub
      JOIN users u ON u.id = sub.student_id
      JOIN supervisor_departments sd ON sd.department_id = u.department_id
      JOIN departments d ON d.id = u.department_id
      JOIN internships i ON i.id = sub.internship_id
      LEFT JOIN assignments a ON a.internship_id = i.id AND a.kind = 'industry'
      LEFT JOIN users isup ON isup.id = a.supervisor_id
      LEFT JOIN verification_tokens vt ON vt.report_id = (
        SELECT id FROM reports WHERE internship_id = i.id ORDER BY created_at DESC LIMIT 1
      ) AND vt.revoked_at IS NULL
      WHERE sd.supervisor_id = ${supervisorId}
      ORDER BY sub.submitted_at DESC
    `);

    const now = new Date();
    const rows = result.rows as any[];

    const mapped = rows.map(r => {
      const yearGroup = deriveYearGroup(r.index_number, r.current_level);
      const completed = parseFloat(r.completed_hours || "0");
      const required = r.required_hours || 0;
      const submittedAt = new Date(r.submitted_at);
      const daysWaiting = Math.floor((now.getTime() - submittedAt.getTime()) / 86400000);

      let status: string = "pending_review";
      if (r.status === "department_approved") status = "approved";
      else if (r.status === "changes_requested") status = "changes_requested";

      return {
        id: r.id,
        studentId: r.student_id,
        studentName: r.student_name,
        studentEmail: r.student_email,
        yearGroup,
        programme: r.programme ?? "Unknown",
        company: r.company,
        industrySupervisorName: r.industry_supervisor_name ?? "Unknown",
        completedHours: completed,
        requiredHours: required,
        submittedAt: r.submitted_at,
        daysWaiting,
        status,
        verificationToken: r.verification_token ?? null,
        reportId: r.report_id ?? null,
      };
    });

    const filtered = year ? mapped.filter(s => s.yearGroup === parseInt(year as string, 10)) : mapped;
    res.json({ data: filtered });
  } catch (e) { next(e); }
});

// ─── 6. Report Detail ──────────────────────────────────────────────────────────
departmentRouter.get("/reports/:submissionId", async (req, res, next) => {
  try {
    const supervisorId = req.user!.sub;
    const { submissionId } = req.params;

    const result = await db.execute(sql`
      SELECT
        sub.id, sub.student_id, sub.status, sub.submitted_at, sub.comment,
        u.full_name as student_name, u.email as student_email, u.index_number, u.current_level,
        d.name as programme,
        i.id as internship_id, i.company, i.required_hours, i.role_title,
        i.start_date, i.end_date,
        isup.full_name as industry_supervisor_name,
        r.aggregate_sha256, r.kid as signed_by, r.created_at as sealed_at,
        vt.token_ulid as verification_token, vt.report_id,
        COALESCE((
          SELECT SUM(le.hours::numeric) FROM log_entries le
          WHERE le.internship_id = i.id AND le.state = 'approved'
        ), 0) as completed_hours,
        (SELECT COUNT(*) FROM log_entries le WHERE le.internship_id = i.id AND le.state = 'approved') as sealed_entries
      FROM internship_submissions sub
      JOIN users u ON u.id = sub.student_id
      JOIN supervisor_departments sd ON sd.department_id = u.department_id
      JOIN departments d ON d.id = u.department_id
      JOIN internships i ON i.id = sub.internship_id
      LEFT JOIN assignments a ON a.internship_id = i.id AND a.kind = 'industry'
      LEFT JOIN users isup ON isup.id = a.supervisor_id
      LEFT JOIN reports r ON r.internship_id = i.id
      LEFT JOIN verification_tokens vt ON vt.report_id = r.id AND vt.revoked_at IS NULL
      WHERE sd.supervisor_id = ${supervisorId} AND sub.id = ${submissionId}
      LIMIT 1
    `);

    const row = result.rows[0] as any;
    if (!row) throw new ApiError(404, "NOT_FOUND", "Report not found or not in your department.");

    const completed = parseFloat(row.completed_hours || "0");
    const required = row.required_hours || 0;
    const now = new Date();
    const daysWaiting = Math.floor((now.getTime() - new Date(row.submitted_at).getTime()) / 86400000);

    let status: string = "pending_review";
    if (row.status === "department_approved") status = "approved";
    else if (row.status === "changes_requested") status = "changes_requested";

    res.json({
      data: {
        id: row.id,
        studentId: row.student_id,
        studentName: row.student_name,
        studentEmail: row.student_email,
        yearGroup: deriveYearGroup(row.index_number, row.current_level),
        programme: row.programme ?? "Unknown",
        company: row.company,
        roleTitle: row.role_title,
        industrySupervisorName: row.industry_supervisor_name ?? "Unknown",
        internshipStartDate: row.start_date,
        internshipEndDate: row.end_date,
        completedHours: completed,
        requiredHours: required,
        submittedAt: row.submitted_at,
        daysWaiting,
        status,
        verificationToken: row.verification_token ?? null,
        reportId: row.report_id ?? null,
        totalSealedEntries: parseInt(row.sealed_entries || "0"),
        aggregateDigest: row.aggregate_sha256 ?? null,
        sealedAt: row.sealed_at ?? null,
        signedBy: row.signed_by ?? null,
      },
    });
  } catch (e) { next(e); }
});

// ─── 7. Approve Final Report ───────────────────────────────────────────────────
departmentRouter.post("/reports/:submissionId/approve", async (req, res, next) => {
  try {
    const supervisorId = req.user!.sub;
    const { submissionId } = req.params;
    const { comment } = req.body;

    // Scope check
    const check = await db.execute(sql`
      SELECT sub.id FROM internship_submissions sub
      JOIN users u ON u.id = sub.student_id
      JOIN supervisor_departments sd ON sd.department_id = u.department_id
      WHERE sd.supervisor_id = ${supervisorId} AND sub.id = ${submissionId}
    `);
    if (!check.rows[0]) throw new ApiError(404, "NOT_FOUND", "Submission not found or unauthorized.");

    await db
      .update(internshipSubmissions)
      .set({
        status: "department_approved",
        departmentSupervisorId: supervisorId,
        decidedAt: new Date(),
        ...(comment ? { comment } : {}),
      })
      .where(eq(internshipSubmissions.id, submissionId));

    res.json({ data: { message: "Report approved." } });
  } catch (e) { next(e); }
});

// ─── 8. Request changes on Final Report ────────────────────────────────────────
const requestChangesSchema = z.object({
  comment: z.string().min(5, "Please provide a more detailed explanation."),
});

departmentRouter.post(
  "/reports/:submissionId/request-changes",
  validate(requestChangesSchema),
  async (req, res, next) => {
    try {
      const supervisorId = req.user!.sub;
      const { submissionId } = req.params;
      const { comment } = req.body;

      const check = await db.execute(sql`
        SELECT sub.id FROM internship_submissions sub
        JOIN users u ON u.id = sub.student_id
        JOIN supervisor_departments sd ON sd.department_id = u.department_id
        WHERE sd.supervisor_id = ${supervisorId} AND sub.id = ${submissionId}
      `);
      if (!check.rows[0]) throw new ApiError(404, "NOT_FOUND", "Submission not found or unauthorized.");

      await db
        .update(internshipSubmissions)
        .set({
          status: "changes_requested",
          departmentSupervisorId: supervisorId,
          decidedAt: new Date(),
          comment,
        })
        .where(eq(internshipSubmissions.id, submissionId));

      res.json({ data: { message: "Changes requested." } });
    } catch (e) { next(e); }
  }
);

// ─── 9. At-Risk Students ────────────────────────────────────────────────────────
departmentRouter.get("/at-risk", async (req, res, next) => {
  try {
    const supervisorId = req.user!.sub;
    const { year } = req.query;

    const result = await db.execute(sql`
      SELECT
        u.id, u.full_name, u.email, u.index_number, u.current_level,
        i.company, i.required_hours, i.start_date, i.end_date,
        COALESCE((
          SELECT SUM(le.hours::numeric) FROM log_entries le
          WHERE le.internship_id = i.id AND le.state = 'approved'
        ), 0) as completed_hours,
        (
          SELECT le.work_date FROM log_entries le
          WHERE le.internship_id = i.id
          ORDER BY le.work_date DESC LIMIT 1
        ) as last_entry_date
      FROM users u
      JOIN supervisor_departments sd ON sd.department_id = u.department_id
      JOIN internships i ON i.student_id = u.id AND i.status = 'active'
      WHERE sd.supervisor_id = ${supervisorId}
        AND u.role = 'student'
    `);

    const now = new Date();
    const atRisk: any[] = [];

    for (const r of result.rows as any[]) {
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      const completed = parseFloat(r.completed_hours || "0");
      const required = r.required_hours || 0;
      const pct = required > 0 ? completed / required : 0;
      const totalDuration = end.getTime() - start.getTime();
      const elapsed = Math.max(0, Math.min(now.getTime() - start.getTime(), totalDuration));
      const expectedPct = totalDuration > 0 ? elapsed / totalDuration : 0;
      const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / 86400000);
      const inactivityDays = r.last_entry_date
        ? Math.floor((now.getTime() - new Date(r.last_entry_date).getTime()) / 86400000)
        : 999;

      let severity: string | null = null;
      let reason = "";

      // Priority order: critical > window_closing > inactive > warning
      const behindAmount = expectedPct - pct;
      if (daysRemaining < 14 && behindAmount > 0.30) {
        severity = "critical";
        reason = `${Math.round(behindAmount * 100)}% behind with only ${daysRemaining} days left`;
      } else if (daysRemaining > 0 && daysRemaining < 5 && pct < 1) {
        severity = "window_closing";
        reason = `Logging window closes in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}, only ${Math.round(pct * 100)}% complete`;
      } else if (inactivityDays > 7) {
        severity = "inactive";
        reason = `No log entries in ${inactivityDays} days`;
      } else if (behindAmount > 0.15 && daysRemaining < 28) {
        severity = "warning";
        reason = `${Math.round(behindAmount * 100)}% behind expected pace with ${daysRemaining} days remaining`;
      }

      if (!severity) continue;

      atRisk.push({
        id: r.id,
        fullName: r.full_name,
        email: r.email,
        yearGroup: deriveYearGroup(r.index_number, r.current_level),
        company: r.company,
        completedHours: completed,
        requiredHours: required,
        daysRemainingInWindow: daysRemaining,
        lastEntryDate: r.last_entry_date,
        severity,
        reason,
      });
    }

    // Sort: critical first, then window_closing, inactive, warning
    const ORDER = ["critical", "window_closing", "inactive", "warning"];
    atRisk.sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));

    const filtered = year ? atRisk.filter(s => s.yearGroup === parseInt(year as string, 10)) : atRisk;
    res.json({ data: filtered });
  } catch (e) { next(e); }
});

// ─── 10. Assessment history ────────────────────────────────────────────────────
departmentRouter.get("/assessments/:studentId", async (req, res, next) => {
  try {
    const supervisorId = req.user!.sub;
    const { studentId } = req.params;

    const result = await db.execute(sql`
      SELECT a.id, a.type, a.grade, a.comments, a.created_at as assessed_at, a.internship_id
      FROM assessments a
      JOIN internships i ON i.id = a.internship_id
      JOIN supervisor_departments sd ON sd.department_id = (
        SELECT department_id FROM users WHERE id = i.student_id
      )
      WHERE i.student_id = ${studentId}
        AND a.faculty_id = ${supervisorId}
        AND sd.supervisor_id = ${supervisorId}
      ORDER BY a.created_at DESC
    `);

    const assessments = (result.rows as any[]).map(a => {
      let practicalSkills = 3, professionalism = 3, logQuality = 3, industryReadiness = 3;
      let comments = a.comments || "";
      const ratingMatch = comments.match(/^P:(\d),Pr:(\d),L:(\d),I:(\d)\|\|/);
      if (ratingMatch) {
        practicalSkills = parseInt(ratingMatch[1]);
        professionalism = parseInt(ratingMatch[2]);
        logQuality = parseInt(ratingMatch[3]);
        industryReadiness = parseInt(ratingMatch[4]);
        comments = comments.replace(/^P:\d,Pr:\d,L:\d,I:\d\|\|/, "");
      }
      return {
        id: a.id,
        internshipId: a.internship_id,
        studentId,
        type: a.type,
        grade: a.grade,
        practicalSkills,
        professionalism,
        logQuality,
        industryReadiness,
        comments,
        assessedAt: a.assessed_at,
      };
    });

    res.json({ data: assessments });
  } catch (e) { next(e); }
});

// ─── 11. Create Assessment ─────────────────────────────────────────────────────
const createAssessmentSchema = z.object({
  studentId: z.string().uuid(),
  internshipId: z.string().uuid().optional(),
  type: z.enum(["midterm", "final"]),
  grade: z.enum(["A", "B+", "B", "C+", "C", "D", "F"]),
  practicalSkills: z.number().int().min(1).max(5),
  professionalism: z.number().int().min(1).max(5),
  logQuality: z.number().int().min(1).max(5),
  industryReadiness: z.number().int().min(1).max(5),
  comments: z.string().min(10, "Written feedback must be at least 10 characters."),
});

departmentRouter.post(
  "/assessments",
  validate(createAssessmentSchema),
  async (req, res, next) => {
    try {
      const supervisorId = req.user!.sub;
      const { studentId, type, grade, practicalSkills, professionalism, logQuality, industryReadiness, comments } = req.body;

      // Find the active internship for this student
      const internshipResult = await db.execute(sql`
        SELECT i.id FROM internships i
        JOIN supervisor_departments sd ON sd.department_id = (
          SELECT department_id FROM users WHERE id = ${studentId}
        )
        WHERE i.student_id = ${studentId}
          AND i.status = 'active'
          AND sd.supervisor_id = ${supervisorId}
        LIMIT 1
      `);
      const internship = internshipResult.rows[0] as any;
      if (!internship) throw new ApiError(404, "NOT_FOUND", "No active internship found for this student in your department.");

      // Store ratings as a prefix: "P:4,Pr:3,L:4,I:4||<actual comment>"
      const fullComments = `P:${practicalSkills},Pr:${professionalism},L:${logQuality},I:${industryReadiness}||${comments}`;

      const [created] = await db
        .insert(assessments)
        .values({
          internshipId: internship.id,
          facultyId: supervisorId,
          type,
          grade,
          comments: fullComments,
        })
        .returning();

      res.status(201).json({
        data: {
          id: created.id,
          internshipId: internship.id,
          studentId,
          type,
          grade,
          practicalSkills,
          professionalism,
          logQuality,
          industryReadiness,
          comments,
          assessedAt: created.createdAt,
        },
      });
    } catch (e) { next(e); }
  }
);

// ─── Legacy endpoints (kept for backward compat, new FE doesn't use them) ─────
departmentRouter.get("/submissions", async (req, res, next) => {
  // Redirect to new /reports endpoint
  req.url = "/reports";
  next("route");
});

departmentRouter.get("/submissions/:id", async (req, res, next) => {
  res.status(410).json({ error: { code: "GONE", message: "Use /department/reports/:id instead." } });
});

departmentRouter.get("/needs-attention", async (req, res, next) => {
  req.url = "/at-risk";
  next("route");
});
