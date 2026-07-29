import { api, post } from "../../lib/api";

// ─── Cohort / Dashboard ────────────────────────────────────────────────────────

export interface YearGroupStat {
  year: number; // 1 | 2 | 3 | 4
  label: string; // "Year 1", etc.
  total: number;
  onTrack: number;
  atRisk: number;
  completed: number;
}

export interface DeptDashboardData {
  supervisorName: string;
  departmentName: string;
  yearGroups: YearGroupStat[];
  pendingReports: number;
  atRiskCount: number;
  totalStudents: number;
  completedCount: number;
  recentDecisions: RecentDecision[];
}

export interface RecentDecision {
  id: string;
  studentName: string;
  action: "approved" | "changes_requested";
  date: string;
}

// ─── Students ──────────────────────────────────────────────────────────────────

export interface DeptStudent {
  id: string;
  fullName: string;
  email: string;
  yearGroup: number; // 1 | 2 | 3 | 4
  programme: string;
  departmentName: string;
  company: string | null;
  location: string | null;
  roleTitle: string | null;
  industrySupervisorName: string | null;
  industrySupervisorCompany: string | null;
  requiredHours: number | null;
  completedHours: number;
  internshipStatus: "active" | "window_closed" | "archived" | null;
  internshipStartDate: string | null;
  internshipEndDate: string | null;
  reportStatus: "none" | "pending_review" | "changes_requested" | "approved" | null;
  lastEntryDate: string | null;
}

export type StudentStatus = "all" | "on_track" | "at_risk" | "completed" | "awaiting_signoff" | "not_started";

// ─── Student Profile ───────────────────────────────────────────────────────────

export interface DeptStudentProfile extends DeptStudent {
  totalEntriesSubmitted: number;
  totalEntriesApproved: number;
  totalEntriesRejected: number;
  avgHoursPerEntry: number;
  daysRemainingInWindow: number | null;
  sealedReportToken: string | null; // verification token for /verify/:token
  sealedReportId: string | null;
  assessments: Assessment[];
}

// ─── Final Reports Inbox ────────────────────────────────────────────────────────

export interface FinalReportSubmission {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  yearGroup: number;
  programme: string;
  company: string;
  industrySupervisorName: string;
  completedHours: number;
  requiredHours: number;
  submittedAt: string;
  daysWaiting: number;
  status: "pending_review" | "changes_requested" | "approved";
  verificationToken: string | null;
  reportId: string | null;
}

export interface FinalReportDetail extends FinalReportSubmission {
  internshipStartDate: string;
  internshipEndDate: string;
  roleTitle: string;
  totalSealedEntries: number;
  aggregateDigest: string | null;
  sealedAt: string | null;
  signedBy: string | null; // kid
}

// ─── At-Risk ────────────────────────────────────────────────────────────────────

export type AtRiskSeverity = "critical" | "warning" | "inactive" | "window_closing";

export interface AtRiskStudent {
  id: string;
  fullName: string;
  email: string;
  yearGroup: number;
  company: string | null;
  completedHours: number;
  requiredHours: number;
  daysRemainingInWindow: number;
  lastEntryDate: string | null;
  severity: AtRiskSeverity;
  reason: string;
}

// ─── Assessment / Grading ─────────────────────────────────────────────────────

export type AssessmentType = "midterm" | "final";
export type Grade = "A" | "B+" | "B" | "C+" | "C" | "D" | "F";

export interface Assessment {
  id: string;
  internshipId: string;
  studentId: string;
  type: AssessmentType;
  grade: Grade;
  practicalSkills: number; // 1-5
  professionalism: number;
  logQuality: number;
  industryReadiness: number;
  comments: string;
  assessedAt: string;
}

export interface CreateAssessmentPayload {
  internshipId: string;
  studentId: string;
  type: AssessmentType;
  grade: Grade;
  practicalSkills: number;
  professionalism: number;
  logQuality: number;
  industryReadiness: number;
  comments: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const departmentApi = {
  // Dashboard
  dashboard: () => api<DeptDashboardData>("/department/dashboard"),

  // Stats (for nav badge — lightweight)
  stats: () => api<{ inbox: number; attention: number }>("/department/stats"),

  // Students
  students: (params?: { year?: number; status?: StudentStatus; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.year) qs.set("year", String(params.year));
    if (params?.status && params.status !== "all") qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    const q = qs.toString();
    return api<DeptStudent[]>(`/department/students${q ? `?${q}` : ""}`);
  },

  // Single student profile
  studentProfile: (studentId: string) =>
    api<DeptStudentProfile>(`/department/students/${studentId}`),

  // Final reports inbox
  reports: (params?: { year?: number }) => {
    const qs = new URLSearchParams();
    if (params?.year) qs.set("year", String(params.year));
    const q = qs.toString();
    return api<FinalReportSubmission[]>(`/department/reports${q ? `?${q}` : ""}`);
  },

  reportDetail: (submissionId: string) =>
    api<FinalReportDetail>(`/department/reports/${submissionId}`),

  approveReport: (submissionId: string, comment?: string) =>
    post(`/department/reports/${submissionId}/approve`, { comment: comment ?? "" }),

  requestChanges: (submissionId: string, comment: string) =>
    post(`/department/reports/${submissionId}/request-changes`, { comment }),

  // At-risk
  atRisk: (year?: number) => {
    const qs = year ? `?year=${year}` : "";
    return api<AtRiskStudent[]>(`/department/at-risk${qs}`);
  },

  // Assessments
  assessments: (studentId: string) =>
    api<Assessment[]>(`/department/assessments/${studentId}`),

  createAssessment: (payload: CreateAssessmentPayload) =>
    post<Assessment>("/department/assessments", payload),

  // Me / account (reuses existing /me endpoint)
  me: () => api<{ fullName: string; email: string; consentAt: string }>("/me"),
  updateName: (fullName: string) =>
    api("/me", { method: "PATCH", body: JSON.stringify({ fullName }) }),
  changePassword: (current: string, next: string) =>
    post("/me/password", { current, next }),
};
