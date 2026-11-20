import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const accountDeletion = await readFile(
  new URL('../src/app/api/account/deletion/route.ts', import.meta.url),
  'utf8'
);
const schoolDeletion = await readFile(
  new URL('../src/app/api/schools/deletion/route.ts', import.meta.url),
  'utf8'
);
const deletionRequests = await readFile(
  new URL('../src/app/api/schools/deletion-requests/route.ts', import.meta.url),
  'utf8'
);
const purge = await readFile(
  new URL('../src/app/api/internal/deletions/purge/route.ts', import.meta.url),
  'utf8'
);

test('account deletion routes append audit events', () => {
  assert.match(accountDeletion, /writeAuditLog/);
  assert.match(accountDeletion, /ACCOUNT_DELETION_REQUESTED/);
  assert.match(accountDeletion, /ACCOUNT_DELETION_CANCELLED/);
});

test('school deletion routes append audit events', () => {
  assert.match(schoolDeletion, /writeAuditLog/);
  assert.match(schoolDeletion, /SCHOOL_DELETION_SCHEDULED/);
  assert.match(schoolDeletion, /SCHOOL_DELETION_CANCELLED/);
});

test('staff deletion review routes append audit events', () => {
  assert.match(deletionRequests, /writeAuditLog/);
  assert.match(deletionRequests, /MEMBER_DELETION_SCHEDULED/);
  assert.match(deletionRequests, /MEMBER_DELETION_REJECTED/);
  assert.match(deletionRequests, /MEMBER_DELETION_APPROVED/);
});

test('purge route appends completion and failure audit events', () => {
  assert.match(purge, /writeAuditLog/);
  assert.match(purge, /DELETION_PURGE_COMPLETED/);
  assert.match(purge, /DELETION_PURGE_FAILED/);
});