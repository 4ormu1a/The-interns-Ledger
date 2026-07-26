/** H1-H4 — live + sealed reports (FR-PDF-01..06, FR-INT-05). */
import { Router } from "express";
import { z } from "zod";
import { ulid } from "ulid";
import { put } from "@vercel/blob";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client.js";
import { internships, logEntries, seals, verificationTokens, reports, users, assignments, signingKeys } from "../../db/schema/index.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { ApiError } from "../../middleware/error.js";
import { env } from "../../config/env.js";
import { sha256hex, signDigest, signingAvailable } from "../../lib/crypto.js";
import { appendAudit } from "../audit/audit.service.js";
import { buildReportPdf, type ReportEntry } from "./pdf.js";

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireRole("student", "admin"));

async function collect(internshipId: string) {
  const internship = await db.query.internships.findFirst({ where: eq(internships.id, internshipId) });
  if (!internship) throw new ApiError(404, "NOT_FOUND", "We couldn't find an internship profile for your account.");
  const entries = await db.query.logEntries.findMany({
    where: and(eq(logEntries.internshipId, internshipId), eq(logEntries.state, "approved")),
    orderBy: [asc(logEntries.workDate), asc(logEntries.createdAt)],
  });
  const ids = entries.map((e) => e.id);
  const sealRows = ids.length ? await db.query.seals.findMany({ where: inArray(seals.entryId, ids) }) : [];
  const tokens = ids.length ? await db.query.verificationTokens.findMany({ where: inArray(verificationTokens.entryId, ids) }) : [];
  const student = await db.query.users.findFirst({ where: eq(users.id, internship.studentId) });
  const sup = await db.query.assignments.findFirst({
    where: and(eq(assignments.internshipId, internshipId), eq(assignments.isPrimaryApprover, true)),
  });
  const supervisor = sup ? await db.query.users.findFirst({ where: eq(users.id, sup.supervisorId) }) : null;
  return { internship, entries, sealRows, tokens, student, supervisor };
}

reportsRouter.post("/", validate(z.object({ type: z.enum(["live", "sealed"]) })), async (req, res, next) => {
  try {
    const u = req.user!;
    const internship = u.role === "admin"
      ? null
      : await db.query.internships.findFirst({ where: eq(internships.studentId, u.sub) });
    if (!internship) throw new ApiError(409, "NO_INTERNSHIP", "We couldn't find an internship profile for your account.");
    const { entries, sealRows, tokens, student, supervisor } = await collect(internship.id);
    if (req.body.type === "sealed" && entries.length === 0) {
      throw new ApiError(409, "NO_APPROVED_ENTRIES", "You need at least one approved entry before you can generate a sealed report.");
    }
    const sealBy = new Map(sealRows.map((s) => [s.entryId, s]));
    const tokenBy = new Map(tokens.filter((t) => !t.revokedAt).map((t) => [t.entryId, t.tokenUlid]));
    const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);
    const reportEntries: ReportEntry[] = entries.map((e) => ({
      workDate: e.workDate, hours: String(e.hours), activity: e.activity, skills: e.skills,
      version: e.version, digest: sealBy.get(e.id)?.digestSha256 ?? "", token: tokenBy.get(e.id) ?? null,
    }));

    let aggregateHash: string | undefined, aggregateSignature: string | undefined, reportToken: string | undefined;
    if (req.body.type === "sealed") {
      if (!signingAvailable()) {
        console.error("Signing service unavailable.");
        throw new ApiError(503, "SIGNING_UNAVAILABLE", "We couldn't complete this right now. Please try again shortly, or contact your administrator if it continues.");
      }
      const key = await db.query.signingKeys.findFirst({ where: and(eq(signingKeys.kid, env.ED25519_KID), eq(signingKeys.status, "active")) });
      if (!key) {
        console.error("Active signing key not published.");
        throw new ApiError(503, "KEY_NOT_PUBLISHED", "We couldn't complete this right now. Please try again shortly, or contact your administrator if it continues.");
      }
      aggregateHash = sha256hex(reportEntries.map((e) => e.digest).join("")); // FR-INT-05 — ordered member seals
      aggregateSignature = signDigest(aggregateHash);
      reportToken = ulid();
    }

    const pdfBytes = await buildReportPdf({
      type: req.body.type,
      studentName: student!.fullName, company: internship.company, roleTitle: internship.roleTitle,
      supervisorName: supervisor?.fullName ?? "—", requiredHours: internship.requiredHours,
      totalHours, entryCount: entries.length,
      percent: Math.min(100, Math.round((totalHours / internship.requiredHours) * 100)),
      entries: reportEntries, aggregateHash, reportToken, kid: req.body.type === "sealed" ? env.ED25519_KID : undefined,
      generatedAt: new Date(), verifyBaseUrl: env.CLIENT_ORIGIN,
    });
    let blobUrl = "";
    if (env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`reports/${internship.id}/${crypto.randomUUID()}-${req.body.type}.pdf`, Buffer.from(pdfBytes), {
        access: "public", contentType: "application/pdf", token: env.BLOB_READ_WRITE_TOKEN,
      });
      blobUrl = blob.url;
    } else {
      const fs = await import("fs");
      const path = await import("path");
      const dir = path.join(process.cwd(), "public", "reports", internship.id);
      fs.mkdirSync(dir, { recursive: true });
      const filename = `${crypto.randomUUID()}-${req.body.type}.pdf`;
      fs.writeFileSync(path.join(dir, filename), pdfBytes);
      blobUrl = `http://localhost:3000/reports/${internship.id}/${filename}`; // served locally via static middleware
    }

    const [row] = await db.insert(reports).values({
      internshipId: internship.id, type: req.body.type,
      snapshot: req.body.type === "sealed" ? { memberDigests: reportEntries.map((e) => e.digest) } : null,
      aggregateSha256: aggregateHash ?? null, aggregateSignature: aggregateSignature ?? null,
      kid: req.body.type === "sealed" ? env.ED25519_KID : null, pdfBlobUrl: blobUrl,
    }).returning();
    if (reportToken) {
      await db.insert(verificationTokens).values({ tokenUlid: reportToken, scope: "report", reportId: row.id });
    }
    await appendAudit({ actorId: u.sub, action: `report.generate.${req.body.type}`, targetType: "report", targetId: row.id,
      metadata: { entries: entries.length, aggregateHash } });
    res.status(201).json({ data: { ...row, verificationToken: reportToken ?? null } });
  } catch (e) { next(e); }
});

reportsRouter.get("/", async (req, res, next) => {
  try {
    const internship = await db.query.internships.findFirst({ where: eq(internships.studentId, req.user!.sub) });
    if (!internship) return res.json({ data: [] });
    const rows = await db.query.reports.findMany({ where: eq(reports.internshipId, internship.id) });
    const tokens = await db.query.verificationTokens.findMany({ where: eq(verificationTokens.scope, "report") });
    const tokenBy = new Map(tokens.filter((t) => !t.revokedAt).map((t) => [t.reportId, t.tokenUlid]));
    res.json({ data: rows.map((r) => ({ ...r, verificationToken: tokenBy.get(r.id) ?? null })) });
  } catch (e) { next(e); }
});
