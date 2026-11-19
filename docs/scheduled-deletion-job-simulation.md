# BeltTrack Scheduled Deletion Job Simulation Guide

## Overview

This document shows how to simulate the scheduled background job that finds expired deletion requests and permanently deletes the associated accounts or school tenants.

The timer should only trigger the protected purge endpoint. The endpoint owns the deletion rules.

## Rules enforced by the job

- Soft delete starts at approval: the request becomes `APPROVED`, the user becomes `DELETION_PENDING`, and a school becomes inactive via `isCodeActive = false`.
- The grace period is 14 days from approval: `DELETION_GRACE_PERIOD_DAYS = 14` in `src/lib/account-deletion.ts:5`.
- Hard delete only happens when the request is `APPROVED` and `scheduled_for <= now`.
- The job processes at most 25 due requests per run: `src/app/api/internal/deletions/purge/route.ts:18`.
- `PENDING`, `REJECTED`, `CANCELLED`, and `COMPLETED` requests are ignored.
- User purge deletes the Supabase identity first, then removes BeltTrack DB rows transactionally.
- School purge removes tenant operational data but retains the immutable ledger and anonymizes the `School` row as a tombstone.
- After a successful purge, the request becomes `COMPLETED` with a `completed_at` timestamp.

Related implementation:

- `src/lib/account-deletion.ts`
- `src/app/api/internal/deletions/purge/route.ts`
- `src/app/api/schools/deletion-requests/route.ts`
- `.github/workflows/purge-deletions.yml`
- `docs/account-deletion-simulation-examples.pdf`

---

## Example 1: GitHub Actions timer

The repository already contains a cron workflow:

```yaml
on:
  schedule:
    - cron: '0 * * * *'
  workflow_dispatch:
```

The cron expression runs hourly at minute 0 UTC.

Manual simulation:

```bash
gh workflow run purge-deletions.yml --ref second-branch
```

Scheduled runs require the workflow to exist on the default branch (`main`). Manual dispatch works from `second-branch`.

---

## Example 2: One-shot local purge trigger

Run from the repository root in PowerShell.

```powershell
$env:DELETION_PURGE_SECRET = '<local-secret>'

curl.exe -X POST "http://localhost:3000/api/internal/deletions/purge" `
  -H "Authorization: Bearer $env:DELETION_PURGE_SECRET" `
  -H "Content-Type: application/json" `
  --data '{}'
```

Expected when nothing is due:

```json
{"success":true,"processed":0,"results":[]}
```

Expected when one member is due:

```json
{"success":true,"processed":1,"results":[{"status":"completed","detail":"User purged."}]}
```

A missing or incorrect secret returns HTTP 401.

---

## Example 3: Simulate a timer locally

This loop calls the same protected endpoint every 60 seconds. The endpoint enforces the soft-delete, grace-period, and hard-delete rules, so repeated calls are safe.

```powershell
$env:DELETION_PURGE_SECRET = '<local-secret>'

