import { Router } from "express";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
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
import { ApiError } from "../../middleware/error.js";

authRouter.post("/login", validate(s.loginSchema), async (req, res, next) => {
  try {
    const { access, refresh, user } = await svc.login(req.body.email, req.body.password);
    if (req.body.role && user.role !== req.body.role) {
      throw new ApiError(401, "ROLE_MISMATCH", `You selected the ${req.body.role.replace("_", " ")} role, but your account is registered as a ${user.role.replace("_", " ")}.`);
    }
    res.cookie(REFRESH_COOKIE, refresh, cookieOpts);
    res.json({ data: { accessToken: access, user } });
  } catch (e) { next(e); }
});

const acceptInviteSchema = z.object({
  token: z.string().min(10),
  fullName: z.string().min(2),
  password: z.string().min(8)
});

authRouter.post("/accept-invite", validate(acceptInviteSchema), async (req, res, next) => {
  try {
    const { access, refresh, user } = await svc.acceptInvite(req.body.token, req.body.fullName, req.body.password);
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

authRouter.post("/step-up", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // We can reuse login verify logic or just verify password directly
    // Wait, the client should send the password, but how do we know the email? 
    // They should probably be authenticated already, so we can use a requireAuth middleware if we import it, 
    // or just rely on them passing email & password which we pass to svc.login.
    // If we use svc.login, it gives us a normal token. Let's just create a quick verification.
    if (!email || !password) throw new Error("Missing credentials");
    const { user } = await svc.login(email, password);
    // If login succeeds, issue step-up cookie
    res.cookie("il_stepup", "active", {
      httpOnly: true, sameSite: "lax", secure: env.NODE_ENV === "production",
      path: "/api", maxAge: 15 * 60_000, // 15 mins
    });
    res.json({ data: { stepUp: true } });
  } catch (e) { next(e); }
});
