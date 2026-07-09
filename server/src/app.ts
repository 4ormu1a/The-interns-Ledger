import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { meRouter } from "./modules/me/me.routes.js";
import { internshipsRouter } from "./modules/internships/internships.routes.js";
import { entriesRouter } from "./modules/entries/entries.routes.js";
import { attachmentsRouter } from "./modules/entries/attachments.routes.js";
import { reviewRouter } from "./modules/review/review.routes.js";
import { verificationRouter } from "./modules/verification/verification.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { departmentRouter } from "./modules/department/department.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { errorHandler, notFound } from "./middleware/error.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => res.json({ data: { status: "ok", time: new Date().toISOString() } }));
  app.use(express.static("public"));
  app.use("/api/auth", authRouter);
  app.use("/api/me", meRouter);
  app.use("/api/internships", internshipsRouter);
  app.use("/api/entries/:id/attachments", attachmentsRouter);
  app.use("/api/entries", entriesRouter);
  app.use("/api/review", reviewRouter);
  app.use("/api/verify", verificationRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/department", departmentRouter);
  app.use("/api/admin", adminRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
