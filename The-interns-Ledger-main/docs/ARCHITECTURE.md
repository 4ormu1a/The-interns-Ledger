# Interns Ledger — Architecture & Design (Gate B package)

**Date:** 2026-06-11 · **Status:** PROPOSED — awaiting Gate B approval
**Inputs:** REQUIREMENTS-ANALYSIS.md (Gate A approved), SRS, backlog v2, 38 prototype pages, design system.

---

## [Backend Dev] §1. Deployment topology

```
┌─ GitHub repo (monorepo) ─────────────────────────────┐
│  /client  → Vercel project 1: static React build     │
│  /server  → Vercel project 2: Express as serverless  │
└──────────────────────────────────────────────────────┘
            │                          │
   interns-ledger.vercel.app   interns-ledger-api.vercel.app
                                       │
                     Neon Postgres ────┤  (pooled driver)
                     Vercel Blob ──────┤  (attachments, PDFs)
                     Resend ───────────┘  (email)
```

- **One repo, two Vercel projects** (free Hobby tier). The whole Express app is exported through a single serverless entry (`server/api/index.ts`), so routing stays plain Express — no per-route function sprawl, easy local dev with `node`.
- **Local dev parity:** `docker-compose.yml` runs Postgres locally (keeps SRS NFR-MNT-01 demonstrable); client and server run as normal Node processes.
- **Secrets:** all config via env vars (NFR-MNT-02): `DATABASE_URL`, `JWT_SECRET`, `ED25519_PRIVATE_KEY` (PEM, env-injected per SRS §13.3 PoC allowance), `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `INSTITUTION_EMAIL_DOMAIN=st.umat.edu.gh`, `INSTITUTION_NAME=University of Mines and Technology`, `APP_TIMEZONE=Africa/Accra` (BR-14). `.env.example` committed; secrets never committed.

## [Backend Dev] §2. Backend stack & layering

| Concern | Choice | Why (cost/serverless constrained) |
|---|---|---|
| Language | TypeScript (both ends) | Shared API types client↔server; SRS already assumed TS |
| Framework | Express 4 on Node 20 | Master prompt mandate; wraps cleanly for Vercel |
| ORM/migrations | **Drizzle ORM + drizzle-kit** | Lightweight, SQL-first migrations, excellent Neon serverless support; no Prisma engine cold-start cost |
| Validation | Zod | Shared schemas with the frontend |
| Auth | jsonwebtoken (access 15 min) + rotating refresh token in httpOnly cookie (7 d, hashed in DB) | SRS §13.1 |
| Password hashing | argon2id (`argon2`) | FR-AUTH-07 |
| Crypto | `node:crypto` (native Ed25519 sign/verify, SHA-256) | Zero deps, FIPS-aligned |
| Canonicalisation | RFC 8785-style stable JSON stringify | Reproducible digests (SRS §12.3) |
| Tokens | `ulid` for verification tokens | FR-QR-01 |
| QR | `qrcode` | FR-QR-02 |
| PDF | `pdf-lib` (server-side) | Approved at Gate A |
| Email | Resend SDK | Approved at Gate A |
| Rate limiting | `express-rate-limit` + per-account lockout counter in DB | FR-AUTH-08 (serverless-safe: DB-backed, not in-memory) |

**Layering (SRS-aligned, master prompt §8):** `routes → controllers → services → repositories (Drizzle)` with cross-cutting `middleware/` (auth, rbac+scope, validate, error envelope, audit) and `lib/` (crypto, canonical, email, blob, pdf, qr).

```
server/
  api/index.ts            # Vercel entry → exports the Express app
  src/
    app.ts                # express wiring, security headers, cors
    config/               # env parsing (zod-validated)
    db/  schema/ migrations/ seed.ts
    middleware/  auth.ts rbac.ts validate.ts error.ts audit.ts rateLimit.ts
    modules/              # one folder per domain = routes+controller+service+repo
      auth/ users/ internships/ entries/ review/ seals/
      verification/ reports/ assessments/ admin/ audit/ notifications/
    lib/  crypto.ts canonical.ts email.ts blob.ts pdf.ts qr.ts
  drizzle.config.ts
  .env.example
