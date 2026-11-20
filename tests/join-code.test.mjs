import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const joinCodeRoute = await readFile(
  new URL('../src/app/api/schools/join-code/route.ts', import.meta.url),
  'utf8'
);

test('join code management is owner-only and audited', () => {
  assert.match(joinCodeRoute, /requireActiveStaff/);
  assert.match(joinCodeRoute, /Only the school owner may manage join codes/);
  assert.match(joinCodeRoute, /writeAuditLog/);
  assert.match(joinCodeRoute, /JOIN_CODE_ROTATED/);
  assert.match(joinCodeRoute, /JOIN_CODE_REVOKED/);
  assert.match(joinCodeRoute, /isCodeActive/);
});

test('join code route does not trust body-supplied school identity', () => {
  assert.match(joinCodeRoute, /guard\.user\.schoolId/);
  assert.doesNotMatch(joinCodeRoute, /body\.schoolId/);
});