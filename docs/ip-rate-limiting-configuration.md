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

To test the login rate limiter using Windows PowerShell and native `curl.exe`:

```powershell
for ($i = 1; $i -le 6; $i++) {
  $res = curl.exe -s -i -X POST http://localhost:3000/api/auth/login `
    -H "Content-Type: application/json" `
    -d '{"email":"test@example.com","password":"Password123!"}'
  $status = ($res | Select-String "HTTP/1.1 (\d+)").Matches.Groups[1].Value
  $remaining = ($res | Select-String "x-ratelimit-remaining: (\d+)").Matches.Groups[1].Value
  $body = ($res -split "`r?`n`r?`n")[-1]
  Write-Host "Attempt $i -> HTTP $status | Remaining: $remaining | Body: $body"
}
```

**Expected Sequence**:
* Attempts 1 to 5: Return `HTTP 401` with remaining counts decreasing from `4` down to `0`.
* Attempt 6: Returns `HTTP 429` with `Retry-After` header and the blocked JSON message.

---

## Production Upgrade Path (Distributed Multi-Region Edge)

For multi-region serverless deployments (such as Vercel Edge with multiple independent lambda workers), the storage provider in [`src/lib/rate-limit.ts`](../src/lib/rate-limit.ts) can be swapped from in-memory `Map` to `@upstash/ratelimit` backed by Redis over REST. The middleware signature and route configuration matrix remain unchanged.
