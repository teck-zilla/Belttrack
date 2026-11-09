# BeltTrack Client and Server-Side Validation Rules

## Overview
BeltTrack employs a dual-layer validation and enforcement architecture:
1. **Client-Side Validation (Immediate UX Feedback)**: Validates input formatting, lengths, regex patterns, passphrases, and confirmation matching in real-time within interactive React components before form submission.
2. **Server-Side Validation & Security (Authoritative Boundary)**: Next.js Route Handlers strictly parse all incoming JSON payloads with shared Zod schemas (`safeParse(json)`) before triggering any Prisma database transactions or Supabase Auth calls. Any validation failure immediately halts execution with an HTTP `400 Bad Request`.
3. **Database & Multi-Tenant Isolation Constraints**: Prisma schema unique constraints, foreign keys, and runtime tenant checks (`assertTenantMatch`) safeguard tenant isolation at the data layer.

---

## 1. School Registration Rules (Dojo Owner Sign-Up)

* **Client Trigger**: [`SchoolRegistrationModal`](../src/app/page.tsx)
* **Server Route**: [`POST /api/schools/register`](../src/app/api/schools/register/route.ts)
* **Zod Schema**: `schoolRegistrationSchema` in [`src/lib/validation/schemas.ts`](../src/lib/validation/schemas.ts)

| Field | Client-Side Rule | Server-Side Enforcement | Error Message / HTTP Status |
| :--- | :--- | :--- | :--- |
| **School Name** | Length must be between 4 and 80 characters. | `z.string().min(4).max(80)` | "School name must be above 3 characters" (HTTP 400) |
| **Discipline** | Must select one of the allowed martial arts styles. | `z.enum(['brazilian_jiu_jitsu', 'judo', 'karate', 'taekwondo', 'muay_thai', 'krav_maga'])` | "Invalid enum value" (HTTP 400) |
| **Owner Full Name** | Length $\ge 3$ characters; must contain at least 2 distinct words. | `z.string().min(3).max(60).refine(val => val.trim().split(/\s+/).filter(Boolean).length >= 2)` | "Owner name must have at least 2 words or names" (HTTP 400) |
| **Owner Email** | Valid email format, whitespace trimmed, converted to lowercase. | `emailSchema = z.string().trim().toLowerCase().email()` | "enter a valid email address" (HTTP 400) |
| **Password** | 15 to 128 characters; uppercase, lowercase, numbers, symbols, spaces, and passphrases allowed. Real-time strength score (Weak, Fair, Good, Strong). Never silently truncated. | `passwordCreationSchema = z.string().min(15).max(128)` + predictability checks + HaveIBeenPwned breach verification | "Password must be at least 15 characters" / "This password has appeared in a known data breach" / "Password contains a predictable sequence" (HTTP 400) |
| **Confirm Password** | Must match the entered password identically. | `.refine(data => data.password === data.confirmPassword)` | "Passwords do not match" (HTTP 400) |
| **City** | Required; 2 to 50 characters. | `z.string().min(2).max(50)` | "City is required" (HTTP 400) |
| **Country** | Required; 2 to 50 characters. | `z.string().min(2).max(50)` | "Country length should not fall below 2 characters" (HTTP 400) |
| **Timezone** | Select valid IANA timezone string. | `z.string().default('UTC').optional()` | Defaults to "UTC" |
| **Custom Join Code** | Strict 6-4-4 format: up to 6 letters, 4 letters, 4 digits (e.g. `KAIZEN-BJJ-2026`). | `z.string().regex(/^[A-Za-z]{1,6}-[A-Za-z]{1,4}-[0-9]{1,4}$/).optional()` | "wrong details" (HTTP 400) |
| **Terms Acceptance** | Checkbox must be checked to enable submission. | Client form submission gate. | Form button disabled until accepted |

---

## 2. Student & Minor Guardian Join Rules (Join Code Enrollment)

* **Client Trigger**: [`StudentJoinModal`](../src/components/home/student-join-modal.tsx)
* **Server Route**: [`POST /api/students/join`](../src/app/api/students/join/route.ts)
* **Zod Schema**: `studentJoinCodeSchema` in [`src/lib/validation/schemas.ts`](../src/lib/validation/schemas.ts)