while ($true) {
  curl.exe --fail-with-body -sS -X POST "http://localhost:3000/api/internal/deletions/purge" `
    -H "Authorization: Bearer $env:DELETION_PURGE_SECRET" `
    -H "Content-Type: application/json" `
    --data '{}'

  Start-Sleep -Seconds 60
}
```

---

## Example 4: End-to-end expired-account simulation

Use a disposable school and disposable accounts only.

### Step 1: Create a member deletion request

Sign in as the disposable student or coach, then submit the request:

```powershell
curl.exe -b student.cookies -c student.cookies -X POST "http://localhost:3000/api/account/deletion" `
  -H "Content-Type: application/json" `
  --data '{"reason":"Scheduled deletion simulation"}'
```

### Step 2: Approve the request as staff

Sign in as a disposable owner or coach, then approve the request:

```powershell
curl.exe -b staff.cookies -c staff.cookies -X PATCH "http://localhost:3000/api/schools/deletion-requests" `
  -H "Content-Type: application/json" `
  --data '{"requestId":"<request-id>","action":"APPROVE","decisionNote":"Simulation"}'
```

The request now has a 14-day `scheduled_for`. The member is soft-deleted but not yet hard-deleted.

### Step 3: Backdate the disposable rows

Backdating simulates the grace period passing.

```sql
UPDATE "DeletionRequest"
SET "status" = 'APPROVED'::"DeletionRequestStatus",
    "reviewed_at" = NOW(),
    "scheduled_for" = NOW() - INTERVAL '1 minute'
WHERE "id" = '<request-id>';

UPDATE "User"
SET "status" = 'DELETION_PENDING'::"MembershipStatus",
    "deletion_scheduled_for" = NOW() - INTERVAL '1 minute'
WHERE "id" = '<target-user-id>';
```

### Step 4: Trigger the job

```powershell
curl.exe -X POST "http://localhost:3000/api/internal/deletions/purge" `
  -H "Authorization: Bearer $env:DELETION_PURGE_SECRET" `
  -H "Content-Type: application/json" `
  --data '{}'
```

### Step 5: Verify the result

```sql
SELECT id, status, scheduled_for, completed_at
FROM "DeletionRequest"
WHERE id = '<request-id>';

SELECT id FROM "User" WHERE id = '<target-user-id>';
```

Expected:

- `DeletionRequest.status` is `COMPLETED`.
- `DeletionRequest.completed_at` is populated.
- The target `User` query returns no rows.

---

## Example 5: School deletion variant

After approving a school deletion request, backdate the disposable school rows:

```sql
UPDATE "DeletionRequest"
SET "status" = 'APPROVED'::"DeletionRequestStatus",
    "scheduled_for" = NOW() - INTERVAL '1 minute'
WHERE "id" = '<school-request-id>';

UPDATE "School"
SET "isCodeActive" = false,
    "deletion_scheduled_for" = NOW() - INTERVAL '1 minute'
WHERE "id" = '<school-id>';
```

Then run the same purge endpoint.

Expected:

- Member users and operational tenant data are deleted.
- The immutable ledger remains.
- The `School` row is retained as a tombstone named `Deleted School`.

---

## Backdating rows from the terminal

Run these commands from the repository root.

### Load `DATABASE_URL` safely

Use this instead of indexing `.Matches[0]` directly. The older one-liner can produce `invalid operation: cannot index null array` when `Select-String` finds no matching `DATABASE_URL` line.

```powershell
if (-not (Test-Path .\.env)) {
  throw ".env not found. Run this from the repo root."
}

$match = Select-String -Path .\.env -Pattern '^\s*DATABASE_URL\s*=' | Select-Object -First 1
if ($null -eq $match) {
  throw "DATABASE_URL was not found in .env"
}

$dbUrl = $match.Line.Substring($match.Line.IndexOf('=') + 1).Trim().Trim('"').Trim("'")
if ([string]::IsNullOrWhiteSpace($dbUrl)) {
  throw "DATABASE_URL is empty"
}
```

Confirm the URL is local without printing it:

```powershell
$dbUrl -match 'localhost|127\.0\.0\.1'
```

Only continue if it returns `True`.

### Find the disposable request and user IDs

```powershell
$findSql = @'
SELECT id, target_user_id, status, scheduled_for
FROM "DeletionRequest"
WHERE target_type = 'USER'
ORDER BY requested_at DESC
LIMIT 5;
'@

psql $dbUrl -c $findSql
```

### Backdate with Prisma CLI

This method does not need `$dbUrl`. Prisma reads `.env` itself.

```powershell
@"
UPDATE "DeletionRequest"
SET "status" = 'APPROVED'::"DeletionRequestStatus",
    "reviewed_at" = NOW(),
    "scheduled_for" = NOW() - INTERVAL '1 minute'
WHERE "id" = '<request-id>';

UPDATE "User"
SET "status" = 'DELETION_PENDING'::"MembershipStatus",
    "deletion_scheduled_for" = NOW() - INTERVAL '1 minute'
WHERE "id" = '<target-user-id>';
"@ | npx prisma db execute --stdin --schema .\prisma\schema.prisma
```

### Backdate a school with Prisma CLI

```powershell
@"
UPDATE "DeletionRequest"
SET "status" = 'APPROVED'::"DeletionRequestStatus",
    "scheduled_for" = NOW() - INTERVAL '1 minute'
WHERE "id" = '<school-request-id>';

UPDATE "School"
SET "isCodeActive" = false,
    "deletion_scheduled_for" = NOW() - INTERVAL '1 minute'
WHERE "id" = '<school-id>';
"@ | npx prisma db execute --stdin --schema .\prisma\schema.prisma
```

---

## Troubleshooting

### Error: `invalid operation: cannot index null array`

Cause: PowerShell tried to read `.Matches[0]` when `Select-String` found no `DATABASE_URL` match.

Fix:

- Run the command from the repository root.
- Confirm `.env` exists.
- Confirm `.env` contains `DATABASE_URL=...`.
- Use the safe parser shown above.
- Skip `$dbUrl` entirely when using `npx prisma db execute --stdin --schema .\prisma\schema.prisma`.

### Purging returns `processed: 0`

Check:

- The request status is `APPROVED`.
- `scheduled_for` is less than or equal to `NOW()`.
- The request has not already been marked `COMPLETED`.
- The purge endpoint is called with a valid bearer token.

```powershell
$checkSql = @'
SELECT id, status, scheduled_for, completed_at
FROM "DeletionRequest"
WHERE id = '<request-id>';
'@

psql $dbUrl -c $checkSql
```

---

## Assumptions

- Simulations use disposable local or staging data.
- The shell is PowerShell on Windows.
- The current directory is the BeltTrack repository root.
- `.env` contains a valid local `DATABASE_URL`.
- `DELETION_PURGE_SECRET` is available in the terminal environment for local runs.
- `APP_BASE_URL` and `DELETION_PURGE_SECRET` are configured in GitHub for workflow runs.
- The production immutable ledger is never used as disposable test data.