```

## [Backend Dev] §3. Database schema (PostgreSQL / Neon)

All tables carry `id uuid pk default gen_random_uuid()`, `created_at/updated_at timestamptz`, and reserved `tenant_id uuid null` (SRS §19, unused in v1).

| Table | Key columns (beyond ids/timestamps) |
|---|---|
| `users` | role enum(student/industry_supervisor/faculty_supervisor/admin), email unique, password_hash, full_name, status enum(pending/active/deactivated), email_verified_at, consent_at (FR-AUTH-03), erased_at |
| `email_tokens` | user_id, purpose enum(verify/reset), token_hash, expires_at, used_at (single-use) |
| `refresh_tokens` | user_id, token_hash, expires_at, rotated_from, revoked_at |
| `login_attempts` | user_id/email, failed_count, locked_until (FR-AUTH-08) |
| `internships` | student_id, company, location, role_title, start_date, end_date, required_hours, required_weeks, status enum(active/window_closed/archived) |
| `assignments` | internship_id, supervisor_id, kind enum(industry/faculty), is_primary_approver bool — partial unique index: one primary approver per internship (BR-05); supervisor may be an admin (BR-12) |
| `log_entries` | internship_id, student_id, version int default 1, supersedes_id fk→log_entries (FR-LOG-13), state enum(draft/submitted/approved/rejected/superseded/expired), work_date, hours numeric, activity text, reflection text, skills text[], submitted_at, decided_at, decided_by, reject_reason |
| `entry_comments` | entry_id, author_id, body (FR-SUP-05) |
| `attachments` | entry_id, blob_url, filename, mime, size, sha256 (FR-INT-01), deleted_at (crypto-shred) |
| `seals` | entry_id unique, canonical_payload jsonb, digest_sha256, signature_ed25519, kid fk→signing_keys.kid, sealed_at, sealed_by |
| `signing_keys` | kid unique, public_key (published), status enum(active/retired/revoked), activated_at, retired_at — private key never stored (NFR-SEC-04) |
| `reports` | internship_id, type enum(live/sealed), snapshot jsonb (sealed: ordered member seal digests), aggregate_sha256, aggregate_signature, kid, pdf_blob_url |
| `verification_tokens` | token_ulid unique, scope enum(entry/report), entry_id/report_id, disclosure enum(minimal/full) (FR-QR-05), revoked_at, revoke_reason (FR-QR-06) |
| `assessments` | internship_id, faculty_id, grade, comments, type enum(midterm/final) |
| `audit_log` | seq bigserial, actor_id, action, target_type, target_id, metadata jsonb, prev_hash, hash — **hash-chained** (FR-AUD-02) |
| `notifications` | recipient_id, type, payload jsonb, read_at, emailed_at |

**Audit-chain concurrency on serverless:** each insert runs inside a transaction holding `pg_advisory_xact_lock(hashtext('audit_log'))`, reads the last row's hash, computes `hash = sha256(prev_hash ‖ canonical(record))`. Serialised, tamper-evident, validated by an admin "verify chain" job (AC-11).

**Entry state machine enforced in `entries.service`:** draft→submitted (window checks BR-01/02/03), submitted→approved|rejected, approved→superseded (only via correction approval), any unresolved → expired at window close (computed lazily, no cron needed).

## [Backend Dev] §4. API contract (v1)

Base: `https://…-api.vercel.app/api`. JSON only; timestamps ISO-8601 with `+00:00`/Accra offset. **Envelope:** success `{ "data": … }`; error `{ "error": { "code", "message", "details?" } }` with standard HTTP codes. Auth: `Authorization: Bearer <access>`; refresh via httpOnly cookie. All state-changing routes audited.

