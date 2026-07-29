import { and, eq, gt, isNull } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import jwt from "jsonwebtoken";
import { db } from "../../db/client.js";
import { users, emailTokens, refreshTokens, loginAttempts, invitations, assignments, notifications, departments } from "../../db/schema/index.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../middleware/error.js";
import { newOpaqueToken, sha256hex } from "../../lib/tokens.js";
import { sendVerificationEmail, sendResetEmail } from "../../lib/email.js";

const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 }; // argon2id defaults per OWASP
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

const domainOf = (email: string) => email.split("@")[1] ?? "";

export async function register(input: { fullName: string; email: string; password: string; consent: true; programme?: string; studentRef?: string; currentLevel?: number }) {
  // FR-AUTH-01 — institution domain gate
  if (domainOf(input.email) !== env.INSTITUTION_EMAIL_DOMAIN) {
    throw new ApiError(422, "DOMAIN_NOT_ALLOWED",
      `Registration is limited to ${env.INSTITUTION_NAME} student emails (@${env.INSTITUTION_EMAIL_DOMAIN}).`);
  }
  const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existing) throw new ApiError(409, "EMAIL_TAKEN", "This email is already registered. Try signing in instead.");

  let departmentId: string | undefined;
  if (input.programme) {
    let dept = await db.query.departments.findFirst({ where: eq(departments.name, input.programme) });
    if (!dept) {
      const [newDept] = await db.insert(departments).values({ name: input.programme }).returning();
      dept = newDept;
    }
    departmentId = dept.id;
  }

  const passwordHash = await hash(input.password, ARGON);
  const [user] = await db.insert(users).values({
    role: "student",
    email: input.email,
    passwordHash,
    fullName: input.fullName,
    indexNumber: input.studentRef,
    currentLevel: input.currentLevel,
    departmentId,
    status: "pending",
    consentAt: new Date(), // FR-AUTH-03
  }).returning();

  await issueEmailToken(user.id, "verify", 24 * 60, (t) => sendVerificationEmail(user.email, t));
  return { id: user.id, email: user.email };
}

async function issueEmailToken(userId: string, purpose: "verify" | "reset", ttlMinutes: number, send: (token: string) => Promise<void>) {
  const token = newOpaqueToken();
  await db.insert(emailTokens).values({
    userId, purpose, tokenHash: sha256hex(token),
    expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
  });
  await send(token);
}

export async function verifyEmail(token: string) {
  const row = await db.query.emailTokens.findFirst({
    where: and(eq(emailTokens.tokenHash, sha256hex(token)), eq(emailTokens.purpose, "verify"),
      isNull(emailTokens.usedAt), gt(emailTokens.expiresAt, new Date())),
  });
  if (!row) throw new ApiError(400, "TOKEN_INVALID", "This verification link has expired or isn't valid. You might need to request a new one.");
  await db.update(emailTokens).set({ usedAt: new Date() }).where(eq(emailTokens.id, row.id));
  await db.update(users).set({ status: "active", emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, row.userId)); // FR-AUTH-02
}

export async function resendVerification(email: string) {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (user && user.status === "pending") {
    await issueEmailToken(user.id, "verify", 24 * 60, (t) => sendVerificationEmail(user.email, t));
  } // uniform response either way — no account enumeration
}

export async function login(email: string, plain: string) {
  // FR-AUTH-08 — lockout
  const attempt = await db.query.loginAttempts.findFirst({ where: eq(loginAttempts.email, email) });
  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    throw new ApiError(429, "LOCKED", "You've tried too many times. Please wait a bit before trying again.");
  }
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  const ok = user ? await verify(user.passwordHash, plain) : false;
  if (!user || !ok) {
    await recordFailure(email);
    throw new ApiError(401, "BAD_CREDENTIALS", "We couldn't sign you in. Please check your email and password.");
  }
  if (user.status === "pending") {
    if (user.role === "student") throw new ApiError(403, "EMAIL_UNVERIFIED", "Please verify your email address before signing in.");
    throw new ApiError(403, "PENDING_VERIFICATION", "Your account is still waiting for administrator approval.");
  }
  if (user.status === "deactivated") throw new ApiError(403, "DEACTIVATED", "Your account has been deactivated. Please contact your administrator.");
  await db.delete(loginAttempts).where(eq(loginAttempts.email, email));
  return issueSession(user.id, user.role, user.fullName);
}

