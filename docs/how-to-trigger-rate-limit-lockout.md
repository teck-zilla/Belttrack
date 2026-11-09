# How to Trigger the Rate Limiting Lockout Error Message

## Overview
BeltTrack enforces strict IP-based rate limiting on sensitive routes to protect against brute-force password guessing, credential stuffing, and join-code enumeration.

This guide details the two primary methods to deliberately trigger and verify the `HTTP 429 Too Many Requests` lockout message during development and testing:
1. **Browser UI Visual Method**: Directly inside the web application interface.
2. **Terminal Instant Method**: Using PowerShell and `curl.exe` (with optional simulated IP isolation).

---

## Method 1: In the Browser UI (Visual Testing)

Use this method to verify how the application's user interface presents the lockout warning in the error banner.

### Step-by-Step Instructions:
1. Ensure the development server is running:
   ```powershell
   npm run dev
   ```
2. Open your browser and navigate to **`http://localhost:3000`**.
3. In the top navigation bar, click the **"Sign In"** button to open the authentication modal ([`LoginModal`](../src/components/home/login-modal.tsx)).
4. Select the **"Student / Member"** tab.
5. Enter test credentials:
   * **Email Address**: `test@example.com`
   * **Password**: `WrongPassword123!`
6. Click the **"Sign In"** button **6 consecutive times**:

### Visual Progression:
* **Clicks 1 through 5**:
  - The server evaluates the credentials, rejects the login, and returns `HTTP 401 Unauthorized`.
  - The UI displays:
    ```text
    Invalid login credentials
    ```
  - Behind the scenes, the header `X-RateLimit-Remaining` decrements from `4` down to `0`.
* **Click 6 (Threshold Breached)**:
  - The Next.js middleware ([`src/middleware.ts`](../src/middleware.ts)) halts the request before executing any database queries and returns `HTTP 429 Too Many Requests`.
  - The modal's red feedback banner dynamically displays:
    ```text
    Too many login attempts from this IP address. Please try again in 15 minutes.
    ```

---

## Method 2: Via Terminal (Instant Trigger)

Use this method to test the lockout programmatically without having to manually click through the web UI.

---

### Option A: Lock Out Your Local Browser Session (`127.0.0.1`)
This command fires 6 rapid requests from your loopback address. It exhausts your local browser's login quota immediately:

```powershell
1..6 | ForEach-Object {
  curl.exe -s -X POST http://localhost:3000/api/auth/login `
    -H "Content-Type: application/json" `
    -d '{"email":"test@example.com","password":"Password123!"}'
}
```

#### Terminal Output:
```json
{"error":"Invalid login credentials"}
{"error":"Invalid login credentials"}
{"error":"Invalid login credentials"}
{"error":"Invalid login credentials"}
{"error":"Invalid login credentials"}
{"error":"Too many login attempts from this IP address. Please try again in 15 minutes."}
```

*(If you immediately switch to your browser and click "Sign In", the UI will immediately display the lockout banner.)*

---

### Option B: Trigger Lockout on a Simulated IP (Keeps Your Browser Unblocked)
If you want to verify the lockout response without locking out your own development browser session, use the development-only `x-simulated-ip` header:

```powershell
1..6 | ForEach-Object {
  curl.exe -s -X POST http://localhost:3000/api/auth/login `
    -H "Content-Type: application/json" `
    -H "x-simulated-ip: 44.55.66.77" `
    -d '{"email":"test@example.com","password":"Password123!"}'
}
```

#### Terminal Output on Request 6:
```json
{"error":"Too many login attempts from this IP address. Please try again in 15 minutes."}
```

#### Why This Is Useful:
* Client `44.55.66.77` is placed in a 15-minute lockout.
* Your local browser (`127.0.0.1`) remains completely unaffected, allowing you to continue testing other features without interruption.

---

### Option C: Run the Complete Automated Verification Suite
BeltTrack includes an automated test runner that validates the entire lockout cycle across multiple clients:

```powershell
npm run test:rate-limit
```

#### Suite Output:
```text
[Test 3] Exhausting IP_ALPHA to verify HTTP 429 lock-out...
  IP_ALPHA Attempt 5: HTTP 401, Remaining: 0
  IP_ALPHA Attempt 6: HTTP 429, Body: {"error":"Too many login attempts from this IP address. Please try again in 15 minutes."}, Retry-After: 899s
  -> PASS: HTTP 429 successfully returned on threshold breach with Retry-After header.

[Test 4] Verifying unexhausted IP_BETA remains unblocked...
  IP_BETA Attempt 2: HTTP 401, Remaining: 3
  -> PASS: IP_BETA remains completely unaffected by IP_ALPHA lock-out.
```

---

## Response Headers Received on Lockout (`HTTP 429`)

When an IP address is locked out, inspect the raw HTTP response headers using `curl.exe -i`:

```powershell
curl.exe -s -i -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"Password123!"}'
```

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 899
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1794220723

{"error":"Too many login attempts from this IP address. Please try again in 15 minutes."}
```

| Header | Meaning |
| :--- | :--- |
| `HTTP/1.1 429` | Standard HTTP status code for rate limiting (RFC 6585). |
| `Retry-After: 899` | Number of seconds remaining until the IP is permitted to attempt authentication again. |
| `X-RateLimit-Limit: 5` | Maximum requests permitted within the 15-minute window. |
| `X-RateLimit-Remaining: 0` | Current quota remaining (0 indicates blocked). |
| `X-RateLimit-Reset` | Unix epoch timestamp indicating exact expiration of the active window. |

---

## How to Clear the Lockout When Done Testing

Because BeltTrack's development rate limiter uses an in-memory sliding window:

1. **Restart the Next.js Server**:
   - In your server terminal, press `Ctrl + C` to stop `npm run dev`.
   - Start it again with `npm run dev`.
   - All counters and lockouts are cleared instantly.

2. **Temporary Rate Limit Bypass** (for automated UI/E2E test runs):
   - Set the environment variable before starting the server:
     ```powershell
     $env:DISABLE_RATE_LIMIT="true"; npm run dev
     ```
   - Rate limiting checks will immediately return `success: true` for all endpoints.

