# Interns Ledger — Requirements Analysis Summary (Gate A)

**Date:** 2026-06-11 · **Inputs:** VeriLog SRS v1.0 (8 Jun 2026), Sprint Backlog v2 (xlsx), sitemap (1.svg), student journey map (HTML), 38-page HTML/CSS UI prototype set (this repo), master development prompt.
**Naming decision (approved):** product is called **Interns Ledger** everywhere (code, docs, UI). "VeriLog" in the SRS/backlog is the same system — treated as an alias.

## 1. What the system is

A secure digital internship logbook replacing paper booklets. Students log daily internship activity; an industry supervisor approves or rejects each entry. Approval **seals** the entry: a canonical payload is hashed (SHA-256) and signed (Ed25519, with key id `kid`), making the record immutable and **publicly verifiable via QR/token** with no login. Corrections are append-only new versions (`supersedes` link). Faculty supervisors get read-only views and record assessments. Admins manage users, assignments, signing keys, token revocation, audit trail, and data-protection requests (export, crypto-shredding erasure under Ghana DPA 2012). Single-tenant in v1 (`tenant_id` reserved).

## 2. Roles

| Role | Core capability |
|---|---|
| Student | Self-register (institution domain + email verification + consent), create internship, draft/submit/edit pending entries, attach evidence, issue corrections, track progress, generate live + sealed PDF reports |
| Industry supervisor | Admin-provisioned; review queue for assigned students only; approve (→ seal) / reject (mandatory reason) one entry at a time; comments; decision history |
| Faculty supervisor | Read-only approved logs/progress of assignees; records assessment (grade + comments); never seals (v1) |
| Administrator | Users, internships, M:N assignments (one primary approver per entry routing), reassign pending entries, signing-key lifecycle, token revocation, audit trail, erasure/export; may act as supervisor only via explicit assignment |
| Verifier (public) | Anonymous QR/token verification: authentic / not authentic / revoked / erased, minimal disclosure by default, anti-enumeration |

## 3. Core entities (SRS §12)

USER, INTERNSHIP, ASSIGNMENT, LOG_ENTRY (versioned, `supersedes`), ATTACHMENT (stores per-file SHA-256), SEAL (payload digest + Ed25519 sig + kid), SIGNING_KEY, REPORT (live/sealed), VERIFICATION_TOKEN (ULID, revocable, disclosure flag), ASSESSMENT, AUDIT_LOG (append-only, hash-chained), NOTIFICATION.

**Entry lifecycle:** Draft → Submitted → {Approved (sealed) | Rejected (editable, resubmit)}; Approved → Superseded via correction; window-close → Expired. Key business rules: submit within 7 days of work date (BR-01/03); logging window closes 2 weeks after internship end (BR-02); only approved entries count toward progress (BR-09); no batch decisions (BR-07).

## 4. Page inventory (sitemap — all 38 pages already prototyped & approved)

- **Public (6):** landing, login, register, verify-email, reset, verify (`/verify/:token` — full / minimal / revoked-not-found results)
- **Student (7):** dashboard, logbook (entries list/detail/new/edit/correction/attachments), progress, reports (list/detail+QR/generate), internship-profile, notifications, account (profile/password/privacy export-erasure)
- **Industry supervisor (8):** dashboard, review-queue, entry-review, students, student-detail, decision-history, notifications, account
- **Faculty (8):** dashboard, students, student-progress, logbook-view, assessment, assessment-history, notifications, account
- **Admin (9):** dashboard, users, internships, supervisor-links, verification-keys, audit-trail, reports (exports/erasure), notifications, account

## 5. Approved technical decisions (Gate A, 2026-06-11)

| Area | Decision | Note |
|---|---|---|
| Frontend | **React** (per master prompt) | **Documented deviation from SRS §16 (Angular + Material).** Justification: master prompt overrides; native Vercel fit; clean conversion of the existing custom design system, which Material would fight. |
| Database | **Neon** (serverless Postgres, free tier) | Satisfies SRS "PostgreSQL" while being Vercel-serverless-safe (pooled/HTTP driver). |
| Deployment | **Vercel** (per master prompt) | Deviation from SRS NFR-MNT-01 (Docker Compose) — proposed: also ship a `docker-compose.yml` for local dev so the SRS requirement is still demonstrable. |
| Email | **Resend** free tier | FR-AUTH-02/10, FR-NOT; called from serverless functions. |
| Naming | **Interns Ledger** everywhere | VeriLog noted as SRS alias. |

## 6. Sprint plan (from backlog v2 — adopted as baseline)

2 devs (FE + BE), 1-week sprints, 6 sprints, ~153 pts, Must + Should scope, descope ladder defined in the backlog.

