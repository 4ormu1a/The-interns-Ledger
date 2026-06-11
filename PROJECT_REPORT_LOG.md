# Interns Ledger — PROJECT REPORT LOG (living record)

> Read this first when resuming in a new session. Latest entry at the bottom of each section.

## A. Project overview
- **Project:** Interns Ledger (SRS alias: VeriLog) — secure digital internship logbook, final-year project, UMaT deployment.
- **Stack:** React 18 + Vite + TS (client) · Node 20 + Express + TS + Drizzle (server) · Neon Postgres · Vercel (2 projects) · Vercel Blob · Resend.
- **Phase:** Phase 0 (Discovery & Planning) COMPLETE → entering Phase 1/Sprint 1.
- **Current sprint:** Sprint 1 proposed, awaiting Gate C+E.
- **Milestone:** Gates A & B approved 2026-06-11.

## B. Progress tracking
- Done: document analysis; REQUIREMENTS-ANALYSIS.md (Gate A ✅ 2026-06-11); ARCHITECTURE.md (Gate B ✅ 2026-06-11). Note: the 38-page HTML/CSS prototype set was built & approved in a prior effort (see IMPLEMENTATION-LOG.md) and serves as design reference.
- Pending: repo creation (location TBD by user), GitHub remote (user will log in), Sprint 1 implementation.
- Blocked: first push blocked on GitHub login (not on local work).

## C. Architecture & technical decisions (with reasoning — see ARCHITECTURE.md for detail)
1. React over SRS §16 Angular — master prompt override; Vercel fit; prototype conversion (Gate A).
2. Neon Postgres — SRS-mandated Postgres, serverless-safe, free tier (Gate A).
3. Interns Ledger naming everywhere; VeriLog = SRS alias (Gate A).
4. Resend email; Vercel Blob attachments (client-direct signed-URL uploads, 4.5 MB fn limit); pdf-lib server-side (Gate A).
5. Env gates: INSTITUTION_EMAIL_DOMAIN=st.umat.edu.gh, INSTITUTION_NAME=University of Mines and Technology (Gate A).
6. Drizzle ORM; TanStack Query; plain-CSS token port (no Tailwind/Material); JWT 15min + rotating refresh cookie; argon2id; node:crypto Ed25519; audit hash chain via pg advisory lock (Gate B).
7. Monorepo /client /server /design-reference /docs; branches main + frontend + backend + feat/*; Conventional Commits; sprint-checkpoint integration (Gate B).

## D. Repository activity
- Repo: C:\Users\sly\Desktop\final year project\app (git runs in session sandbox; .git synced to folder).
- Branches: main (5 commits, Gate D approved 2026-06-11), frontend + backend forked from 52f519a. No remote yet.
- main history: de52812 chore(repo) scaffold · d1a6460 feat(server) app/env/health · b1c2f37 feat(db) schema+migration+seed · fa87bb7 feat(auth) FR-AUTH-01..10 · 52f519a feat(client) tokens+auth pages.

## E. Development status
- Next: Sprint 1 (A1 scaffold, A2 UI shell/design tokens, A3 schema+migrations+seed, B1 register, B2 verify-email, B3 login, B7 reset) — pending Gate C+E.

## F. Documentation references
- Used: VeriLog_SRS.docx v1.0; VeriLog_Sprint_Backlog_v2.xlsx; sitemap 1.svg; journey map HTML; design-system image; 38 prototypes; master prompt.
- Implemented requirements: none yet (prototypes cover UI only).

## G. Known issues & risks
- Approval-gate turnaround = schedule critical path; serverless cold start vs NFR-PERF-02; audit-chain concurrency (mitigation designed); backlog ~25.5 pts/wk is ambitious — descope ladder stands.

### 2026-06-11 — Sprint 1 build session (Gates C+E approved; awaiting Gate D)
- Repo root: C:\Users\sly\Desktop\final year project\app (mounted). NOTE: the mounted FS breaks git's atomic writes, so git runs in the session sandbox and the repo (incl. .git) is synced back to the folder after each approved commit batch.
- Built (all typechecked; client `vite build` passes; API booted and smoke-tested):
  - A1 ✅ monorepo scaffold: /client (Vite+React+TS), /server (Express+TS, Vercel entry api/index.ts, vercel.json), docker-compose.yml, README, .gitignore; /design-reference = 38 prototype pages; docs copied.
  - A3 ✅ Drizzle schema (16 tables, enums, partial unique index for BR-05), migration 0000_green_lester.sql generated, seed.ts (UMaT-re-domained personas; ama.mensah@st.umat.edu.gh etc.). NOT yet run against a live DB (no Postgres/Docker in sandbox — first run happens vs Neon or local compose).
  - A2 ✅ tokens: design-reference main.css → client/src/styles/global.css (verbatim port) + auth.css (page styles from prototypes); UI primitives (Button 1/2/3/danger, Card, Field, StatusPill, BrandMark, PasswordMeter); AuthLayout (brand panel + form side).
  - B1/B2/B3/B7 ✅ code complete both ends: register (domain gate st.umat.edu.gh, consent, argon2id), verify-email (single-use 24 h), resend w/ 30 s cooldown UI, login (JWT 15 m + rotating refresh cookie il_refresh, lockout 5×15 min), logout, forgot/reset (30 min single-use, revokes all sessions). Pages: Login (role picker, per prototype), Register, VerifyEmail (4 states), Reset (4 states), interim Landing, PortalStub guards per role.
- Smoke tests passed: /api/health 200; register w/ gmail → 422 DOMAIN_NOT_ALLOWED; invalid body → 400 VALIDATION envelope; unknown route → 404 envelope.
- Deviations flagged: (1) login role picker is cosmetic — routing uses the account's real role (matches FR-AUTH; prototype behaviour was UI-only); (2) full landing-page conversion deferred to Sprint 4 (hosts verify CTA); interim landing in place.
- Outstanding: run migration+seed vs real DB (need Neon DATABASE_URL or local compose); GitHub remote (deferred to first push). Gate D #1 APPROVED & committed 2026-06-11.
- Resume: read this entry; if Gate D approved, commit per the approved plan, sync .git to mount, then live-DB verification.

## Session handovers
### 2026-06-11 — Session 1 (discovery)
- Completed: Gates A & B. Files created: REQUIREMENTS-ANALYSIS.md, ARCHITECTURE.md, PROJECT_REPORT_LOG.md.
- Decisions: see §C.
- Outstanding: repo location, GitHub login, Gate C+E for Sprint 1.
- Resume: read this log + ARCHITECTURE.md §7; next task = Sprint 1 kickoff at Gate C+E.
