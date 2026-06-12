/** Entry lifecycle + window rules (BR-01/02/03, FR-LOG-02..11). All times in institution TZ (BR-14). */
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { internships, logEntries } from "../../db/schema/index.js";
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
  if (wd > today) throw new ApiError(422, "FUTURE_DATE", "Work date cannot be in the future.");
  if (today - wd > 7 * DAY) throw new ApiError(422, "BACKDATE_LIMIT", "Backdating is limited to 7 days (BR-03).");
}

export function assertLoggingWindowOpen(internshipEnd: string, tz: string) {
  const today = todayInTz(tz).getTime();
  const close = new Date(internshipEnd + "T00:00:00Z").getTime() + 14 * DAY; // BR-02
  if (today > close) throw new ApiError(422, "WINDOW_CLOSED", "The logging window closed 2 weeks after the internship end date (BR-02).");
}

export function assertSubmitWindow(workDate: string, tz: string) {
  const today = todayInTz(tz).getTime();
  const wd = new Date(workDate + "T00:00:00Z").getTime();
  if (today - wd > 7 * DAY) throw new ApiError(422, "SUBMIT_WINDOW", "Entries must be submitted within 7 days of the work date (BR-01).");
}

export async function getOwnedActiveInternship(studentId: string) {
  const row = await db.query.internships.findFirst({
    where: and(eq(internships.studentId, studentId), eq(internships.status, "active")),
  });
  if (!row) throw new ApiError(409, "NO_INTERNSHIP", "Create your internship profile before logging entries.");
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
    throw new ApiError(409, "NOT_EDITABLE", "Only draft or rejected entries can be edited (FR-LOG-09/10).");
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
  if (entry.state !== "draft") throw new ApiError(409, "NOT_DELETABLE", "Only draft entries can be deleted (FR-LOG-10).");
  await db.delete(logEntries).where(eq(logEntries.id, entry.id));
}

export async function submitEntry(entry: Entry, tz: string) {
  if (entry.state !== "draft" && entry.state !== "rejected") {
    throw new ApiError(409, "NOT_SUBMITTABLE", "Only draft or rejected entries can be submitted.");
  }
  const internship = await db.query.internships.findFirst({ where: eq(internships.id, entry.internshipId) });
  assertLoggingWindowOpen(internship!.endDate, tz);   // BR-02
  assertSubmitWindow(entry.workDate, tz);             // BR-01
  const [row] = await db.update(logEntries).set({
    state: "submitted", submittedAt: new Date(), rejectReason: null, updatedAt: new Date(),
  }).where(eq(logEntries.id, entry.id)).returning();
  return row;
}

export async function listEntries(studentId: string, state?: string) {
  return db.query.logEntries.findMany({
    where: and(eq(logEntries.studentId, studentId),
      ...(state ? [eq(logEntries.state, state as Entry["state"])] : [])),
    orderBy: [desc(logEntries.workDate), desc(logEntries.createdAt)],
  });
}
