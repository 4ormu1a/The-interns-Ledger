import { z } from "zod";

// Load .env in local dev (Node 21+ built-in); on Vercel, env vars are injected directly.
try { process.loadEnvFile(); } catch { /* no .env file — fine in production */ }

const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  INSTITUTION_EMAIL_DOMAIN: z.string().min(3),
  INSTITUTION_NAME: z.string().min(1),
  APP_TIMEZONE: z.string().default("Africa/Accra"),
  CLIENT_ORIGIN: z.string().url(),
  RESEND_API_KEY: z.string().optional().default(""),
  BLOB_READ_WRITE_TOKEN: z.string().optional().default(""),
  ED25519_PRIVATE_KEY: z.string().optional().default(""), // PKCS8 PEM, env-injected (NFR-SEC-04)
  ED25519_KID: z.string().default("UMAT-K1"),
  EMAIL_FROM: z.string().default("Interns Ledger <onboarding@resend.dev>"),
});

export const env = Env.parse(process.env);