| Sprint | Goal | AC |
|---|---|---|
| 1 | Foundation & identity — deploys end-to-end; register → verify email → login (A1–A3, B1–B3, B7) | AC-01 |
| 2 | Logbook core & RBAC — internship, draft/edit/attach/submit within window (B4–B6, B8, C1–C4) | AC-02 |
| 3 | Review, sealing & audit chain — queue, approve→seal, reject, immutability (D1–D2, E1–E5, K1a) | AC-03/04 |
| 4 | Public QR verification & progress (F1–F6, E6, O2) | AC-05/06 |
| 5 | Corrections & reports — supersedes flow, live + sealed PDF, faculty assessment (G1, H1–H4, J1–J2, N1) | AC-07/08 |
| 6 | Admin, privacy, audit & hardening (I1–I3, K1b, L1, M1, N2–N3, O1, O3) | AC-09–12 |

Backlog's own caveat: ~25.5 pts/sprint is ambitious; descope ladder applies (drop O/N items first; never cut B1–B3, C2–C4, D1–D2+E2, F1–F2, G1).

## 7. Open questions — RESOLVED 2026-06-11 (Gate A approved)

1. 2.svg/3.svg = logo/brand assets. ✔
2. Figma design system: provided as image — confirms palette (#0D530E, #306D29, #E7E1B1, #FBF5DD, #030302, #FFFFFF, #08CB00), Inter typography scale (Heading XL 56/70 → Body S 16/28), 3 pill-button styles with idle/hover states. Matches `assets/css/main.css`. Together with the 38 prototypes = design source of truth. ✔
3. Attachments: **Vercel Blob**. ✔
4. Institution: **UMaT** — registration limited to UMaT student emails (e.g. ce-msjubril6822@st.umat.edu.gh → domain `st.umat.edu.gh`), via env vars **`INSTITUTION_EMAIL_DOMAIN="st.umat.edu.gh"`** and **`INSTITUTION_NAME="University of Mines and Technology"`** (confirmed 2026-06-11). Seed personas keep their names but are re-domained to `@st.umat.edu.gh` / UMaT.
5. Backlog adopted with React substituted for Angular. ✔
6. Repo location + GitHub: user will provide location and log in to GitHub for pushes (pending — needed before Phase 1 commits).
7. PDF: server-side pdf-lib. ✔
8. Seed data: keep prototype personas (Ama Mensah, Kwabena Osei, Dr. Esi Dankwa, Selorm Adjei) — student emails to be re-domained to `st.umat.edu.gh` to pass the domain gate.

## 7b. Original open questions (for the record)

1. **2.svg / 3.svg** — these render as brand artwork (ledger-book sketch on cream; wordmark with outlined text). Confirm they are logo/brand assets, not requirement diagrams (the SRS references Figure 1 state machine and Figure 2 ERD — neither appears to be these files).
2. **Figma design system** — listed in the master prompt but not provided. Proposal: treat `assets/css/main.css` + the 38 approved prototype pages as the complete design source of truth. Acceptable?
3. **Attachment storage** — serverless has no disk. Options: Vercel Blob (free tier, simplest) vs Supabase Storage vs Cloudinary. Recommend **Vercel Blob**.
4. **Institution email domain** — what domain gates student registration (FR-AUTH-01)? Prototype persona uses Coastline University. For the demo, suggest a configurable env var with a demo value.
5. **Backlog stack line says Angular** — confirm the backlog is adopted with the React substitution (story content otherwise unchanged).
6. **Repo** — create a fresh Git repo in this folder (prototypes become `/design-reference/` or stay in place?) and the agreed branch model: `main` + long-lived `frontend` + `backend`. Preference on monorepo layout (`/client`, `/server`) vs prototype folders kept at root?
7. **PDF generation** — server-side on Vercel functions (e.g. pdf-lib, serverless-friendly) vs client-side. Recommend pdf-lib server-side so sealed reports are canonical. OK?
8. **Demo data** — keep prototype personas (Ama Mensah, Kwabena Osei, Dr. Esi Dankwa, Selorm Adjei) as seed data?

## 8. Risks

- Sealing + key management on serverless: Ed25519 private key via Vercel env vars (SRS allows env-injection for PoC).
- 6×1-week sprints with mandatory approval gates means turnaround on approvals is the critical path.
- Hash-chained audit log under concurrent serverless writes needs a serialised insert strategy (e.g. advisory lock / single-writer pattern) — will address at Gate B.

**STATUS: GATE A APPROVED 2026-06-11.** Next: Gate B package (architecture, folder structure, DB schema, API contract, component plan). Pending before/at Gate B: env-var name confirmation (Q4) and repo location + GitHub login (Q6).
