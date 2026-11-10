# BeltTrack Verification Failure Simulation Guide

## Overview
This document outlines the testing and simulation procedures for three critical email verification failure modes in BeltTrack:
1. **Failure Mode 1: Expired Verification Code** (submitting after the 6-minute window has elapsed).
2. **Failure Mode 2: Wrong / Mismatched Verification Code** (entering an incorrect 6-digit number).
3. **Failure Mode 3: Same Valid Code Used Twice / Replay Attack** (attempting to reuse an already-consumed one-time code).

BeltTrack persists verification state directly to the PostgreSQL database on the `User` model:
- `verification_code` (`text`, nullable): The active 6-digit one-time password (OTP).
- `verification_expires_at` (`timestamp`, nullable): The UTC expiration timestamp.
- `is_email_verified` (`boolean`): The user's email verification status.

---

## Architecture & Lifecycle State Machine

| State | `verification_code` | `verification_expires_at` | `is_email_verified` | Allowed Actions |
|---|---|---|---|---|
| **Unverified (Active Code)** | `'123456'` | `NOW() + INTERVAL '6 minutes'` | `false` | Submit code, resend after 60s cooldown |
| **Unverified (Expired Code)** | `'123456'` | `NOW() - INTERVAL '10 minutes'` | `false` | Resend fresh code only; submission rejected |
| **Verified (Code Consumed)** | `NULL` | `NULL` | `true` | Full platform access; submissions rejected |

---

## Method 1: Automated Simulation Runner (`npm run simulate:failures`)

BeltTrack includes an automated test runner at [`scripts/simulate-verification-failures.mjs`](../scripts/simulate-verification-failures.mjs) that provisions a dedicated test user in PostgreSQL, executes all three failure simulations sequentially against the database, verifies assertions, and cleans up the test user.

### Execution Command:
```bash
npm run simulate:failures
```

### Expected Output:
```text
======================================================================
       BELTTRACK POSTGRESQL VERIFICATION FAILURE SIMULATION           
======================================================================

Connected to PostgreSQL. Creating test user: test.failure.sim.1794345087805@kaizenbjj.org...

----------------------------------------------------------------------
 [SIMULATION 1] Expired Verification Code
----------------------------------------------------------------------
  Staging in DB: verification_code='111222', verification_expires_at='2026-11-10T21:01:28.268Z'
  Submitting verification request for expired code '111222'...
  Received Response: HTTP 400 -> {"error":"Verification code has expired. Please request a new code."}
  [PASS] HTTP 400 Bad Request returned
  [PASS] Error message identifies code expiration
         -> Verification code has expired. Please request a new code.
  [PASS] Database is_email_verified remains FALSE

----------------------------------------------------------------------
 [SIMULATION 2] Wrong / Incorrect Verification Code
----------------------------------------------------------------------
  Staging in DB: verification_code='333444', verification_expires_at='2026-11-10T21:17:28.555Z'
  Submitting verification request with wrong code '999999'...
  Received Response: HTTP 400 -> {"error":"Incorrect verification code. Please check the code and try again."}
  [PASS] HTTP 400 Bad Request returned
  [PASS] Error message identifies incorrect code
         -> Incorrect verification code. Please check the code and try again.
  [PASS] Database is_email_verified remains FALSE
  [PASS] Active code retained in database for retry

----------------------------------------------------------------------
 [SIMULATION 3] Same Valid Code Used Twice (Replay Attack)
----------------------------------------------------------------------
  Staging in DB: verification_code='555666', verification_expires_at='2026-11-10T21:17:28.555Z'

  [Step 3A] First submission with valid code '555666'...
  Received Response: HTTP 200 -> {"success":true,"message":"Email address verified successfully."}
  [PASS] 1st submission succeeds with HTTP 200 OK
  [PASS] 1st submission confirms verification success
  [PASS] Database is_email_verified is now TRUE
  [PASS] Database verification_code was consumed (nullified)
  [PASS] Database verification_expires_at was nullified

  [Step 3B] Second submission (replay) with exact same code '555666'...
  Received Response: HTTP 400 -> {"error":"This email is already verified. The verification code has already been consumed."}
  [PASS] 2nd submission fails with HTTP 400 Bad Request
  [PASS] Error message identifies code already consumed / already verified
         -> This email is already verified. The verification code has already been consumed.

Cleaning up simulation test user from database...
Cleanup complete.

======================================================================
 SIMULATION SUMMARY: 14 assertions passed, 0 failed
======================================================================
```

