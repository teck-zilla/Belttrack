# BeltTrack Server-Side Validation Terminal Tests

## Overview
This document contains the terminal commands to test and verify BeltTrack's server-side Zod validation schemas, business logic guards, and error responses directly via the command line.

These tests hit the authoritative Next.js API route handlers running on your local server. They verify that malformed, incomplete, or malicious payloads are rejected at the server boundary with proper HTTP status codes (`400 Bad Request`, `401 Unauthorized`, `404 Not Found`, or `409 Conflict`) and clear error messages, completely independent of the client UI.

---

## Prerequisites

1. **Development Server Running**:
   Ensure the Next.js development server is active in a terminal:
   ```powershell
   npm run dev
   ```
   The endpoints will be reachable at `http://localhost:3000`.

2. **PowerShell Terminal Syntax**:
   * On Windows PowerShell, use `curl.exe` rather than `curl` to ensure you execute native cURL instead of PowerShell's `Invoke-WebRequest` alias.
   * Single quotes around the JSON payload `-d '{...}'` prevent PowerShell from stripping internal double quotes.
   * The flag `-s` runs cURL in silent mode (hiding progress meters), while `-w "\nHTTP Status: %{http_code}\n"` prints the exact HTTP status code returned by the server.

---

## 1. School Registration Tests (`POST /api/schools/register`)

Target Handler: [`src/app/api/schools/register/route.ts`](../src/app/api/schools/register/route.ts)  
Active Schema: `schoolRegistrationSchema` in [`src/lib/validation/schemas.ts`](../src/lib/validation/schemas.ts)

---

