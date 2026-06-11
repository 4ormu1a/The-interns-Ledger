import { pgTable, uuid, text, timestamp, jsonb, bigserial } from "drizzle-orm/pg-core";
import { keyStatus, tokenScope, disclosure, reportType, assessmentType } from "./enums.js";
import { users } from "./users.js";
import { logEntries, internships } from "./internships.js";

export const signingKeys = pgTable("signing_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  kid: text("kid").notNull().unique(),
  publicKey: text("public_key").notNull(), // published; private key never stored (NFR-SEC-04)
  status: keyStatus("status").notNull().default("active"),
  activatedAt: timestamp("activated_at", { withTimezone: true }).notNull().defaultNow(),
  retiredAt: timestamp("retired_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const seals = pgTable("seals", {
  id: uuid("id").primaryKey().defaultRandom(),
  entryId: uuid("entry_id").notNull().unique().references(() => logEntries.id),
  canonicalPayload: jsonb("canonical_payload").notNull(),
  digestSha256: text("digest_sha256").notNull(),
  signatureEd25519: text("signature_ed25519").notNull(),
  kid: text("kid").notNull(),
  sealedAt: timestamp("sealed_at", { withTimezone: true }).notNull().defaultNow(),
  sealedBy: uuid("sealed_by").notNull().references(() => users.id),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  internshipId: uuid("internship_id").notNull().references(() => internships.id),
  type: reportType("type").notNull(),
  snapshot: jsonb("snapshot"),
  aggregateSha256: text("aggregate_sha256"),
  aggregateSignature: text("aggregate_signature"),
  kid: text("kid"),
  pdfBlobUrl: text("pdf_blob_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verificationTokens = pgTable("verification_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenUlid: text("token_ulid").notNull().unique(),
  scope: tokenScope("scope").notNull(),
  entryId: uuid("entry_id").references(() => logEntries.id),
  reportId: uuid("report_id").references(() => reports.id),
  disclosure: disclosure("disclosure").notNull().default("minimal"), // FR-QR-05
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokeReason: text("revoke_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  internshipId: uuid("internship_id").notNull().references(() => internships.id),
  facultyId: uuid("faculty_id").notNull().references(() => users.id),
  type: assessmentType("type").notNull(),
  grade: text("grade").notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  seq: bigserial("seq", { mode: "number" }).primaryKey(),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  metadata: jsonb("metadata"),
  prevHash: text("prev_hash").notNull(),
  hash: text("hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipientId: uuid("recipient_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  payload: jsonb("payload"),
  readAt: timestamp("read_at", { withTimezone: true }),
  emailedAt: timestamp("emailed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
