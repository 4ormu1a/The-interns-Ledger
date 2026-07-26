import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "./error.js";

export interface AccessClaims {
  sub: string;
  role: "student" | "industry_supervisor" | "department_supervisor" | "admin";
  name: string;
}

declare module "express-serve-static-core" {
  interface Request { user?: AccessClaims }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new ApiError(401, "UNAUTHENTICATED", "Missing access token");
  try {
    req.user = jwt.verify(header.slice(7), env.JWT_SECRET) as AccessClaims;
    next();
  } catch {
    throw new ApiError(401, "TOKEN_INVALID", "Access token invalid or expired");
  }
}

export const requireRole = (...roles: AccessClaims["role"][]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) throw new ApiError(403, "FORBIDDEN", "Insufficient role");
    next();
  };