| # | Method & path | Auth (role+scope) | Purpose |
|---|---|---|---|
| 1 | POST `/auth/register` | public | Student self-reg; domain-gated (FR-AUTH-01); consent required |
| 2 | POST `/auth/verify-email` | public | One-time token (FR-AUTH-02) |
| 3 | POST `/auth/resend-verification` | public | Cooldown-limited |
| 4 | POST `/auth/login` | public | Issues access + refresh; lockout (FR-AUTH-08) |
| 5 | POST `/auth/refresh` | refresh cookie | Rotates pair |
| 6 | POST `/auth/logout` | bearer | Revokes refresh (FR-AUTH-09) |
| 7 | POST `/auth/forgot` / POST `/auth/reset` | public | Time-limited single-use link (FR-AUTH-10) |
| 8 | GET/PATCH `/me` · POST `/me/password` | any | Account settings (B8) |
| 9 | GET `/me/notifications` · POST `/me/notifications/:id/read` | any | In-app feed |
| 10 | POST/GET/PATCH `/internships` | student(own) | FR-LOG-01; admin may create (FR-ADM-02) |
| 11 | GET `/internships/:id/progress` | student(own)/sup(assigned)/faculty(assigned)/admin | Approved-only totals (BR-09) |
| 12 | POST `/entries` · GET `/entries?state=` · GET `/entries/:id` | student(own) | Draft create/list/detail |
| 13 | PATCH `/entries/:id` · DELETE `/entries/:id` | student(own) | Draft/rejected edit; draft delete only (FR-LOG-10) |
| 14 | POST `/entries/:id/submit` | student(own) | Window-checked (BR-01/02/03) |
| 15 | POST `/entries/:id/correct` | student(own) | New draft version w/ supersedes (FR-LOG-13) |
| 16 | POST `/entries/:id/attachments` · DELETE same | student(own, draft/rejected) | Upload→Blob, sha256 stored |
| 17 | GET `/review/queue` | industry sup/admin-as-sup (assigned) | FR-SUP-01 |
| 18 | POST `/entries/:id/approve` | designated approver | Seal: canonicalise→SHA-256→Ed25519(kid)→token (UC-04) |
| 19 | POST `/entries/:id/reject` | designated approver | Mandatory reason (BR-06) |
| 20 | POST `/entries/:id/comments` | reviewer | FR-SUP-05 |
| 21 | GET `/review/students` · GET `/review/students/:id` · GET `/review/history` | sup (assigned) | E6 |
| 22 | GET `/faculty/students` · `/faculty/students/:id/logbook` | faculty (assigned, read-only) | FR-FAC-01 |
| 23 | POST/GET `/assessments` | faculty (assigned) | FR-FAC-02 |
| 24 | POST `/reports` (type live|sealed) · GET `/reports` · GET `/reports/:id` (+pdf url) | student(own)/admin | FR-PDF-* |
| 25 | PATCH `/verification-tokens/:id/disclosure` | student(own) | Opt-in full disclosure (FR-QR-05) |
| 26 | GET `/verify/:token` | **public** | Uniform negative; recompute digest + verify sig; authentic/not/revoked/erased (UC-08) |
| 27 | GET/POST/PATCH `/admin/users` | admin | FR-ADM-01; provision sup/faculty/admin (FR-AUTH-04) |
| 28 | GET/POST/PATCH `/admin/assignments` · POST `/admin/assignments/reassign` | admin | FR-ADM-02/03/04 |
| 29 | GET/POST `/admin/keys` · POST `/admin/keys/:kid/retire|revoke` | admin | FR-ADM-06 |
| 30 | POST `/admin/tokens/:token/revoke` | admin | FR-QR-06 |
| 31 | GET `/admin/audit?actor&action&from&to` · POST `/admin/audit/verify-chain` | admin | FR-AUD-03, AC-11 |
| 32 | POST `/admin/erasure` · POST `/admin/export` | admin | Crypto-shred / portable export (FR-ADM-07, §13.5) |
| 33 | GET `/admin/overview` | admin | Dashboard stats (FR-ADM-05) |
| 34 | GET `/health` | public | NFR-MNT-03 |

