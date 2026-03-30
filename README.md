# Yazko App

Yazko is a real-time social chat app built with Next.js, Express, Socket.io, and MongoDB.

## What is implemented

- Email/password auth
- Backend-ready Google auth endpoint
- 1:1 and group chat foundations
- Real-time messaging with typing and read states
- Reactions, replies, edit/delete, and media upload wiring
- Profile mood/status editing
- Rule-based safety moderation
- Deployment configuration for Vercel and Render

## Workspace

- `apps/web`: Next.js frontend
- `apps/server`: Express + Socket.io backend

## Quick start

### Full local stack

1. Copy `.env.example` to `.env`.
2. Start MongoDB locally.
3. Run `npm run dev:server`.
4. Run `npm run dev:web`.

## Deployment

### Frontend

- `vercel.json` is included for the Next.js app.
- Deploy the web app from `apps/web`.

### Backend

- `render.yaml` is included for the Express API.
- Deploy the API from `apps/server`.
- A MongoDB connection string and production env values are required.

## Verification

- `npm run verify`
- `npm run typecheck`
- `npm run build --workspace @yazko/server`
- `npm run build --workspace @yazko/web`

## Free-only notes

- Paid AI features were intentionally removed.
- Cloudinary is optional and only needed for real media uploads.
- Google auth is backend-ready but optional for the first public release.
- Analytics are first-party console/pageview hooks only.

## Reports and Handoff

- See `docs/PHASE-REPORT.md` for completion status.
- See `docs/RELEASE-CHECKLIST.md` for final release readiness.
- See `docs/FINAL-HANDOFF.md` for the final MVP handoff summary.