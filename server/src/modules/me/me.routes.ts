/** B8 — account settings; B6 logout lives in auth.routes. */
import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import { db } from "../../db/client.js";
import { users, refreshTokens } from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { ApiError } from "../../middleware/error.js";

const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.get("/", async (req, res, next) => {
  try {
    const u = await db.query.users.findFirst({
      where: eq(users.id, req.user!.sub),
      columns: { id: true, role: true, email: true, fullName: true, status: true, emailVerifiedAt: true, consentAt: true, createdAt: true },
    });
    res.json({ data: u });
  } catch (e) { next(e); }
});

meRouter.patch("/", validate(z.object({ fullName: z.string().min(2).max(120) })), async (req, res, next) => {
  try {
    const [u] = await db.update(users).set({ fullName: req.body.fullName, updatedAt: new Date() })
      .where(eq(users.id, req.user!.sub)).returning({ id: users.id, fullName: users.fullName });
    res.json({ data: u });
  } catch (e) { next(e); }
});

meRouter.post("/password", validate(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(12) })), async (req, res, next) => {
  try {
    const u = await db.query.users.findFirst({ where: eq(users.id, req.user!.sub) });
    if (!u || !(await verify(u.passwordHash, req.body.currentPassword))) {
      throw new ApiError(401, "BAD_CREDENTIALS", "Current password is incorrect.");
    }
    await db.update(users).set({ passwordHash: await hash(req.body.newPassword, ARGON), updatedAt: new Date() }).where(eq(users.id, u.id));
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.userId, u.id)); // sign out everywhere
    res.json({ data: { changed: true } });
  } catch (e) { next(e); }
});