Full request/response examples will be written per-endpoint into `docs/api-contract.md` as each sprint's endpoints are agreed (FE↔BE handoff artefact).

---

## [Frontend Dev] §5. Frontend stack & component plan

| Concern | Choice | Why |
|---|---|---|
| Build | Vite + React 18 + TypeScript | Fast, Vercel-native static output |
| Routing | React Router v6 | Nested layouts per portal; route guards by role |
| Server state | TanStack Query | Caching, retries, optimistic updates; no Redux needed at this scale |
| App state | Small React context (auth/session) | Only auth + UI prefs are truly global |
| Forms | react-hook-form + zod resolvers | Shares zod schemas with backend |
| Styling | **Plain CSS** — port `assets/css/main.css` tokens to `src/styles/tokens.css` + global stylesheet; CSS modules for page-specific styles | Preserves the approved design system pixel-for-pixel; no Tailwind/Material fights |
| QR display | `qrcode.react` | Report/entry QR |

```
client/src/
  api/            # typed client per module (mirrors API contract)
  components/ui/      # Button(1/3), Card, StatusPill, FormField, PasswordMeter,
                      # Modal, Toast, Tabs, Breadcrumbs, EmptyState, Spinner, QRBlock
  components/layout/  # TopBar, PortalShell (sidebar/nav per role), Footer, NoiseOverlay
  features/       # auth, entries, review, verification, reports, assessments, admin, notifications
  pages/          # public/ student/ industry/ faculty/ admin/  → 1:1 with the 38 prototypes
  hooks/  lib/  styles/  router.tsx
```

**Conversion order (design-system extraction first, per master prompt §9):** tokens → UI primitives → PortalShell/TopBar → public pages → student → industry → faculty → admin. Each page is converted against its prototype HTML as the visual source of truth; any forced divergence is flagged for approval rather than silently changed.

---

## §6. Repo, branches, integration

- **Monorepo:** `/client`, `/server`, `/design-reference` (the 38 prototype pages + assets move here, preserved verbatim), `/docs` (API contract, this file, logs), `docker-compose.yml`, root README.
- **Branches:** `main` (integrated, deployable) ← `frontend`, `backend` (long-lived, one per dev) ← `feat/*` branches for non-trivial features. Merges to `main` only at sprint integration checkpoints (Gate I), via reviewed PRs.
- **Commits:** Conventional Commits with scope, e.g. `feat(entries): enforce 7-day submission window (BR-01)`. Every commit pre-approved at Gate D.
- **Integration checkpoints:** end of each sprint = FE↔BE integration on `main` against the agreed contract; contract changes mid-sprint require an explicit handoff note in `docs/api-contract.md`.

## §7. Sprint 1 scope (unchanged from backlog)

A1 scaffold (adapted: Vite/React + Express/Vercel + Neon + compose), A2 design-system shell, A3 schema+migrations+seed, B1 register, B2 verify email, B3 login, B7 reset. AC-01.

## §8. Key risks & mitigations

1. **Serverless cold starts** on approve+seal (<1 s target, NFR-PERF-02): keep server bundle lean (Drizzle, native crypto); measure in Sprint 3.
2. **Audit chain concurrency:** advisory-lock serialisation (§3); load-checked in O1.
3. **Multipart uploads on Vercel functions** (4.5 MB body limit): upload directly from client to Vercel Blob via signed URLs; server records metadata + sha256.
4. **Approval-gate latency** is the schedule's critical path — sprints are sized assuming same-day gate turnarounds.

**STATUS: STOPPED AT GATE B — awaiting approval of: deployment topology, stack choices (Drizzle, TanStack Query, plain-CSS port), schema, API contract, component plan, repo/branch model, Sprint 1 scope.**
