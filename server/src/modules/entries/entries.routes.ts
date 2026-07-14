import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { attachments, entryComments, seals, verificationTokens } from "../../db/schema/index.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { loadOwnedEntry } from "../../middleware/scope.js";
import { env } from "../../config/env.js";
import * as svc from "./entries.service.js";

const entrySchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Please choose a valid date for this entry." }),
  hours: z.number().min(0.5, { message: "Please enter how many hours you worked (minimum 0.5)." }).max(24, { message: "You can't log more than 24 hours in a single day." }),
  activity: z.string().min(10, { message: "Please write a little more about what you did (at least 10 characters)." }).max(4000),
  skills: z.array(z.string().min(1).max(60)).min(1, { message: "Please provide at least one skill (e.g., React, SQL)." }).max(12, { message: "You can only list up to 12 skills per entry." }),
  reflection: z.string().max(4000).optional(),
});

type EntryReq = Parameters<typeof loadOwnedEntry>[0] & { entry: NonNullable<Awaited<ReturnType<typeof db.query.logEntries.findFirst>>> };

export const entriesRouter = Router();
entriesRouter.use(requireAuth, requireRole("student"));

const saveLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 300, standardHeaders: true, legacyHeaders: false });
const submitLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false });

entriesRouter.post("/", submitLimiter, validate(entrySchema), async (req, res, next) => {
  try { res.status(201).json({ data: await svc.createDraft(req.user!.sub, req.body, env.APP_TIMEZONE) }); }
  catch (e) { next(e); }
});

entriesRouter.get("/", async (req, res, next) => {
  try { res.json({ data: await svc.listEntries(req.user!.sub, req.query.state as string | undefined) }); }
  catch (e) { next(e); }
});

entriesRouter.get("/:id", loadOwnedEntry, async (req, res, next) => {
  try {
    const entry = (req as EntryReq).entry;
    const [files, comments, seal, vt] = await Promise.all([
      db.query.attachments.findMany({ where: eq(attachments.entryId, entry.id) }),
      db.query.entryComments.findMany({ where: eq(entryComments.entryId, entry.id) }),
      db.query.seals.findFirst({ where: eq(seals.entryId, entry.id) }),
      db.query.verificationTokens.findFirst({ where: eq(verificationTokens.entryId, entry.id) }),
    ]);
    res.json({ data: { ...entry, attachments: files, comments,
      seal: seal ? { digest: seal.digestSha256, kid: seal.kid, sealedAt: seal.sealedAt } : null,
      verificationToken: vt && !vt.revokedAt ? vt.tokenUlid : null } });
  } catch (e) { next(e); }
});

entriesRouter.patch("/:id", saveLimiter, loadOwnedEntry, validate(entrySchema.partial()), async (req, res, next) => {
  try { res.json({ data: await svc.updateEntry((req as EntryReq).entry, req.body, env.APP_TIMEZONE) }); }
  catch (e) { next(e); }
});

entriesRouter.delete("/:id", loadOwnedEntry, async (req, res, next) => {
  try { await svc.deleteDraft((req as EntryReq).entry); res.json({ data: { deleted: true } }); }
  catch (e) { next(e); }
});

entriesRouter.post("/:id/correct", submitLimiter, loadOwnedEntry, async (req, res, next) => {
  try { res.status(201).json({ data: await svc.issueCorrection((req as EntryReq).entry, env.APP_TIMEZONE) }); }
  catch (e) { next(e); }
});

entriesRouter.post("/:id/submit", submitLimiter, loadOwnedEntry, async (req, res, next) => {
  try { res.json({ data: await svc.submitEntry((req as EntryReq).entry, env.APP_TIMEZONE) }); }
  catch (e) { next(e); }
});