### Test 1.1: School Name Below 4 Characters
* **Rule**: School name must be between 4 and 80 characters (`min(4)`).
* **Terminal Command**:
  ```powershell
  curl.exe -s -X POST http://localhost:3000/api/schools/register `
    -H "Content-Type: application/json" `
    -d '{"schoolName":"Abc","discipline":"brazilian_jiu_jitsu","ownerFullName":"Marcus Aurelius","ownerEmail":"marcus@kaizen.com","city":"London","country":"UK"}' `
    -w "`nHTTP Status: %{http_code}`n"
  ```
* **Expected Response**:
  ```json
  {"error":"School name must be above 3 characters"}
  HTTP Status: 400
  ```

---

### Test 1.2: Owner Name Without at Least 2 Words
* **Rule**: Owner full name must contain at least 2 distinct words.
* **Terminal Command**:
  ```powershell
  curl.exe -s -X POST http://localhost:3000/api/schools/register `
    -H "Content-Type: application/json" `
    -d '{"schoolName":"Kaizen BJJ Academy","discipline":"brazilian_jiu_jitsu","ownerFullName":"Sensei","ownerEmail":"sensei@kaizen.com","city":"London","country":"UK"}' `
    -w "`nHTTP Status: %{http_code}`n"
  ```
* **Expected Response**:
  ```json
  {"error":"Owner name must have at least 2 words or names"}
  HTTP Status: 400
  ```

---

### Test 1.3: Password Violates Complexity Policy
* **Rule**: Password must be 6 to 11 characters and contain at least 1 letter, 1 number, and 1 special symbol.
* **Terminal Command**:
  ```powershell
  curl.exe -s -X POST http://localhost:3000/api/schools/register `
    -H "Content-Type: application/json" `
    -d '{"schoolName":"Kaizen BJJ Academy","discipline":"brazilian_jiu_jitsu","ownerFullName":"Marcus Aurelius","ownerEmail":"marcus@kaizen.com","city":"London","country":"UK","password":"weak"}' `
    -w "`nHTTP Status: %{http_code}`n"
  ```
* **Expected Response**:
  ```json
  {"error":"wrong details"}
  HTTP Status: 400
  ```

---

### Test 1.4: Invalid Owner Email Format
* **Rule**: Must be a valid email structure with trimmed whitespace and lowercase normalization.
* **Terminal Command**:
  ```powershell
  curl.exe -s -X POST http://localhost:3000/api/schools/register `
    -H "Content-Type: application/json" `
    -d '{"schoolName":"Kaizen BJJ Academy","discipline":"brazilian_jiu_jitsu","ownerFullName":"Marcus Aurelius","ownerEmail":"notanemail","city":"London","country":"UK"}' `
    -w "`nHTTP Status: %{http_code}`n"
  ```
* **Expected Response**:
  ```json
  {"error":"enter a valid email address"}
  HTTP Status: 400
  ```

---

### Test 1.5: Invalid Martial Arts Discipline
* **Rule**: Discipline must be one of the allowed taxonomy values (`brazilian_jiu_jitsu`, `judo`, `karate`, `taekwondo`, `muay_thai`, `krav_maga`).
* **Terminal Command**:
  ```powershell
  curl.exe -s -X POST http://localhost:3000/api/schools/register `
    -H "Content-Type: application/json" `
    -d '{"schoolName":"Kaizen BJJ Academy","discipline":"boxing","ownerFullName":"Marcus Aurelius","ownerEmail":"marcus@kaizen.com","city":"London","country":"UK"}' `
    -w "`nHTTP Status: %{http_code}`n"
  ```
* **Expected Response**:
  ```json
  {"error":"wrong details"}
  HTTP Status: 400
  ```

---

### Test 1.6: Malformed Custom Join Code
* **Rule**: Custom join codes must follow the 6-4-4 regex pattern `^[A-Za-z]{1,6}-[A-Za-z]{1,4}-[0-9]{1,4}$`.
* **Terminal Command**:
  ```powershell
  curl.exe -s -X POST http://localhost:3000/api/schools/register `
    -H "Content-Type: application/json" `
    -d '{"schoolName":"Kaizen BJJ Academy","discipline":"brazilian_jiu_jitsu","ownerFullName":"Marcus Aurelius","ownerEmail":"marcus@kaizen.com","city":"London","country":"UK","customCode":"INVALID_JOIN_CODE"}' `
    -w "`nHTTP Status: %{http_code}`n"
  ```
* **Expected Response**:
  ```json
  {"error":"wrong details"}
  HTTP Status: 400
  ```

---

## 2. Student & Minor Guardian Join Tests (`POST /api/students/join`)

Target Handler: [`src/app/api/students/join/route.ts`](../src/app/api/students/join/route.ts)  
Active Schema: `studentJoinCodeSchema` in [`src/lib/validation/schemas.ts`](../src/lib/validation/schemas.ts)

---

### Test 2.1: Minor Student Without Guardian Full Name
* **Rule**: If `isMinor: true`, `guardianFullName` is strictly required.
* **Terminal Command**:
  ```powershell
  curl.exe -s -X POST http://localhost:3000/api/students/join `
    -H "Content-Type: application/json" `
    -d '{"registrationCode":"KAIZEN-BJJ-2026","studentFullName":"Alex Mercer","studentEmail":"alex@example.com","password":"Alex2026!","isMinor":true}' `
    -w "`nHTTP Status: %{http_code}`n"
  ```
* **Expected Response**:
  ```json
  {"error":"Guardian full name is required for minor students"}
  HTTP Status: 400
  ```

---

### Test 2.2: Guardian Full Name Under 2 Words
* **Rule**: When provided, `guardianFullName` must contain at least 2 distinct words.
* **Terminal Command**:
  ```powershell
  curl.exe -s -X POST http://localhost:3000/api/students/join `
    -H "Content-Type: application/json" `
    -d '{"registrationCode":"KAIZEN-BJJ-2026","studentFullName":"Alex Mercer","studentEmail":"alex@example.com","password":"Alex2026!","isMinor":true,"guardianFullName":"Parent"}' `
    -w "`nHTTP Status: %{http_code}`n"
  ```
* **Expected Response**:
  ```json
  {"error":"Guardian name must be at least 3 characters and have at least 2 words or names"}
  HTTP Status: 400
  ```

---

### Test 2.3: Student Full Name Under 2 Words
* **Rule**: Student full name must contain at least 2 distinct words.
* **Terminal Command**:
  ```powershell
  curl.exe -s -X POST http://localhost:3000/api/students/join `
    -H "Content-Type: application/json" `
    -d '{"registrationCode":"KAIZEN-BJJ-2026","studentFullName":"Alex","studentEmail":"alex@example.com","password":"Alex2026!","isMinor":false}' `
    -w "`nHTTP Status: %{http_code}`n"
  ```
* **Expected Response**:
  ```json
  {"error":"Student name must have at least 2 words or names"}
  HTTP Status: 400
  ```

---

### Test 2.4: Malformed Join Code Pattern
* **Rule**: Join code must adhere strictly to the 6-4-4 regex pattern `^[A-Za-z]{1,6}-[A-Za-z]{1,4}-[0-9]{1,4}$`.
* **Terminal Command**:
  ```powershell
  curl.exe -s -X POST http://localhost:3000/api/students/join `
    -H "Content-Type: application/json" `
    -d '{"registrationCode":"INVALIDCODE","studentFullName":"Alex Mercer","studentEmail":"alex@example.com","password":"Alex2026!","isMinor":false}' `
    -w "`nHTTP Status: %{http_code}`n"
  ```
* **Expected Response**:
  ```json
  {"error":"wrong details"}
  HTTP Status: 400
  ```

---

### Test 2.5: Non-Existent or Inactive Join Code
* **Rule**: The registration code must match an active accredited school record in the database.
* **Terminal Command**:
  ```powershell
  curl.exe -s -X POST http://localhost:3000/api/students/join `
    -H "Content-Type: application/json" `
    -d '{"registrationCode":"NOPE-BJJ-9999","studentFullName":"Alex Mercer","studentEmail":"alex@example.com","password":"Alex2026!","isMinor":false}' `
    -w "`nHTTP Status: %{http_code}`n"
  ```
* **Expected Response**:
  ```json
  {"error":"Registration code \"NOPE-BJJ-9999\" is invalid or inactive."}
  HTTP Status: 404
  ```

---

### Test 2.6: Student Password Violates Complexity Policy
* **Rule**: Password must be 6 to 11 characters with letters, numbers, and special characters.
* **Terminal Command**:
  ```powershell
  curl.exe -s -X POST http://localhost:3000/api/students/join `
    -H "Content-Type: application/json" `
    -d '{"registrationCode":"KAIZEN-BJJ-2026","studentFullName":"Alex Mercer","studentEmail":"alex@example.com","password":"123","isMinor":false}' `
    -w "`nHTTP Status: %{http_code}`n"
  ```
* **Expected Response**:
  ```json
  {"error":"wrong details"}
  HTTP Status: 400
  ```

---

## 3. Sign-In / Login Authentication Tests (`POST /api/auth/login`)

Target Handler: [`src/app/api/auth/login/route.ts`](../src/app/api/auth/login/route.ts)  
Active Schema: `loginSchema` in [`src/lib/validation/schemas.ts`](../src/lib/validation/schemas.ts)

---

### Test 3.1: Missing Both Email and School Code Identifiers
* **Rule**: The request must provide either an `email` or a `schoolCode`.
* **Terminal Command**:
  ```powershell
  curl.exe -s -X POST http://localhost:3000/api/auth/login `
    -H "Content-Type: application/json" `
    -d '{"password":"Password123!"}' `
    -w "`nHTTP Status: %{http_code}`n"
  ```
* **Expected Response**:
  ```json
  {"error":"Either email or school code is required"}
  HTTP Status: 400
  ```

---

### Test 3.2: Invalid Email Address Format
* **Rule**: If provided, the email identifier must be a valid email structure.
* **Terminal Command**:
  ```powershell
  curl.exe -s -X POST http://localhost:3000/api/auth/login `
    -H "Content-Type: application/json" `
    -d '{"email":"not-an-email","password":"Password123!"}' `
    -w "`nHTTP Status: %{http_code}`n"
  ```
* **Expected Response**:
  ```json
  {"error":"enter a valid email address"}
  HTTP Status: 400
  ```

---

### Test 3.3: Malformed School Code Pattern
* **Rule**: If provided, the school code must match the 6-4-4 format.
* **Terminal Command**:
  ```powershell
  curl.exe -s -X POST http://localhost:3000/api/auth/login `
    -H "Content-Type: application/json" `
    -d '{"schoolCode":"BADCODE","password":"Password123!"}' `
    -w "`nHTTP Status: %{http_code}`n"
  ```
* **Expected Response**:
  ```json
  {"error":"wrong details"}
  HTTP Status: 400
  ```

---

### Test 3.4: Non-Existent School Code
* **Rule**: If a 6-4-4 school code is provided, an accredited school must exist in the database.
* **Terminal Command**:
  ```powershell
  curl.exe -s -X POST http://localhost:3000/api/auth/login `
    -H "Content-Type: application/json" `
    -d '{"schoolCode":"FAKE-BJJ-9999","password":"Password123!"}' `
    -w "`nHTTP Status: %{http_code}`n"
  ```
* **Expected Response**:
  ```json
  {"error":"No accredited school found for join code \"FAKE-BJJ-9999\"."}
  HTTP Status: 404
  ```

---

### Test 3.5: Non-Existent Account / Wrong Password
* **Rule**: Valid email format but incorrect credentials or non-existent account must be rejected with HTTP 401.
* **Terminal Command**:
  ```powershell
  curl.exe -s -X POST http://localhost:3000/api/auth/login `
    -H "Content-Type: application/json" `
    -d '{"email":"nobody@example.com","password":"WrongPassword123!"}' `
    -w "`nHTTP Status: %{http_code}`n"
  ```
* **Expected Response**:
  ```json
  {"error":"Invalid login credentials"}
  HTTP Status: 401
  ```

---

## 4. IP Rate Limiting Tests (`HTTP 429 Too Many Requests`)

Target Handler: Next.js Middleware ([`src/middleware.ts`](../src/middleware.ts))  
Active Rate Limiter: In-Memory Sliding Window ([`src/lib/rate-limit.ts`](../src/lib/rate-limit.ts))

---

### Test 4.1: Login Endpoint Rate Limit (Max 5 Requests / 15 Minutes)
* **Rule**: Exceeding 5 login requests within 15 minutes from the same IP immediately triggers `HTTP 429 Too Many Requests`.
* **Terminal Test Loop (PowerShell)**:
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
* **Expected Output Sequence**:
  ```text
  Attempt 1 -> HTTP 401 | Remaining: 4 | Body: {"error":"Invalid login credentials"}
  Attempt 2 -> HTTP 401 | Remaining: 3 | Body: {"error":"Invalid login credentials"}
  Attempt 3 -> HTTP 401 | Remaining: 2 | Body: {"error":"Invalid login credentials"}
  Attempt 4 -> HTTP 401 | Remaining: 1 | Body: {"error":"Invalid login credentials"}
  Attempt 5 -> HTTP 401 | Remaining: 0 | Body: {"error":"Invalid login credentials"}
  Attempt 6 -> HTTP 429 | Remaining: 0 | Body: {"error":"Too many login attempts from this IP address. Please try again in 15 minutes."}
  ```
* **Expected 429 Response Headers**:
  - `HTTP/1.1 429 Too Many Requests`
  - `retry-after: <seconds_remaining>`
  - `x-ratelimit-limit: 5`
  - `x-ratelimit-remaining: 0`
  - `x-ratelimit-reset: <unix_timestamp>`

---

## 5. Automated PowerShell Verification Suite

You can run all server-side validation tests sequentially in a single PowerShell block to verify API health:

```powershell
$tests = @(
  @{ Name="1.1 Short School Name"; Url="http://localhost:3000/api/schools/register"; Body='{"schoolName":"Abc","discipline":"brazilian_jiu_jitsu","ownerFullName":"Marcus Aurelius","ownerEmail":"m@k.com","city":"London","country":"UK"}'; Expected=400 },
  @{ Name="1.2 Single-word Owner"; Url="http://localhost:3000/api/schools/register"; Body='{"schoolName":"Kaizen BJJ","discipline":"brazilian_jiu_jitsu","ownerFullName":"Sensei","ownerEmail":"m@k.com","city":"London","country":"UK"}'; Expected=400 },
  @{ Name="1.3 Weak Owner Password"; Url="http://localhost:3000/api/schools/register"; Body='{"schoolName":"Kaizen BJJ","discipline":"brazilian_jiu_jitsu","ownerFullName":"Marcus Aurelius","ownerEmail":"m@k.com","city":"London","country":"UK","password":"weak"}'; Expected=400 },
  @{ Name="2.1 Minor Without Guardian"; Url="http://localhost:3000/api/students/join"; Body='{"registrationCode":"KAIZEN-BJJ-2026","studentFullName":"Alex Mercer","studentEmail":"alex@example.com","password":"Alex2026!","isMinor":true}'; Expected=400 },
  @{ Name="2.2 Malformed Join Code"; Url="http://localhost:3000/api/students/join"; Body='{"registrationCode":"BADCODE","studentFullName":"Alex Mercer","studentEmail":"alex@example.com","password":"Alex2026!","isMinor":false}'; Expected=400 },
  @{ Name="2.3 Non-existent School Code"; Url="http://localhost:3000/api/students/join"; Body='{"registrationCode":"NOPE-BJJ-9999","studentFullName":"Alex Mercer","studentEmail":"alex@example.com","password":"Alex2026!","isMinor":false}'; Expected=404 },
  @{ Name="3.1 Missing Login Identifiers"; Url="http://localhost:3000/api/auth/login"; Body='{"password":"Password123!"}'; Expected=400 },
  @{ Name="3.2 Invalid Email Login"; Url="http://localhost:3000/api/auth/login"; Body='{"email":"invalid-email","password":"Password123!"}'; Expected=400 },
  @{ Name="3.3 Non-existent School Login"; Url="http://localhost:3000/api/auth/login"; Body='{"schoolCode":"FAKE-BJJ-9999","password":"Password123!"}'; Expected=404 },
  @{ Name="3.4 Invalid Auth Credentials"; Url="http://localhost:3000/api/auth/login"; Body='{"email":"nobody@example.com","password":"WrongPassword123!"}'; Expected=401 }
)

