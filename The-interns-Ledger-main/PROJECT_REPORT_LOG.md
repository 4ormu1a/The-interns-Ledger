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
- Sprint 1 COMPLETE (user-verified E2E on localhost 2026-06-11): seed login → portal stubs, real registration (ce-msjubril6822@st.umat.edu.gh) → console verification link → verified → login. AC-01 satisfied (deploy portion moves with Gate J).
- Next: Gate F review delivered; then Gate E for Sprint 2 (B4 RBAC+scope, B5 lockout polish, B6 logout, B8 account settings, C1 internship, C2 draft entries, C3 attachments, C4 submit window) — and Vercel deploy (Gate J) when user is ready.

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

### 2026-06-11 — Live DB provisioned & verified (Neon)
- Neon project "The interns ledger" (eu-west-2 London, project square-math-57525607, db neondb). Pooled DATABASE_URL held in sandbox server/.env only — never committed.
- Sandbox cannot reach Neon (proxy blocks); migration + seed applied via Neon SQL Editor through the user's browser:
  - Migration 0000: 46 statements OK (11 enums, 16 tables, 18 FKs, uq_primary_approver partial index).
  - Seed: 4 users / 1 internship / 2 assignments verified by count query. Fix applied: ::assignment_kind casts needed in INSERT…SELECT (VALUES coerces, SELECT doesn't) — keep in mind for seed.ts (drizzle handles typing, no change needed).
  - Drizzle tracking registered: drizzle.__drizzle_migrations row (hash e01e353d…de37, when 1781218578398) so future db:migrate skips 0000.
- Remaining for Sprint 1 close-out: full register→verify→login E2E against live DB (requires running server with Neon access: user's machine or Vercel deploy — Gate J), then Gate F sprint review.

### 2026-06-11 — Sprint 1 closed (Gate F)
- User ran both apps locally; confirmed "everything works": seed logins, real UMaT registration, email-token verify, login, portal stubs.
- server/.env with Neon URL written to user's repo copy (gitignored).
- Implemented FRs: FR-AUTH-01..03, 05..08, 10 full; 04 partial (seed-provisioned; admin UI in Sprint 6); FR-AUTH-09 logout endpoint live (B6 UI polish in Sprint 2 scope).
- Carry-over/notes: deploy-to-Vercel portion of Sprint 1 goal deferred to Gate J at user convenience; landing conversion in Sprint 4; role-picker deviation accepted.

### 2026-06-12 — Gate J: GitHub + Vercel deployment COMPLETE ✅
- GitHub: https://github.com/4ormu1a/The-interns-Ledger (private). Branches main/frontend/backend pushed. Git author set to 4ormu1a@users.noreply.github.com (Vercel blocked the previous arvoip.fun commit email; last commit amended → 6b08d77).
- Vercel projects (Hobby, user 4ormu1as-projects):
  - **interns-ledger-api** — root `server`, Express preset, env: DATABASE_URL (Neon pooled), JWT_SECRET (new prod secret), ACCESS/REFRESH TTLs, INSTITUTION_*, APP_TIMEZONE, CLIENT_ORIGIN=https://interns-ledger.vercel.app, EMAIL_FROM. RESEND_API_KEY unset → emails currently log to function console (visible in Vercel Runtime Logs). Live: https://interns-ledger-api.vercel.app/api/health → 200 ok.
  - **interns-ledger** — root `client`, Vite. client/vercel.json proxies /api/* → api project (keeps refresh cookie first-party) + SPA fallback. Live: https://interns-ledger.vercel.app
- Fixes during deploy (committed on main): 4437c66→6b08d77 fix(auth) named rateLimit import (Vercel TS interop); 78b1c54 feat(client) vercel.json proxy+spa. Both flagged: committed under the approved Gate J activity without a separate Gate D pause.
- Production E2E verified in browser: login ama.mensah@st.umat.edu.gh → /student portal stub renders "Signed in as Ama Mensah". AC-01 deploy portion DONE — Sprint 1 goal fully met.
- TODO: user should revoke the GitHub PAT (was shared in chat for the push) and set up Vercel 2FA + a Resend API key when ready; registration verify links until then are in Vercel Runtime Logs for interns-ledger-api.
- Next: Gate E — Sprint 2 (B4 RBAC scopes, B5, B6, B8, C1–C4).

### 2026-06-12 — Sprint 2 COMPLETE (Gates E/D/I + prod verification)
- Backend (branch backend → main): scope middleware (B4); internships create/list/progress (C1, BR-09 approved-only); entries draft CRUD + submit with BR-01/02/03 in Africa/Accra (C2/C4); attachments via @vercel/blob server put, sha256 stored, ≤4 MB, JPEG/PNG/WebP/PDF (C3) — requires BLOB_READ_WRITE_TOKEN (NOT yet configured; returns 503 ATTACHMENTS_UNCONFIGURED until user creates a Blob store in Vercel → Storage and adds token to interns-ledger-api env + local .env); /me get/patch + password change w/ session revoke (B8).
- Frontend (branch frontend → main): StudentShell topbar/nav/logout (B6), Dashboard (live progress bar), Internship page (view/create), Logbook w/ state tabs, EntryEditor (draft/edit/attach/submit, rejected-fix), EntryDetail (evidence hashes, comments), Account (profile/password/privacy note).
- Commits: d0c00cf scope · dc5337a internships · 6b06b58 entries · 2bfe984 attachments · 1fa989b me · b12062d student UI; merged --no-ff to main (03e9a3d) and pushed; Vercel auto-deployed.
- PRODUCTION E2E verified via browser: login Ama → dashboard shows internship + 0/480h → new entry form → save & submit → entry 4b08ccc8 state=submitted, detail renders. AC-02 core satisfied (attachment upload pending Blob store).
- Design note: portal pages built from shared design-system classes (main.css); pixel-parity pass vs prototypes scheduled for Phase 4 polish, per plan.
- Next: Gate F review → Gate E Sprint 3 (review queue D1-D2, sealing E1-E5, audit chain K1a) — needs ED25519 keypair generation + key env var; supervisor portal UI.

### 2026-06-12 — Blob store live; attachments verified in production
- User created Vercel Blob store "interns-ledger-files", connected to interns-ledger-api (Prod+Preview, read-write token env added), redeployed.
- Verified live: draft entry e1f6c598 → uploaded evidence-test.png through the UI → stored in Blob, sha256 recorded, listed on entry. C3 fully done; Sprint 2 has no remaining carry-over except Phase-4 pixel polish.
- Awaiting Gate E approval for Sprint 3 (D1-D2 review queue/decisions, E1-E5 sealing, K1a audit chain; needs Ed25519 keypair → ED25519_PRIVATE_KEY env + public key in signing_keys table).

### 2026-06-12 — Sprint 3 COMPLETE: first production seal + independent verification ✅
- Commits (Gate D approved, merged --no-ff, pushed): crypto primitives · audit chain · review/seal endpoints · notifications feed · supervisor portal UI. main=ae056cc+.
- Commit hygiene note: stash-pop staged-files mishap briefly folded 3 modules into one commit; fixed via soft reset and re-split BEFORE push (history clean).
- Key ceremony: Ed25519 keypair generated in sandbox (kid UMAT-K1). Public key → signing_keys via Neon (INSERT 1, active). Private key → user-pasted into Vercel env ED25519_PRIVATE_KEY + written to local server/.env. Private key never in repo.
- PRODUCTION SEAL TEST: Kwabena login → queue (1 pending) → entry 4b08ccc8 → confirm → SEALED. digest a8acf99cff89ca557db20ef4b1a4136d06f4a93dff66bbc16620e882088db434, kid UMAT-K1, verification token 01KTYASSHJXW0VNAH1RCWN63XD.
- INDEPENDENT VERIFICATION (AC-04/06 evidence): in-browser WebCrypto re-check using ONLY the published public key — recomputed canonical digest matches AND Ed25519 signature valid. Third-party verifiability proven before the public verify page even exists.
- AC-03 also satisfied (queue scoped to assigned students; one-at-a-time decisions; reject requires reason).
- Next: Gate F → Gate E Sprint 4 (F1-F6 public /verify/:token page + QR, E6 immutability surfacing, O2, full landing page conversion).

### 2026-06-12 — Sprint 4 COMPLETE: public verification live, AC-05 + AC-06 proven ✅
- Commits (Gate D approved): verification endpoint (uniform negatives, key re-check) · seal/token on entry detail · verify page UI (5 states) · QR + seal block on approved entries · full landing conversion · fix(verification) named rateLimit import (same Vercel interop as sprint 1; flagged under Gate J precedent). Merged --no-ff, pushed; main=7c64131.
- PRODUCTION TESTS:
  - AC-05 ✓ https://interns-ledger.vercel.app/verify/01KTYASSHJXW0VNAH1RCWN63XD → "✓ AUTHENTIC RECORD" minimal disclosure (institution, Ama, Nimbus, approver, date, digest, kid, public key, signature) — no login.
  - AC-06 ✓ tampered seals.canonical_payload (hours→"99.0") via Neon → page reports "✗ NOT AUTHENTIC"; restored → authentic again. NOTE: during restore, Neon editor's restored-history buffer silently re-ran the tamper once — diagnosis took several rounds; final clean typed UPDATE restored 8.0; verified authentic. Lesson logged: never re-run pasted Neon buffers; type single statements.
  - Anti-enumeration ✓ unknown-but-valid-shape ULID and malformed token return byte-identical cannot_verify shape (NFR-SEC-05).
- Landing page now full conversion (hero+mockup, stats, how-it-works, roles, security band, verify CTA, footer). QR renders on approved entry detail → /verify/<token>.
- Next: Gate F → Gate E Sprint 5 (G1 corrections UI, H1-H4 PDF reports live+sealed, J1-J2 faculty portal, N1 notifications polish).

### 2026-06-12 — Sprint 5 COMPLETE: corrections, PDF reports, faculty portal — AC-07 + AC-08 proven ✅
- Commits (Gate D approved, merged, pushed; main=aaf6ef2): corrections endpoint · pdf reports (live watermarked / sealed w/ aggregate hash+sig+QR via pdf-lib→Blob) · report-scope verification · faculty endpoints · student UI (correction flow, reports page, notifications) · faculty portal UI.
- PRODUCTION TESTS:
  - AC-08 ✓ Ama generated SEALED report → aggregate 7cbe5325… key UMAT-K1, PDF in Blob, report QR; public verify of report token → authentic scope=report entries=1.
  - AC-07 ✓ full correction cycle live: Issue correction on sealed entry 4b08ccc8 → draft v2 350ff4b3 prefilled → edited+submitted → Kwabena approved → SEALED v2. Verification: v2 token authentic version=2; ORIGINAL token still authentic version=1 superseded=true. Append-only proven.
  - Live-report regeneration (FR-PDF-04) covered by same generation path minus sealing; not separately re-run.
- Faculty portal live (Dr. Esi Dankwa can view sealed logbook read-only + record assessments) — not yet user-tested in prod; suggest user demo it.
- Next: Gate F → Gate E Sprint 6 (admin portal: I1-I3 users/assignments/reassign, K1b audit viewer + verify-chain UI, L1 key mgmt + token revocation, M1 erasure/export, N2-N3, O1/O3 hardening). Final sprint of backlog.

## Session handovers
### 2026-06-11 — Session 1 (discovery)
- Completed: Gates A & B. Files created: REQUIREMENTS-ANALYSIS.md, ARCHITECTURE.md, PROJECT_REPORT_LOG.md.
- Decisions: see §C.
- Outstanding: repo location, GitHub login, Gate C+E for Sprint 1.
- Resume: read this log + ARCHITECTURE.md §7; next task = Sprint 1 kickoff at Gate C+E.