| Field | Client-Side Rule | Server-Side Enforcement | Error Message / HTTP Status |
| :--- | :--- | :--- | :--- |
| **Registration Code** | Formatted uppercase 6-4-4 join code matching an active school. | `z.string().regex(/^[A-Za-z]{1,6}-[A-Za-z]{1,4}-[0-9]{1,4}$/)` | "wrong details" (HTTP 400) |
| **Student Full Name** | Length $\ge 3$ characters; must contain at least 2 distinct words. | `z.string().min(3).max(60).refine(val => val.trim().split(/\s+/).filter(Boolean).length >= 2)` | "Student name must have at least 2 words or names" (HTTP 400) |
| **Student Email** | Valid email format, trimmed, and converted to lowercase. | `emailSchema = z.string().trim().toLowerCase().email()` | "enter a valid email address" (HTTP 400) |
| **Password** | 15 to 128 characters; uppercase, lowercase, numbers, symbols, spaces, and passphrases allowed. Real-time strength score (Weak, Fair, Good, Strong). Never silently truncated. | `passwordCreationSchema = z.string().min(15).max(128)` + predictability checks + HaveIBeenPwned breach verification | "Password must be at least 15 characters" / "This password has appeared in a known data breach" / "Password contains a predictable sequence" (HTTP 400) |
| **Confirm Password** | Must match the entered password identically. | `.refine(data => data.password === data.confirmPassword)` | "Passwords do not match" (HTTP 400) |
| **Minor Status** | Checkbox indicating whether student is under 18. | `z.boolean().default(false)` | Defaults to `false` |
| **Guardian Full Name** | **Mandatory** if `isMinor: true`; at least 3 characters and 2 distinct words. | `.refine(data => !data.isMinor || Boolean(data.guardianFullName))` and 2-word check. | "Guardian full name is required for minor students" (HTTP 400) |
| **Guardian Email** | Optional; if provided, must be a valid email. | `optionalEmailSchema = z.union([...]).optional()` | "enter a valid email address" (HTTP 400) |
| **Terms Acceptance** | Checkbox must be checked to enable enrollment. | Client form submission gate. | Form button disabled until accepted |

---

## 3. Sign-In / Login Authentication Rules

* **Client Trigger**: [`LoginModal`](../src/components/home/login-modal.tsx)
* **Server Route**: [`POST /api/auth/login`](../src/app/api/auth/login/route.ts)
* **Zod Schema**: `loginSchema` in [`src/lib/validation/schemas.ts`](../src/lib/validation/schemas.ts)

| Field | Client-Side Rule | Server-Side Enforcement | Error Message / HTTP Status |
| :--- | :--- | :--- | :--- |
| **Identifier** | User must provide either an email or a 6-4-4 School Code. | `.refine(data => Boolean(data.email || data.schoolCode))` | "Either email or school code is required" (HTTP 400) |
| **School Code (Owner)** | Valid 6-4-4 format matching accredited school. | `z.string().regex(/^[A-Za-z]{1,6}-[A-Za-z]{1,4}-[0-9]{1,4}$/).optional()` | "wrong details" (HTTP 400) |
| **Email (Student/Owner)** | Valid normalized email address. | `optionalEmailSchema` | "enter a valid email address" (HTTP 400) |
| **Password** | Required; 1 to 128 characters (preserves backward compatibility with existing accounts). | `z.string().min(1, 'Password is required').max(128)` | "Password is required" (HTTP 400) |

---

## 4. Server-Exclusive Business Logic & Security Enforcements

The following security and integrity constraints are enforced exclusively on the server side:

1. **HaveIBeenPwned $k$-Anonymity Breached Password Verification**:
   * Evaluated only during new account creation (`/api/schools/register` and `/api/students/join`).
   * The server computes the SHA-1 hash of the password, sends only the first 5 characters (prefix) to `https://api.pwnedpasswords.com/range/{prefix}`, and checks if the remaining 35-character suffix appears in the response.
   * If found with count $\ge 1$, the request is rejected with `HTTP 400 Bad Request` ("This password has appeared in a known data breach. Please choose a different, unique passphrase.").
   * Fail-open with 1.5-second timeout ensures registrations are not blocked if the HIBP API is temporarily unreachable.
