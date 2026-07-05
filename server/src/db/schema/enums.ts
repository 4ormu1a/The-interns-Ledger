import { pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["student", "industry_supervisor", "faculty_supervisor", "admin"]);
export const userStatus = pgEnum("user_status", ["pending", "active", "deactivated"]);
export const emailTokenPurpose = pgEnum("email_token_purpose", ["verify", "reset"]);
export const internshipStatus = pgEnum("internship_status", ["active", "window_closed", "archived"]);
export const assignmentKind = pgEnum("assignment_kind", ["industry", "faculty"]);
export const entryState = pgEnum("entry_state", ["draft", "submitted", "approved", "rejected", "superseded", "expired"]);
export const keyStatus = pgEnum("key_status", ["active", "retired", "revoked"]);
export const reportType = pgEnum("report_type", ["live", "sealed"]);
export const tokenScope = pgEnum("token_scope", ["entry", "report"]);
export const disclosure = pgEnum("disclosure", ["minimal", "full"]);
export const assessmentType = pgEnum("assessment_type", ["midterm", "final"]);
