import { z } from "zod";

export const password = z.string().min(12, "Password must be at least 12 characters"); // FR-AUTH-07

export const registerSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().toLowerCase(),
  password,
  programme: z.string().min(2).max(120).optional(),
  studentRef: z.string().min(2).max(60).optional(),
  currentLevel: z.union([z.literal(100), z.literal(200), z.literal(300), z.literal(400)]).optional(),
  consent: z.literal(true, { errorMap: () => [{ message: "You must consent to data processing to create an account." }] as never }), // FR-AUTH-03
});

export const loginSchema = z.object({ email: z.string().email().toLowerCase(), password: z.string().min(1), role: z.enum(["student", "industry_supervisor", "department_supervisor", "admin"]).optional() });
export const verifyEmailSchema = z.object({ token: z.string().min(10) });
export const resendSchema = z.object({ email: z.string().email().toLowerCase() });
export const forgotSchema = z.object({ email: z.string().email().toLowerCase() });
export const resetSchema = z.object({ token: z.string().min(10), password });