2. **Predictable Sequence & Repetition Filter**:
   * Rejects repeating characters ($\ge 6$ consecutive identical characters, e.g. `aaaaaa`).
   * Rejects obvious sequential patterns ($\ge 8$ sequential numbers or alphabet characters, e.g. `123456789`, `abcdefgh`).
   * Rejects passwords containing the applicant's name or email prefix.
3. **School Code Uniqueness (Prisma Database)**:
   * During school registration, the server checks `prisma.school.findUnique({ where: { joinCode } })`.
   * If the code already exists, the server rejects with `HTTP 409 Conflict` ("Registration code already in use").
4. **Account Email Uniqueness**:
   * During both school registration and student join, the server queries `prisma.user.findUnique({ where: { email } })`.
   * If the email is registered, the server returns `HTTP 409 Conflict` ("An account with this email already exists").
5. **School Active Status Check**:
   * During student join, the server verifies `school.isCodeActive === true`.
   * If the school code is invalid or deactivated, the server returns `HTTP 404 Not Found`.
6. **Mandatory PENDING_APPROVAL Status**:
   * Regardless of incoming client data, the server forces `status: 'PENDING_APPROVAL'` on all new student user profiles and guardian records.
   * Access to rosters, verified techniques, and belt tracks is blocked until an administrator issues a signed approval.
7. **Strict Multi-Tenant Foreign Key Scoping**:
   * All mutations occur within atomic `prisma.$transaction` blocks.
   * Every created `User`, `StudentProfile`, `GuardianStudent`, and `LedgerEntry` record binds explicitly to `schoolId: school.id`.
   * Cross-tenant operations are rejected by [`assertTenantMatch(recordSchoolId, sessionSchoolId)`](../src/lib/prisma-extension.ts).

---

## 5. Normalization Standards Applied

| Normalization Type | Scope | Rule Applied |
| :--- | :--- | :--- |
| **Email Normalization** | Client & Server | Whitespace trimmed + lowercase folded (`.trim().toLowerCase()`). Mobile inputs configure `autoCapitalize="none"`, `autoCorrect="off"`, and `spellCheck="false"`. |
| **Join Code Normalization** | Client & Server | Strips non-alphanumerics, uppercases characters (`.toUpperCase()`), and formats into canonical 6-4-4 segments. |
| **URL Slug Normalization** | Server | Lowercases and converts punctuation to single hyphens: `schoolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')`. |
| **Receipt Slug Format** | Server & Client | Strictly formatted uppercase taxonomy: `REC-[YEAR]-[DISCIPLINE]-[INCREMENT]`. |
| **Enum Case Normalization** | Server | Maps Prisma uppercase database enums (`OWNER`, `STUDENT`, `ACTIVE`, `PENDING_APPROVAL`) to lowercase domain models (`owner`, `student`, `active`, `pending_approval`). |
| **Currency Normalization** | Server & DB | Amounts in database schemas stored as integer cents (`amountCents`) to eliminate floating-point math rounding errors. |
| **Timestamp Normalization** | Server | All dates serialized to ISO 8601 UTC strings (`.toISOString()`) across the HTTP boundary. |

---

## 6. Future Domain Schemas in [`schemas.ts`](../src/lib/validation/schemas.ts)

* **Technique Sign-Off** (`techniqueSignoffSchema`): Validates UUID format for `schoolId`, `studentId`, `techniqueId`, and maximum 500 characters for coach notes.
* **Roll-Call Attendance Check-In** (`attendanceCheckInSchema`): Validates tenant UUIDs, class identifier names, and optional idempotency keys.
* **Immutable Ledger Entry** (`ledgerEntrySchema`): Validates positive integer cents (`amountCents`), 3-letter currency codes (e.g. `USD`), category enums (`tuition`, `testing_fee`, `uniform_equipment`, `correction_reversal`), and receipt slugs.
