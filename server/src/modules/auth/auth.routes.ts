import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../../middleware/validate.js";
import { env } from "../../config/env.js";
import * as s from "./auth.schemas.js";
import * as svc from "./auth.service.js";

const REFRESH_COOKIE = "il_refresh";
const cookieOpts = {
  httpOnly: true, sameSite: "lax" as const, secure: env.NODE_ENV === "production",
  path: "/api/auth", maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
};

const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false });

export const authRouter = Router();
authRouter.use(authLimiter);

authRouter.post("/register", validate(s.registerSchema), async (req, res, next) => {
  try {
    const data = await svc.register(req.body);
    res.status(201).json({ data: { ...data, message: "Check your inbox to verify your email." } });
  } catch (e) { next(e); }
});

authRouter.post("/verify-email", validate(s.verifyEmailSchema), async (req, res, next) => {
  try { await svc.verifyEmail(req.body.token); res.json({ data: { verified: true } }); } catch (e) { next(e); }
});

authRouter.post("/resend-verification", validate(s.resendSchema), async (req, res, next) => {
  try { await svc.resendVerification(req.body.email); res.json({ data: { sent: true } }); } catch (e) { next(e); }
});

authRouter.post("/login", validate(s.loginSchema), async (req, res, next) => {
  try {
    const { access, refresh, user } = await svc.login(req.body.email, req.body.password);
    res.cookie(REFRESH_COOKIE, refresh, cookieOpts);
    res.json({ data: { accessToken: access, user } });
  } catch (e) { next(e); }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const { access, refresh, user } = await svc.rotateRefresh(req.cookies?.[REFRESH_COOKIE]);
    res.cookie(REFRESH_COOKIE, refresh, cookieOpts);
    res.json({ data: { accessToken: access, user } });
  } catch (e) { next(e); }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    await svc.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    res.json({ data: { loggedOut: true } });
  } catch (e) { next(e); }
});

authRouter.post("/forgot", validate(s.forgotSchema), async (req, res, next) => {
  try { await svc.forgotPassword(req.body.email); res.json({ data: { sent: true } }); } catch (e) { next(e); }
});

authRouter.post("/reset", validate(s.resetSchema), async (req, res, next) => {
  try { await svc.resetPassword(req.body.token, req.body.password); res.json({ data: { reset: true } }); } catch (e) { next(e); }
});
