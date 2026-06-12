/** B4 — ownership/assignment scope checks (SRS §13.2). Role check alone is never enough. */
import type { NextFunction, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { internships, logEntries, assignments } from "../db/schema/index.js";
import { ApiError } from "./error.js";

/** Loads the internship and asserts the caller owns it (student) or is admin. */
export async function loadOwnedInternship(req: Request, _res: Response, next: NextFunction) {
  try {
    const row = await db.query.internships.findFirst({ where: eq(internships.id, req.params.id) });
    if (!row) throw new ApiError(404, "NOT_FOUND", "Internship not found");
    const u = req.user!;
    if (u.role !== "admin" && row.studentId !== u.sub) throw new ApiError(403, "FORBIDDEN", "Not your internship");
    (req as Request & { internship: typeof row }).internship = row;
    next();
  } catch (e) { next(e); }
}

/** Loads the entry and asserts the caller is its student owner. */
export async function loadOwnedEntry(req: Request, _res: Response, next: NextFunction) {
  try {
    const row = await db.query.logEntries.findFirst({ where: eq(logEntries.id, req.params.id) });
    if (!row) throw new ApiError(404, "NOT_FOUND", "Entry not found");
    if (row.studentId !== req.user!.sub) throw new ApiError(403, "FORBIDDEN", "Not your entry");
    (req as Request & { entry: typeof row }).entry = row;
    next();
  } catch (e) { next(e); }
}

/** True if supervisor (industry/faculty per kind) is assigned to the internship. */
export async function isAssignedSupervisor(supervisorId: string, internshipId: string, kind?: "industry" | "faculty") {
  const row = await db.query.assignments.findFirst({
    where: and(eq(assignments.supervisorId, supervisorId), eq(assignments.internshipId, internshipId),
      ...(kind ? [eq(assignments.kind, kind)] : [])),
  });
  return !!row;
}
