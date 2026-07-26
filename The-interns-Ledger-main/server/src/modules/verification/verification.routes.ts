/** F1-F6 — public verification (UC-08). No login. Uniform negative responses (anti-enumeration,
 *  NFR-SEC-05): invalid and non-existent tokens return the exact same shape and status code. */
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { verificationTokens, seals, logEntries, users, internships, signingKeys, reports } from "../../db/schema/index.js";
import { canonicalStringify } from "../../lib/canonical.js";
import { sha256hex, verifyDigest } from "../../lib/crypto.js";
import { env } from "../../config/env.js";

export const verificationRouter = Router();
verificationRouter.use(rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }));

const cannotVerify = () => ({
  status: "cannot_verify" as const,
  message: "We couldn't find a record for this code. It may be invalid.",
  institution: env.INSTITUTION_NAME,
});

verificationRouter.get("/:token", async (req, res, next) => {
  try {
    const token = req.params.token.trim().toUpperCase();
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(token)) return res.json({ data: cannotVerify() }); // ULID shape; uniform response

    const vt = await db.query.verificationTokens.findFirst({ where: eq(verificationTokens.tokenUlid, token) });
    if (!vt) return res.json({ data: cannotVerify() });

    // ── report-scope verification (FR-QR-07 / FR-INT-05) ──
    if (vt.scope === "report" && vt.reportId) {
      if (vt.revokedAt) return res.json({ data: { status: "revoked", institution: env.INSTITUTION_NAME,
        message: "This report has been revoked by the institution, so we can no longer confirm it is authentic.", revokedAt: vt.revokedAt, reason: vt.revokeReason ?? undefined } });
      const report = await db.query.reports.findFirst({ where: eq(reports.id, vt.reportId) });
      if (!report || report.type !== "sealed" || !report.aggregateSha256) return res.json({ data: cannotVerify() });
      const internshipR = await db.query.internships.findFirst({ where: eq(internships.id, report.internshipId) });
      const studentR = internshipR ? await db.query.users.findFirst({ where: eq(users.id, internshipR.studentId) }) : null;
      const keyR = await db.query.signingKeys.findFirst({ where: eq(signingKeys.kid, report.kid!) });
      const digests = (report.snapshot as { memberDigests?: string[] } | null)?.memberDigests ?? [];
      const recomputed = sha256hex(digests.join(""));
      const sigOk = keyR ? verifyDigest(report.aggregateSha256, report.aggregateSignature!, keyR.publicKey) : false;
      if (!keyR || keyR.status === "revoked" || recomputed !== report.aggregateSha256 || !sigOk) {
        return res.json({ data: { status: "not_authentic", institution: env.INSTITUTION_NAME,
          message: "This report failed its security check. Its contents do not match its digital fingerprint, meaning it may have been altered." } });
      }
      return res.json({ data: {
        status: "authentic", scope: "report", institution: env.INSTITUTION_NAME,
        studentName: studentR?.fullName, company: internshipR?.company,
        entryCount: digests.length, sealedAt: report.createdAt,
        digest: report.aggregateSha256, kid: report.kid, publicKey: keyR.publicKey,
        signature: report.aggregateSignature, disclosure: "minimal",
      } });
    }

    if (vt.scope !== "entry" || !vt.entryId) return res.json({ data: cannotVerify() });

    if (vt.revokedAt) {
      return res.json({ data: {
        status: "revoked", institution: env.INSTITUTION_NAME,
        message: "This record has been revoked by the institution, so we can no longer confirm it is authentic.",
        revokedAt: vt.revokedAt, reason: vt.revokeReason ?? undefined,
      } });
    }

    const seal = await db.query.seals.findFirst({ where: eq(seals.entryId, vt.entryId) });
    const entry = await db.query.logEntries.findFirst({ where: eq(logEntries.id, vt.entryId) });
    if (!seal || !entry) return res.json({ data: cannotVerify() });

    const student = await db.query.users.findFirst({ where: eq(users.id, entry.studentId) });
    const approver = await db.query.users.findFirst({ where: eq(users.id, seal.sealedBy) });
    const internship = await db.query.internships.findFirst({ where: eq(internships.id, entry.internshipId) });

    // crypto-shredded record (FR-ADM-07 / §13.5)
    if (student?.erasedAt) {
      return res.json({ data: {
        status: "erased", institution: env.INSTITUTION_NAME,
        message: "This record existed and was authentic, but its personal details were erased at the user's request.",
        sealedAt: seal.sealedAt, digest: seal.digestSha256, kid: seal.kid,
      } });
    }

    // recompute + verify against the PUBLISHED key for the recorded kid (FR-INT-04)
    const key = await db.query.signingKeys.findFirst({ where: eq(signingKeys.kid, seal.kid) });
    const keyRevoked = key?.status === "revoked";
    const digestMatches = sha256hex(canonicalStringify(seal.canonicalPayload)) === seal.digestSha256;
    const signatureValid = key ? verifyDigest(seal.digestSha256, seal.signatureEd25519, key.publicKey) : false;

    if (!key || keyRevoked || !digestMatches || !signatureValid) {
      return res.json({ data: {
        status: "not_authentic", institution: env.INSTITUTION_NAME,
        message: keyRevoked
          ? "The security key used to seal this record has been revoked by the institution."
          : "This record failed its security check. Its contents do not match its digital fingerprint, meaning it may have been altered.",
      } });
    }

    // minimal disclosure by default (FR-QR-04); full content only on student opt-in (FR-QR-05)
    const base = {
      status: "authentic" as const,
      institution: env.INSTITUTION_NAME,
      studentName: student?.fullName,
      approverName: approver?.fullName,
      company: internship?.company,
      workDate: entry.workDate,
      version: entry.version,
      superseded: entry.state === "superseded",
      sealedAt: seal.sealedAt,
      digest: seal.digestSha256,
      kid: seal.kid,
      publicKey: key.publicKey, // published so anyone can re-verify independently
      signature: seal.signatureEd25519,
    };
    if (vt.disclosure === "full") {
      return res.json({ data: { ...base, disclosure: "full", activity: entry.activity, hours: String(entry.hours), skills: entry.skills } });
    }
    res.json({ data: { ...base, disclosure: "minimal" } });
  } catch (e) { next(e); }
});
