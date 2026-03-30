# Yazko App

Yazko is a zero-cost-first social chat MVP focused on a polished demo experience.

## What is implemented

- Email/password auth
- Backend-ready Google auth endpoint
- 1:1 and group chat foundations
- Real-time messaging with typing and read states
- Reactions, replies, edit/delete, and media upload wiring
- Profile mood/status editing
- Rule-based safety moderation
- Local demo mode that works without backend, database, or paid services

## Workspace

- `apps/web`: Next.js frontend
- `apps/server`: Express + Socket.io backend

## Quick start

### Zero-cost local demo

1. Install dependencies with `npm install`.
2. Run `npm run dev:demo`.
3. Open `http://localhost:3000`.
4. Use `Open Demo` or `Open Demo Mode`.

This path does not require MongoDB, Cloudinary, Google auth, or any paid service.

### Full local stack

1. Copy `.env.example` to `.env`.
2. Start MongoDB locally.
3. Run `npm run dev:server`.
4. Run `npm run dev:web`.

## Deployment

### Frontend

- `vercel.json` is included for the Next.js app.
- The zero-cost public-demo option is frontend-only deployment with demo mode.

### Backend

- `render.yaml` is included for the Express API.
- Persistent backend deployment still requires MongoDB and env setup.

## Verification

- `npm run verify`
- `npm run typecheck`
- `npm run build --workspace @yazko/server`
- `npm run build --workspace @yazko/web`

## Free-only notes

- Paid AI features were intentionally removed.
- Demo mode is the recommended zero-cost showcase path.
- Cloudinary is optional and only needed for real media uploads outside demo mode.
- Google auth is backend-ready but not required for the demo.
- Analytics are first-party console/pageview hooks only.

## Reports and Handoff

- See `docs/PHASE-REPORT.md` for completion status.
- See `docs/DEMO-RUNBOOK.md` for how to run and present the app.
- See `docs/RELEASE-CHECKLIST.md` for final release readiness.
- See `docs/FINAL-HANDOFF.md` for the final MVP handoff summary.
