import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, integer, numeric, boolean, date, uniqueIndex } from "drizzle-orm/pg-core";
import { internshipStatus, assignmentKind, entryState } from "./enums.js";
import { users } from "./users.js";

export const internships = pgTable("internships", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id"),
  studentId: uuid("student_id").notNull().references(() => users.id),
  company: text("company").notNull(),
  location: text("location").notNull(),
  roleTitle: text("role_title").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  requiredHours: integer("required_hours").notNull(),
  requiredWeeks: integer("required_weeks").notNull(),
  status: internshipStatus("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assignments = pgTable("assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  internshipId: uuid("internship_id").notNull().references(() => internships.id),
  supervisorId: uuid("supervisor_id").notNull().references(() => users.id), // may be admin (BR-12)
  kind: assignmentKind("kind").notNull(),
  isPrimaryApprover: boolean("is_primary_approver").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // one primary approver per internship (BR-05) — partial unique index
  uniqueIndex("uq_primary_approver").on(t.internshipId).where(sql`${t.isPrimaryApprover} = true`),
]);

export const logEntries = pgTable("log_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  internshipId: uuid("internship_id").notNull().references(() => internships.id),
  studentId: uuid("student_id").notNull().references(() => users.id),
  version: integer("version").notNull().default(1),
  supersedesId: uuid("supersedes_id"), // FR-LOG-13
  state: entryState("state").notNull().default("draft"),
  workDate: date("work_date").notNull(),
  hours: numeric("hours", { precision: 4, scale: 1 }).notNull(),
  activity: text("activity").notNull(),
  reflection: text("reflection"),
  skills: text("skills").array().notNull().default([]),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decidedBy: uuid("decided_by"),
  rejectReason: text("reject_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const entryComments = pgTable("entry_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  entryId: uuid("entry_id").notNull().references(() => logEntries.id),
  authorId: uuid("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  entryId: uuid("entry_id").notNull().references(() => logEntries.id),
  blobUrl: text("blob_url").notNull(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  sha256: text("sha256").notNull(), // FR-INT-01
  deletedAt: timestamp("deleted_at", { withTimezone: true }), // crypto-shred
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