async function recordFailure(email: string) {
  const existing = await db.query.loginAttempts.findFirst({ where: eq(loginAttempts.email, email) });
  const failed = (existing?.failedCount ?? 0) + 1;
  const lockedUntil = failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null;
  if (existing) {
    await db.update(loginAttempts).set({ failedCount: failed, lockedUntil, updatedAt: new Date() })
      .where(eq(loginAttempts.email, email));
  } else {
    await db.insert(loginAttempts).values({ email, failedCount: failed, lockedUntil });
  }
}

export async function acceptInvite(token: string, fullName: string, plain: string) {
  const tokenHash = sha256hex(token);
  const invite = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.tokenHash, tokenHash),
      isNull(invitations.acceptedAt),
      gt(invitations.expiresAt, new Date())
    )
  });

  if (!invite) {
    throw new ApiError(400, "INVALID_INVITE", "This invitation link has expired or isn't valid.");
  }

  // Find existing user or create a new one
  let user = await db.query.users.findFirst({ where: eq(users.email, invite.email) });
  
  if (!user) {
    const passwordHash = await hash(plain, ARGON);
    const [newUser] = await db.insert(users).values({
      role: invite.role,
      email: invite.email,
      passwordHash,
      fullName,
      status: "pending", // FR-ADM-06: Supervisors must be verified by admin
      emailVerifiedAt: new Date(),
      consentAt: new Date(),
    }).returning();
    user = newUser;
  } else {
    // If they already exist but as a student, we can't let them be a supervisor
    if (user.role === "student") {
      throw new ApiError(409, "ROLE_CONFLICT", "This email is already registered as a student account.");
    }
  }

  // Create the assignment
  if (invite.role === "industry_supervisor") {
    await db.insert(assignments).values({
      internshipId: invite.internshipId,
      supervisorId: user.id,
      kind: "industry",
      isPrimaryApprover: true // For now, assume they are primary
    });
  }

  // Mark invite as accepted
  await db.update(invitations)
    .set({ acceptedAt: new Date() })
    .where(eq(invitations.id, invite.id));

  // Notify the student that their supervisor accepted
  await db.insert(notifications).values({
    recipientId: invite.inviterId,
    type: "supervisor.accepted",
    payload: { supervisorName: user.fullName }
  });

  // Login
  return issueSession(user.id, user.role, user.fullName);
}

async function issueSession(userId: string, role: string, name: string) {
  const access = jwt.sign({ sub: userId, role, name }, env.JWT_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL } as jwt.SignOptions);
  const refresh = newOpaqueToken();
  await db.insert(refreshTokens).values({
    userId, tokenHash: sha256hex(refresh),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
  });
  return { access, refresh, user: { id: userId, role, name } };
}

export async function rotateRefresh(presented: string | undefined) {
  if (!presented) throw new ApiError(401, "REFRESH_INVALID", "You've been logged out for security. Please log back in to continue.");
  const row = await db.query.refreshTokens.findFirst({
    where: and(eq(refreshTokens.tokenHash, sha256hex(presented)), isNull(refreshTokens.revokedAt),
      gt(refreshTokens.expiresAt, new Date())),
  });
  if (!row) throw new ApiError(401, "REFRESH_INVALID", "You've been logged out for security. Please log back in to continue.");
  const user = await db.query.users.findFirst({ where: eq(users.id, row.userId) });
  if (!user || user.status !== "active") throw new ApiError(401, "REFRESH_INVALID", "You've been logged out for security. Please log back in to continue.");
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, row.id)); // rotation
  return issueSession(user.id, user.role, user.fullName);
}

export async function logout(presented: string | undefined) {
  if (!presented) return;
  await db.update(refreshTokens).set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, sha256hex(presented))); // FR-AUTH-09
}

export async function forgotPassword(email: string) {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (user && user.status !== "deactivated") {
    await issueEmailToken(user.id, "reset", 30, (t) => sendResetEmail(user.email, t));
  } // uniform response
}

export async function resetPassword(token: string, newPassword: string) {
  const row = await db.query.emailTokens.findFirst({
    where: and(eq(emailTokens.tokenHash, sha256hex(token)), eq(emailTokens.purpose, "reset"),
      isNull(emailTokens.usedAt), gt(emailTokens.expiresAt, new Date())),
  });
  if (!row) throw new ApiError(400, "TOKEN_INVALID", "This reset link has expired or isn't valid. Please request a new one.");
  const passwordHash = await hash(newPassword, ARGON);
  await db.update(emailTokens).set({ usedAt: new Date() }).where(eq(emailTokens.id, row.id));
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, row.userId));
  // revoke all sessions for safety
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.userId, row.userId));
}
