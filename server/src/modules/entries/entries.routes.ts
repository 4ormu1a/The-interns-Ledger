import { Router } from "express";
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
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Please provide a valid date." }),
  hours: z.number().min(0.5, { message: "Hours must be at least 0.5." }).max(24, { message: "Hours cannot exceed 24." }),
  activity: z.string().min(10, { message: "Activity description must be at least 10 characters long." }).max(4000),
  skills: z.array(z.string().min(1).max(60)).min(1, { message: "Please provide at least one skill (e.g. React, SQL)." }).max(12, { message: "You can specify a maximum of 12 skills." }),
  reflection: z.string().max(4000).optional(),
});

type EntryReq = Parameters<typeof loadOwnedEntry>[0] & { entry: NonNullable<Awaited<ReturnType<typeof db.query.logEntries.findFirst>>> };

export const entriesRouter = Router();
entriesRouter.use(requireAuth, requireRole("student"));

entriesRouter.post("/", validate(entrySchema), async (req, res, next) => {
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

entriesRouter.patch("/:id", loadOwnedEntry, validate(entrySchema.partial()), async (req, res, next) => {
  try { res.json({ data: await svc.updateEntry((req as EntryReq).entry, req.body, env.APP_TIMEZONE) }); }
  catch (e) { next(e); }
});

entriesRouter.delete("/:id", loadOwnedEntry, async (req, res, next) => {
  try { await svc.deleteDraft((req as EntryReq).entry); res.json({ data: { deleted: true } }); }
  catch (e) { next(e); }
});

entriesRouter.post("/:id/correct", loadOwnedEntry, async (req, res, next) => {
  try { res.status(201).json({ data: await svc.issueCorrection((req as EntryReq).entry, env.APP_TIMEZONE) }); }
  catch (e) { next(e); }
});

entriesRouter.post("/:id/submit", loadOwnedEntry, async (req, res, next) => {
  try { res.json({ data: await svc.submitEntry((req as EntryReq).entry, env.APP_TIMEZONE) }); }
  catch (e) { next(e); }
});
