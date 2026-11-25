# Vercel Deployment Troubleshooting & Resolution

## Incident Overview
During initial production deployment to Vercel, the application returned HTTP 500 on all server routes.

### Root Cause
Boot-time environment validation in `src/lib/env-validation.ts` failed closed due to missing required Upstash Redis credentials:
```text
[BELTTRACK] Invalid environment configuration:
UPSTASH_REDIS_REST_URL (missing);
UPSTASH_REDIS_REST_TOKEN (missing)
```

### Resolution
1. Configured `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel Project Settings under **Environment Variables** (Production and Preview).
2. Triggered redeployment on `second-branch`.
3. Verified via live HTTP probe to `https://belttrack.vercel.app/api/auth/me`:
   - Endpoint responded with `HTTP/1.1 200 OK`.
   - Rate limiting headers confirmed active: `X-Ratelimit-Limit: 60`, `X-Ratelimit-Remaining: 59`.
4. Technical verification proof compiled to [`docs/production-upstash-verification-proof.pdf`](./production-upstash-verification-proof.pdf).
