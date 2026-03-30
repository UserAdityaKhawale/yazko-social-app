# Release Checklist

## Phase 4 Readiness

Status: Finished for zero-cost local demo release and deploy-prep

### Product readiness

- Landing page exists
- Login and signup pages exist
- Demo route exists
- Demo mode works without backend setup
- Core chat interactions are present
- Profile editing is present
- Calls and stories UI surfaces are present

### Engineering readiness

- Monorepo scripts are available
- Environment template exists
- Typecheck passes
- Server build passes
- Web build passes
- Zero-cost demo path is documented
- Frontend deploy config exists
- Backend deploy config exists
- Production env validation exists
- Request logging and request IDs exist
- Production-safe error handling exists
- Security headers exist on web and server

### Remaining only for public hosting

- Set actual environment values on the hosting provider
- Add a real MongoDB instance if persistence is needed
- Optionally wire Cloudinary and Google auth in production

## Phase 5 Finalization

Status: Finished

### Final handoff artifacts

- README updated
- Phase report written
- Demo runbook written
- Release checklist written
- Final handoff summary written

### Final verification command

Run:

```powershell
npm run verify
```

### Demo command

Run:

```powershell
npm run dev:demo
```
