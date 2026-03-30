# Yazko Demo Runbook

## Fastest zero-cost demo

1. Run `npm install`
2. Run `npm run dev:web`
3. Open `http://localhost:3000`
4. Click `Open Demo`
5. Explore chats, reactions, replies, calls UI, stories UI, and profile editing

## What works in demo mode

- Login/signup entry
- Chat shell
- Sample conversations
- Sending messages locally
- Editing and deleting messages locally
- Reactions locally
- Story preview UI
- Calls UI preview
- Profile editing locally

## What demo mode does not depend on

- MongoDB
- Express backend
- Cloudinary
- Google OAuth
- Paid APIs

## Full local stack

If you want the backend-backed version:

1. Start MongoDB locally
2. Copy `.env.example` to `.env`
3. Run `npm run dev:server`
4. Run `npm run dev:web`

## Demo talking points

- Zero-cost-first MVP
- Strong visual identity and polished interface
- Real chat architecture already present
- Demo mode removes infrastructure dependency for presentations
- Paid AI deliberately excluded to keep the product free
