# Yazko App

Yazko is a responsive social chat MVP with:

- Email/password auth and Google sign-in
- 1:1 and group chat
- Real-time messaging with typing and read states
- Reactions, replies, edit/delete, and media sharing
- Profile mood/status
- Free rule-based safety checks and reporting flow

## Workspace

- `apps/web`: Next.js frontend
- `apps/server`: Express + Socket.io backend

## Quick start

1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Run `npm run dev:server` and `npm run dev:web`.

## Notes

- Paid AI features were intentionally removed from this MVP.
- Media upload is wired for Cloudinary.
- Google sign-in expects a client-generated ID token posted to the backend.
