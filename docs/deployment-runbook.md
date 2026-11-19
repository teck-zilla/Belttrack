# Deployment Runbook

## Scope
- BeltTrack deploys from `second-branch` through a user-created pull request into `main`.
- No agent may commit, push, merge, run migrations, seed data, or modify the database unless explicitly instructed.

## 1. Local Validation
Run from the repository root:

```bash
npm run audit
npx tsc --noEmit --incremental false
npm run lint
npm test
npx next build
```

Optional e2e coverage:

```bash
npx playwright install chromium
npm run test:e2e
```

Staff lifecycle e2e requires `E2E_STAFF_STORAGE_STATE`, `E2E_PROFILE_ID`, and `E2E_TECHNIQUE_ID`; it skips when unset.

## 2. Environment Preparation
- Confirm every required variable in `docs/environment-checklist.md` is set in the deployment platform.
- Create an Upstash Redis REST database and set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- Set `TRUSTED_PROXY_HOPS` based on the number of trusted proxies in front of the app.
- Keep `RATE_LIMIT_FAIL_CLOSED=false` unless Redis outages should block mutating requests.
- Keep `DISABLE_RATE_LIMIT=false` in production.

## 3. Database Changes
- Review `prisma/schema.prisma` and all files under `prisma/migrations/`.
- Do not run migrations locally as part of the controlled release workflow.
- The user applies migrations in the target environment with the approved migration command.
- Apply `prisma/rls_policies.sql` after migrations so RLS and append-only policies exist on every tenant table.
- Confirm `AuditLog` has RLS enabled, forced, and update/delete blocked.

## 4. Branch and Pull Request
- Confirm clean working tree except intentionally excluded local files such as `student.cookies`.
- Commit only reviewed files.
- Push only to `second-branch`.
- Open a pull request from `second-branch` into `main`.
- The user reviews and merges manually.

## 5. Production Verification
After deployment:

```bash
curl -I https://<deployment-host>/
```

Verify response headers include:
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy`
- `Permissions-Policy`
- `Strict-Transport-Security` in production

Then manually verify:
- Demo/Real tenant banner renders correctly.
- Cross-origin API POST receives `403 Cross-origin request blocked (CSRF protection)`.
- Rate limits are enforced through Upstash and not only the in-memory fallback.
- Pending member approval writes an `AuditLog` row.
- Ledger entry creation writes an `AuditLog` row and receipt slugs follow `REC-[YEAR]-[DISCIPLINE]-[INCREMENT]`.
- Ledger and audit rows reject updates and deletes.

## 6. Scheduled Deletion Purge
- The hourly purge requires `.github/workflows/purge-deletions.yml` on `main`.
- The workflow must call `/api/internal/deletions/purge` with `Authorization: Bearer $DELETION_PURGE_SECRET`.
- Do not trigger the purge manually unless explicitly authorized.
