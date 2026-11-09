# BeltTrack IP Rate Limiting Configuration

## Overview
BeltTrack implements an in-memory, sliding-window IP rate limiter operating within Next.js Middleware ([`src/middleware.ts`](../src/middleware.ts)). 

This layer intercepts incoming HTTP requests before they reach Next.js route handlers or trigger Prisma database operations. It safeguards authentication routes from credential-stuffing attacks, prevents brute-force enumeration of school join codes, and mitigates denial-of-service (DoS) attempts against public directories—all with zero external dependencies and zero database overhead.

---

## Architectural Principles

1. **Zero External Dependencies**:
   Implemented in pure TypeScript ([`src/lib/rate-limit.ts`](../src/lib/rate-limit.ts)) without third-party services or npm packages.
2. **Database Protection**:
   Rate limits are evaluated entirely in-memory at the middleware layer. This prevents database connection pool exhaustion and ACID transaction lock contention during traffic surges.
3. **Tenant & Data Isolation**:
   Rate limits are scoped by client IP address and route tier (`${ip}:${tierKey}`). No tenant IDs, user IDs, or school metadata are leaked or shared across client boundaries.
4. **Development Resilience**:
   The in-memory tracking map is attached to `globalThis` (`__belttrack_rate_limit_store`), preventing state loss during Next.js Hot Module Replacement (HMR). Expired records are pruned automatically every 60 seconds to maintain a memory footprint under 1 MB.

---

## IP Resolution Strategy

The client IP address is extracted using standard reverse proxy and content delivery network (CDN) headers in order of precedence:

```typescript
export function getClientIp(request: Request): string {
  // 1. Standard reverse-proxy header (first comma-separated entry)
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  // 2. Direct proxy header
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp && xRealIp.trim()) {
    return xRealIp.trim();
  }

  // 3. Cloudflare connecting IP
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  // 4. Local development fallback
  return '127.0.0.1';
}
```

---

## Rate Limiting Configuration Matrix

| Tier Key | Target Endpoint(s) | HTTP Method | Limit | Window | Threat Mitigated | Expected 429 Error Message |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`auth_login`** | `/api/auth/login` | `POST` | **5** | 15 min (900s) | Credential stuffing, dictionary password guessing. | `"Too many login attempts from this IP address. Please try again in 15 minutes."` |
| **`student_join`** | `/api/students/join` | `POST` | **10** | 15 min (900s) | Brute-force scanning of 6-4-4 school join codes (`[PREFIX]-[DISC]-[YEAR]`). | `"Too many join attempts from this IP address. Please try again in 15 minutes."` |
| **`school_register`** | `/api/schools/register` | `POST` | **5** | 1 hr (3600s) | Tenant bloat, dojo creation spam, registration code collisions. | `"Too many school registration attempts from this IP address. Please try again in 60 minutes."` |
| **`school_approvals`** | `/api/schools/approvals` | `POST` | **30** | 1 min (60s) | Replay attacks and rapid state mutation floods on student approvals. | `"Too many approval requests from this IP address. Please try again in 1 minute."` |
| **`auth_logout`** | `/api/auth/logout` | `POST` | **30** | 1 min (60s) | Session churn and logout flooding. | `"Too many logout requests from this IP address. Please try again in 1 minute."` |
| **`public_read`** | `/api/schools/directory`<br>`/api/schools`<br>`/api/auth/me` | `GET`, `HEAD` | **60** | 1 min (60s) | Automated directory scraping, resource exhaustion. | `"Too many requests from this IP address. Please try again in 1 minute."` |
| **`api_general`** | `/api/*` (unclassified) | Any | **100** | 1 min (60s) | General API route protection. | `"Too many API requests from this IP address. Please try again in 1 minute."` |
| **Bypassed** | `/_next/*`, static assets, `/` | Any | **Unlimited** | N/A | Excluded in middleware matcher to guarantee zero client asset latency. | N/A |

---

## Response Headers & Protocol Standards

### Allowed Requests (Within Limit)
When a request is permitted, downstream responses include standard rate limit telemetry headers:
```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1794220723
```

### Blocked Requests (`HTTP 429 Too Many Requests`)
When an IP exceeds the configured threshold, the request is immediately short-circuited with `HTTP 429` and RFC 6585 compliant headers:
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 872
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1794220723

{
  "error": "Too many login attempts from this IP address. Please try again in 15 minutes."
}
```

---

## Verifying Rate Limiting via Terminal

### 1. Automated Multi-IP Test Suite
To automatically verify counter sharing, counter isolation across multiple IPs, HTTP 429 lock-out, and production environment safety:

```powershell
npm run test:rate-limit
```

This runs `scripts/test-rate-limit.mjs` against `http://localhost:3000` executing 6 automated checks:
1. **Counter Sharing**: Verifies repeated requests from the same IP decrement the remaining counter sequentially.
2. **Counter Isolation**: Verifies a distinct IP maintains its own fresh counter untouched by other IPs.
3. **HTTP 429 Lock-Out**: Verifies exceeding the 5-request limit returns `HTTP 429` with `Retry-After`.
4. **Targeted Blocking**: Verifies other unexhausted IPs remain completely unblocked.
5. **Endpoint Isolation**: Verifies other endpoints (e.g., `/api/schools/directory`) remain accessible.
6. **Production Safety**: Verifies that when `NODE_ENV === 'production'`, all `x-simulated-ip` headers are strictly ignored and only trusted proxy headers are evaluated.

### 2. Manual Multi-IP Simulation (PowerShell & curl.exe)
In development (`NODE_ENV=development` or `test`), pass `x-simulated-ip` to simulate different clients:

```powershell
# Client Alpha (Attempt 1: Remaining = 4)
curl.exe -s -i -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -H "x-simulated-ip: 10.0.0.1" `
  -d '{"email":"test@example.com","password":"Password123!"}'

# Client Beta (Attempt 1: Remaining = 4, independent counter)
curl.exe -s -i -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -H "x-simulated-ip: 10.0.0.2" `
  -d '{"email":"test@example.com","password":"Password123!"}'
```

---

## Production Security Guarantees
1. **Strict Environment Gate**: In `src/lib/rate-limit.ts`, `x-simulated-ip` is evaluated **only** when `NODE_ENV !== 'production'` and either `development`, `test`, or `ENABLE_SIMULATED_IP === 'true'` is active.
2. **Untrusted Header Drop**: In production, `x-simulated-ip` is completely ignored. The application resolves only trusted reverse proxy headers (`x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`).
3. **No Rate Limit Bypasses**: The simulation mechanism only allows testing different IP addresses; it never weakens, raises, or bypasses any rate limits.

---

## Production Upgrade Path (Distributed Multi-Region Edge)

For multi-region serverless deployments (such as Vercel Edge with multiple independent lambda workers), the storage provider in [`src/lib/rate-limit.ts`](../src/lib/rate-limit.ts) can be swapped from in-memory `Map` to `@upstash/ratelimit` backed by Redis over REST. The middleware signature and route configuration matrix remain unchanged.