---

## Method 2: Manual SQL + API Simulation

You can stage specific states directly using the Supabase SQL Editor or `psql` and submit verification attempts against the Next.js API route (`POST /api/auth/verify-email`).

### Prerequisite: Locate or Seed a Test User
```sql
SELECT id, email, is_email_verified, verification_code, verification_expires_at 
FROM "User" 
WHERE email = 'student@kaizen.org';
```

---

### Simulation 1: Expired Verification Code

#### Step 1: Stage an expired timestamp in PostgreSQL
```sql
UPDATE "User"
SET 
  "verification_code" = '111222',
  "verification_expires_at" = NOW() - INTERVAL '10 minutes',
  "is_email_verified" = false
WHERE "email" = 'student@kaizen.org';
```

#### Step 2: Submit the expired code to the API
```bash
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email": "student@kaizen.org", "code": "111222"}'
```

#### Step 3: Validate API and Database Response
- **HTTP Status**: `400 Bad Request`
- **Response Payload**:
  ```json
  {
    "error": "Verification code has expired. Please request a new code."
  }
  ```
- **Database Invariant**: Run `SELECT is_email_verified FROM "User" WHERE email = 'student@kaizen.org';` &rarr; Returns `false`.

---

### Simulation 2: Wrong / Mismatched Verification Code

#### Step 1: Stage an active code with a valid future expiration
```sql
UPDATE "User"
SET 
  "verification_code" = '333444',
  "verification_expires_at" = NOW() + INTERVAL '6 minutes',
  "is_email_verified" = false
WHERE "email" = 'student@kaizen.org';
```

#### Step 2: Submit a mismatched code (`999999`)
```bash
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email": "student@kaizen.org", "code": "999999"}'
```

#### Step 3: Validate API and Database Response
- **HTTP Status**: `400 Bad Request`
- **Response Payload**:
  ```json
  {
    "error": "Incorrect verification code. Please check the code and try again."
  }
  ```
- **Database Invariant**:
  - `is_email_verified` remains `false`.
  - `verification_code` remains `'333444'`, permitting legitimate subsequent attempts.

---

### Simulation 3: Same Valid Code Used Twice (Replay Attack Prevention)

#### Step 1: Stage a valid code in PostgreSQL
```sql
UPDATE "User"
SET 
  "verification_code" = '555666',
  "verification_expires_at" = NOW() + INTERVAL '6 minutes',
  "is_email_verified" = false
WHERE "email" = 'student@kaizen.org';
```

#### Step 2: First Submission (Legitimate verification)
```bash
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email": "student@kaizen.org", "code": "555666"}'
```
- **HTTP Status**: `200 OK`
- **Response Payload**:
  ```json
  {
    "success": true,
    "message": "Email address verified successfully."
  }
  ```
- **Database Consumption Invariant**:
  ```sql
  SELECT is_email_verified, verification_code, verification_expires_at 
  FROM "User" 
  WHERE email = 'student@kaizen.org';
  ```
  - `is_email_verified` &rarr; `true`
  - `verification_code` &rarr; `NULL` (actively consumed)
  - `verification_expires_at` &rarr; `NULL` (actively consumed)

#### Step 3: Second Submission (Replay attempt with the exact same code)
```bash
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email": "student@kaizen.org", "code": "555666"}'
```
- **HTTP Status**: `400 Bad Request`
- **Response Payload**:
  ```json
  {
    "error": "This email is already verified. The verification code has already been consumed."
  }
  ```
- **Security Guarantee**: Replay attacks are blocked both at the in-memory layer and the database layer.

---

## Security Invariants Enforced

1. **One-Time Password (OTP) Invalidation**: Upon first successful verification, the route handler atomically sets `isEmailVerified: true` and nullifies `verificationCode` and `verificationExpiresAt` in PostgreSQL.
2. **Replay Rejection**: If an already-verified user or an attacker submits any code, the endpoint rejects the request with HTTP `400 Bad Request` before evaluating any credentials.
3. **Tenant & School Isolation**: Verification operations are strictly bound by user email and school tenant context; failures never leak tenant metadata or alter school records.
4. **Brute Force Protection**: Verification attempts are tracked, with permanent invalidation after 3 failed attempts in memory and time-bound expiration in the database.