Write-Host "--- Running BeltTrack Server-Side Validation Suite ---" -ForegroundColor Cyan
foreach ($t in $tests) {
  $res = curl.exe -s -X POST $t.Url -H "Content-Type: application/json" -d $t.Body -w "%{http_code}"
  $status = [int]$res.Substring($res.Length - 3)
  $body = $res.Substring(0, $res.Length - 3)
  if ($status -eq $t.Expected) {
    Write-Host "[PASS] $($t.Name) -> HTTP $status" -ForegroundColor Green
  } else {
    Write-Host "[FAIL] $($t.Name) -> Expected HTTP $($t.Expected), got HTTP $status. Body: $body" -ForegroundColor Red
  }
}
```

---

## 6. Summary Matrix of Server-Side Enforcement

| Test Scenario | Target Endpoint | HTTP Status | Enforcing Layer | Zod Validation / Security Rule |
| :--- | :--- | :--- | :--- | :--- |
| **Short School Name** | `POST /api/schools/register` | `400 Bad Request` | Zod (`schoolRegistrationSchema`) | `min(4)` length rule |
| **Single-Word Owner Name** | `POST /api/schools/register` | `400 Bad Request` | Zod (`schoolRegistrationSchema`) | `.refine()` $\ge 2$ words |
| **Weak Password** | `POST /api/schools/register` | `400 Bad Request` | Zod (`schoolRegistrationSchema`) | Regex complexity & length $6-11$ |
| **Invalid Discipline Enum** | `POST /api/schools/register` | `400 Bad Request` | Zod (`schoolRegistrationSchema`) | `disciplineEnum` membership |
| **Minor Without Guardian** | `POST /api/students/join` | `400 Bad Request` | Zod (`studentJoinCodeSchema`) | Conditional cross-field `.refine()` |
| **Single-Word Student Name**| `POST /api/students/join` | `400 Bad Request` | Zod (`studentJoinCodeSchema`) | `.refine()` $\ge 2$ words |
| **Malformed Join Code** | `POST /api/students/join` | `400 Bad Request` | Zod (`studentJoinCodeSchema`) | 6-4-4 Regex pattern |
| **Inactive/Non-existent Code**| `POST /api/students/join` | `404 Not Found` | Prisma Route Handler | `prisma.school.findUnique()` & `isCodeActive` |
| **Duplicate Student Email** | `POST /api/students/join` | `409 Conflict` | Prisma Route Handler | `prisma.user.findUnique()` email uniqueness |
| **Missing Login Identifiers**| `POST /api/auth/login` | `400 Bad Request` | Zod (`loginSchema`) | Refine requires `email` OR `schoolCode` |
| **Non-existent School Code** | `POST /api/auth/login` | `404 Not Found` | Prisma Route Handler | School lookup by 6-4-4 join code |
| **Invalid Auth Credentials**| `POST /api/auth/login` | `401 Unauthorized` | Supabase Auth / Fallback | Secure credential verification failure |
| **Brute-Force Rate Limiting**| `POST /api/auth/login` | `429 Too Many Requests` | Next.js Middleware (`rate-limit.ts`) | 5 requests per 15 min per IP |
| **Join Code Enumeration** | `POST /api/students/join` | `429 Too Many Requests` | Next.js Middleware (`rate-limit.ts`) | 10 requests per 15 min per IP |
| **School Register Flooding**| `POST /api/schools/register`| `429 Too Many Requests` | Next.js Middleware (`rate-limit.ts`) | 5 requests per 1 hour per IP |

