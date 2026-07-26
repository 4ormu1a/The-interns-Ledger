/** Entry lifecycle + window rules (BR-01/02/03, FR-LOG-02..11). All times in institution TZ (BR-14). */
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { internships, logEntries, notifications } from "../../db/schema/index.js";
import { ApiError } from "../../middleware/error.js";

const DAY = 86_400_000;

/** Date-only "today" in the institution timezone. */
export function todayInTz(tz: string): Date {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date()); // YYYY-MM-DD
  return new Date(s + "T00:00:00Z");
}

export function assertWorkDateAllowed(workDate: string, tz: string) {
  const today = todayInTz(tz).getTime();
  const wd = new Date(workDate + "T00:00:00Z").getTime();
  if (wd > today) throw new ApiError(422, "FUTURE_DATE", "Oops! You cannot log hours for a date that hasn't happened yet. Please select a valid date.");
  if (today - wd > 7 * DAY) throw new ApiError(422, "BACKDATE_LIMIT", "You can only log entries for the past 7 days.");
}

export function assertLoggingWindowOpen(internshipEnd: string, tz: string) {
  const today = todayInTz(tz).getTime();
  const close = new Date(internshipEnd + "T00:00:00Z").getTime() + 14 * DAY; // BR-02
  if (today > close) throw new ApiError(422, "WINDOW_CLOSED", "You can no longer log entries because your internship ended over two weeks ago.");
}

export function assertSubmitWindow(workDate: string, tz: string) {
  const today = todayInTz(tz).getTime();
  const wd = new Date(workDate + "T00:00:00Z").getTime();
  if (today - wd > 7 * DAY) throw new ApiError(422, "SUBMIT_WINDOW", "You need to submit entries within 7 days of the work date.");
}

export async function getOwnedActiveInternship(studentId: string) {
  const row = await db.query.internships.findFirst({
    where: and(eq(internships.studentId, studentId), eq(internships.status, "active")),
  });
  if (!row) throw new ApiError(409, "NO_INTERNSHIP", "You need to set up your internship profile before you can log entries.");
  return row;
}

export interface EntryInput { workDate: string; hours: number; activity: string; skills: string[]; reflection?: string }

export async function createDraft(studentId: string, input: EntryInput, tz: string) {
  const internship = await getOwnedActiveInternship(studentId);
  assertLoggingWindowOpen(internship.endDate, tz);
  assertWorkDateAllowed(input.workDate, tz);
  const [row] = await db.insert(logEntries).values({
    internshipId: internship.id, studentId,
    workDate: input.workDate, hours: String(input.hours), activity: input.activity,
    skills: input.skills, reflection: input.reflection ?? null,
  }).returning();
  return row;
}

type Entry = typeof logEntries.$inferSelect;

export async function updateEntry(entry: Entry, input: Partial<EntryInput>, tz: string) {
  if (entry.state !== "draft" && entry.state !== "rejected") {
    throw new ApiError(409, "NOT_EDITABLE", "This entry has already been submitted or approved, so it can't be edited.");
  }
  if (input.workDate) assertWorkDateAllowed(input.workDate, tz);
  const [row] = await db.update(logEntries).set({
    ...(input.workDate ? { workDate: input.workDate } : {}),
    ...(input.hours !== undefined ? { hours: String(input.hours) } : {}),
    ...(input.activity ? { activity: input.activity } : {}),
    ...(input.skills ? { skills: input.skills } : {}),
    ...(input.reflection !== undefined ? { reflection: input.reflection } : {}),
    updatedAt: new Date(),
  }).where(eq(logEntries.id, entry.id)).returning();
  return row;
}

export async function deleteDraft(entry: Entry) {
  if (entry.state !== "draft") throw new ApiError(409, "NOT_DELETABLE", "You can only delete entries that are still drafts.");
  await db.delete(logEntries).where(eq(logEntries.id, entry.id));
}

export async function submitEntry(entry: Entry, tz: string) {
  if (entry.state !== "draft" && entry.state !== "rejected") {
    throw new ApiError(409, "NOT_SUBMITTABLE", "This entry can't be submitted right now.");
  }
  const internship = await db.query.internships.findFirst({ where: eq(internships.id, entry.internshipId) });
  assertLoggingWindowOpen(internship!.endDate, tz);   // BR-02
  assertSubmitWindow(entry.workDate, tz);             // BR-01
  const [row] = await db.update(logEntries).set({
    state: "submitted", submittedAt: new Date(), rejectReason: null, updatedAt: new Date(),
  }).where(eq(logEntries.id, entry.id)).returning();

  if (internship?.industrySupervisorId) {
    await db.insert(notifications).values({
      recipientId: internship.industrySupervisorId,
      type: "entry.submitted",
      payload: { entryId: entry.id, workDate: entry.workDate }
    });
  }

  return row;
}

/** FR-LOG-13 / UC-06 — issue a correction: new draft version pre-filled from the approved original. */
export async function issueCorrection(entry: Entry, tz: string) {
  if (entry.state !== "approved") throw new ApiError(409, "NOT_CORRECTABLE", "You can only submit corrections for entries that have been approved and sealed.");
  const internship = await db.query.internships.findFirst({ where: eq(internships.id, entry.internshipId) });
  assertLoggingWindowOpen(internship!.endDate, tz); // window must still be open (UC-06 exception)
  const existing = await db.query.logEntries.findFirst({ where: eq(logEntries.supersedesId, entry.id) });
  if (existing) throw new ApiError(409, "CORRECTION_EXISTS", "You've already started a correction for this entry.");
  const [row] = await db.insert(logEntries).values({
    internshipId: entry.internshipId, studentId: entry.studentId,
    version: entry.version + 1, supersedesId: entry.id, state: "draft",
    workDate: entry.workDate, hours: String(entry.hours), activity: entry.activity,
    reflection: entry.reflection, skills: entry.skills,
  }).returning();
  return row;
}

export async function listEntries(studentId: string, state?: string) {
  return db.query.logEntries.findMany({
    where: and(eq(logEntries.studentId, studentId),
      ...(state ? [eq(logEntries.state, state as Entry["state"])] : [])),
    orderBy: [desc(logEntries.workDate), desc(logEntries.createdAt)],
  });
}
