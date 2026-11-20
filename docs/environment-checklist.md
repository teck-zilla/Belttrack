# Environment Checklist

## Required Runtime Variables

| Variable | Purpose | Production Notes |
| :--- | :--- | :--- |
| `DATABASE_URL` | Prisma transaction pooler connection | Use pooled connection string. |
| `DIRECT_URL` | Prisma DDL and migrations | Use direct/session connection string. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Auth URL | Must match the Supabase project. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe Supabase client key | Public by design. |
| `NEXT_PUBLIC_SITE_URL` | Canonical HTTPS origin for auth callbacks | Recommended; overrides request host and Vercel fallback. |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client for auth metadata and verification | Server-only; never expose to the browser. |
| `SMTP_HOST` | Outbound SMTP host for verification/reset codes | Required in production; registration fails closed without it. |
| `SMTP_PORT` | SMTP port | `587` for STARTTLS, `465` for SSL. |
| `SMTP_SECURE` | SMTP TLS mode | `true` only for implicit TLS on `465`. |
| `SMTP_USER` | SMTP username or API key | Server-only. |
| `SMTP_PASS` | SMTP password or token | Server-only; store only in the deployment provider. |
| `SMTP_FROM` | Verified sender identity | Must be authorized by the SMTP provider. |
| `VERIFICATION_CODE_SECRET` | HMAC secret for verification/reset codes | Long random value. |
| `COOKIE_SECRET` | Signs session cookies when preferred | Long random value. |
| `DELETION_PURGE_SECRET` | Authenticates internal purge endpoint | Long random value; required by scheduled workflow. |

## Production Hardening Variables

| Variable | Recommended Value | Notes |
| :--- | :--- | :--- |
| `UPSTASH_REDIS_REST_URL` | Required | Upstash REST endpoint for distributed rate limits. |
| `UPSTASH_REDIS_REST_TOKEN` | Required | Server-only token. |
| `UPSTASH_RATE_LIMIT_PREFIX` | `belttrack:ratelimit` | Allows namespacing across environments. |
| `TRUSTED_PROXY_HOPS` | `1` on Vercel | Number of trusted rightmost proxy hops. |
| `TRUST_REAL_IP_HEADER` | `false` | Enable only behind a trusted proxy that sets `x-real-ip`. |
| `TRUST_CLOUDFLARE_CONNECTING_IP` | `false` | Enable only behind Cloudflare. |
| `RATE_LIMIT_FAIL_CLOSED` | `false` | `true` blocks requests when Upstash is unavailable. |
| `DISABLE_RATE_LIMIT` | `false` | Must remain false in production. |
| `CRON_SECRET` | Optional long random value | Bearer alternative for internal mutation CSRF exemption. |

## Vercel Detection
- On Vercel, `VERCEL`, `VERCEL_ENV`, or `NEXT_PUBLIC_VERCEL_ENV` enables platform-aware IP extraction.
- `x-vercel-forwarded-for` and `x-real-ip` are preferred before generic `x-forwarded-for`.
- Non-Vercel deployments strip `TRUSTED_PROXY_HOPS` rightmost entries from `x-forwarded-for`.

## E2E Variables

| Variable | Purpose |
| :--- | :--- |
| `PLAYWRIGHT_BASE_URL` | Optional base URL; defaults to `http://127.0.0.1:3000`. |
| `E2E_STAFF_STORAGE_STATE` | Path to a Playwright storage state for an active owner/coach. |
| `E2E_PROFILE_ID` | Tenant-scoped student profile UUID used by sign-off and attendance. |
| `E2E_TECHNIQUE_ID` | Tenant-scoped technique UUID used by sign-off. |
| `E2E_CLASS_ID` | Optional tenant-scoped class schedule UUID used by attendance. |

## Preflight Checks
- Production boot validation rejects missing variables, placeholders, weak secrets, invalid SMTP settings, and disabled rate limits.
- Never commit real secrets.
- Confirm `.env.example` contains placeholders only.
- Confirm `npm run audit` reports zero violations.
- Confirm `npm test` passes.
- Confirm `npx tsc --noEmit --incremental false` passes.
- Confirm `npm run lint` passes.
- Confirm `npx next build` passes.
- Confirm migrations and `prisma/rls_policies.sql` are applied in the target environment by the user.
