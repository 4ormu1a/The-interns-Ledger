import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { internships } from "./internships.js";
import { userRole } from "./enums.js";

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  internshipId: uuid("internship_id").notNull().references(() => internships.id),
  inviterId: uuid("inviter_id").notNull().references(() => users.id),
  email: text("email").notNull(),
  role: userRole("role").notNull().default("industry_supervisor"),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
