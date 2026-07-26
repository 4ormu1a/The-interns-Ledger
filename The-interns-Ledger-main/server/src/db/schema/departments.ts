import { pgTable, uuid, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { submissionStatus } from "./enums.js";
import { users } from "./users.js";
import { internships, logEntries } from "./internships.js";

export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supervisorDepartments = pgTable("supervisor_departments", {
  supervisorId: uuid("supervisor_id").notNull().references(() => users.id),
  departmentId: uuid("department_id").notNull().references(() => departments.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_supervisor_department").on(t.supervisorId, t.departmentId),
]);

export const internshipSubmissions = pgTable("internship_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => users.id),
  internshipId: uuid("internship_id").notNull().references(() => internships.id),
  status: submissionStatus("status").notNull().default("submitted_to_department"),
  departmentSupervisorId: uuid("department_supervisor_id").references(() => users.id),
  comment: text("comment"),
  sealedReportId: uuid("sealed_report_id"), // Reference to a report table or similar if it exists
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
});

export const submissionFlags = pgTable("submission_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id").notNull().references(() => internshipSubmissions.id),
  logEntryId: uuid("log_entry_id").references(() => logEntries.id), // nullable for aggregate comments
  comment: text("comment").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attentionRules = pgTable("attention_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  supervisorId: uuid("supervisor_id").notNull().references(() => users.id).unique(),
  hoursBehindThresholdPct: integer("hours_behind_threshold_pct").notNull().default(20),
  weeksRemainingThreshold: integer("weeks_remaining_threshold").notNull().default(4),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
