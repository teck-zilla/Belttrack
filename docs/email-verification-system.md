# BeltTrack Email Verification System

## Overview
BeltTrack implements a secure email verification system for new school owners and students.
When a user creates an account (via **Dojo Registration** or **Student Join**), they are automatically logged in to their dashboard, a cryptographically secure 6-digit code generated using Node's `randomBytes` algorithm is dispatched to their email address, and an actionable verification banner is presented on their dashboard.

---

## 1. Cryptographic 6-Digit Code Generation (`crypto.randomBytes`)

Implementation: [`src/lib/email-verification.ts`](../src/lib/email-verification.ts)

The code generator reads 4 bytes from Node.js `crypto.randomBytes` to produce a high-entropy 32-bit unsigned integer, then projects it uniformly into a 6-digit numeric range:

```typescript
import crypto from 'crypto';

export function generateVerificationCode(): string {
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0);
  const code = (100000 + (num % 900000)).toString();
  return code;
}
```

### Security & Integrity Properties:
- **Strict 6-Digit Format**: Output is guaranteed to be between `"100000"` and `"999999"`.
- **Cryptographic Randomness**: Uses OS-level entropy via `crypto.randomBytes` rather than predictable pseudorandom generators like `Math.random()`.
- **6-Minute Expiration**: Codes automatically expire 6 minutes after dispatch (`CODE_EXPIRY_MS = 6 * 60 * 1000`).
- **Brute-Force Lockout**: A maximum of 3 failed verification attempts are permitted per code before the code is invalidated.
- **Resend Cooldown**: A 60-second cooldown rate limit prevents spamming code resends.

---

## 2. Automatic Login & Dashboard Redirection Flow

When an account is created:
1. **Dojo Owner Registration** (`POST /api/schools/register`):
   - School and Owner User records are created atomically in PostgreSQL.
   - The server calls `createAndSendVerificationCode(ownerEmail)`.
   - The UI automatically establishes the owner session via `setSessionUser(..., 'owner', false)` and invokes `login()`.
   - The user is redirected to the Dojo Head Coach Console with `isEmailVerified: false`.
2. **Student Join Registration** (`POST /api/students/join`):
   - Student profile and membership are created with `PENDING_APPROVAL` status.
   - The server calls `createAndSendVerificationCode(studentEmail)`.
   - The UI establishes the student session via `setSessionUser(..., 'student', false)` and invokes `login()`.
   - The user is taken directly to the Student Portal with `isEmailVerified: false`.

---

## 3. Dashboard Verification Banner Component

Component: [`src/components/home/email-verification-banner.tsx`](../src/components/home/email-verification-banner.tsx)  
Container: [`src/components/home/preview-dashboard.tsx`](../src/components/home/preview-dashboard.tsx)

### Visual and Functional Characteristics:
- **Design Token Compliance**: Styled exclusively using BeltTrack design tokens (`bg-warning-container/20`, `border-warning/40`, `text-primary`, `font-headline`, `font-mono`).
- **Interactive Verification**: Contains an inline 6-digit numeric input field with automatic digit filtering.
- **Immediate Feedback**:
  - Displays remaining attempt countdowns on incorrect submissions.
  - Displays a 60-second countdown timer on the "Resend Code" button.
  - On successful verification, transitions to a confirmation alert before dismissing.

---

## 4. API Endpoints

### 4.1 Verify Email Code (`POST /api/auth/verify-email`)
- **Payload**:
  ```json
  {
    "email": "user@example.com",
    "code": "123456"
  }
  ```
- **Responses**:
  - `HTTP 200 OK`: `{"success": true, "message": "Email address verified successfully."}`
  - `HTTP 400 Bad Request`: `{"error": "Incorrect code. 4 attempts remaining."}`

### 4.2 Check Verification Status (`GET /api/auth/verify-email?email=user@example.com`)
- **Response**:
  - `HTTP 200 OK`: `{"email": "user@example.com", "verified": false}`

### 4.3 Resend Verification Code (`POST /api/auth/resend-verification`)
- **Payload**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Responses**:
  - `HTTP 200 OK`: `{"success": true, "message": "Verification code resent successfully."}`
  - `HTTP 429 Too Many Requests`: `{"error": "Please wait 45 seconds before requesting a new code.", "retryAfter": 45}`

---

## 5. Automated Verification Testing

You can run the automated verification test suite locally:

```bash
npm run test:email-verify
```

### Test Coverage:
1. `randomBytes` 6-digit uniform distribution and format verification.
2. Code creation, store persistence, and 6-minute expiration calculation.
3. Transactional email dispatch logging.
4. Mismatched code rejection with attempt tracking.
5. 60-second resend cooldown rate limit enforcement.
6. Successful verification and state updating (`isEmailVerified = true`).
7. Expired code rejection.
8. Maximum attempt (3 tries) lockout.

---

## 6. PostgreSQL Database Persistence & Migration

### Schema Model
The `User` model in `prisma/schema.prisma` persists verification status via:
```prisma
model User {
  id               String            @id @default(uuid())
  ...
  isEmailVerified  Boolean           @default(false) @map("email_verified")
  ...
}
```

### Applied Migration
Migration: [`prisma/migrations/20261110100000_add_user_email_verified/migration.sql`](../prisma/migrations/20261110100000_add_user_email_verified/migration.sql)
- **DDL Execution**:
  ```sql
  ALTER TABLE "User" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;
  UPDATE "User" SET "email_verified" = true WHERE "email" = 'headcoach@kaizenbjj.org';
  ```
- **Deployment**: Applied via `npx prisma migrate deploy` targeting direct PostgreSQL port `5432`.
- **Runtime Integration**: Route handlers in `/api/auth/verify-email`, `/api/auth/me`, and `/api/auth/login` persist and query the column directly, falling back gracefully to memory store checks.

---

## 7. SMTP Transporter Integration

### Overview
Implementation: [`src/lib/email-verification.ts`](../src/lib/email-verification.ts)

BeltTrack supports outbound transactional email delivery via `nodemailer`. When SMTP environment variables are configured, verification emails are dispatched over SMTP with a responsive HTML template and plaintext fallback. When SMTP is unconfigured or during local offline development, it gracefully falls back to structured console logging.

### Environment Variables
Configure the following in `.env` or `.env.local`:
```env
# SMTP Outbound Email Configuration
SMTP_HOST=smtp.sendgrid.net           # e.g., smtp.resend.com, email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587                         # 587 (TLS/STARTTLS) or 465 (SSL)
SMTP_SECURE=false                     # 'true' for port 465, 'false' for 587
SMTP_USER=apikey                      # SMTP username or API key
SMTP_PASS=your-smtp-api-key           # SMTP password or token
SMTP_FROM="BeltTrack Dojo <no-reply@yourdomain.com>"
```

### Automated SMTP Test Suite
Run the automated test suite:
```bash
npm run test:smtp
```



