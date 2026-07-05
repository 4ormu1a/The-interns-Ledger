# Interns Ledger

A secure digital internship logbook — final-year project (UMaT deployment). Students log internship
activity; industry supervisors approve entries, cryptographically sealing them (SHA-256 + Ed25519);
sealed records are publicly verifiable via QR codes. Faculty assess; admins manage the system.

## Layout
- `client/` — React 18 + Vite + TypeScript frontend
- `server/` — Node + Express + Drizzle (PostgreSQL) API, deployable to Vercel serverless
- `design-reference/` — the approved 38-page HTML/CSS prototype set (visual source of truth)
- `docs/` — requirements analysis, architecture, API contract

## Quick start
```bash
docker compose up -d           # local Postgres
cd server && cp .env.example .env && npm i && npm run db:migrate && npm run db:seed && npm run dev
cd client && npm i && npm run dev
```

See `docs/ARCHITECTURE.md` for the full design and `PROJECT_REPORT_LOG.md` for project state.
