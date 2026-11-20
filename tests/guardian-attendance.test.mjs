import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const attendanceRoute = await readFile(
  new URL('../src/app/api/attendance/route.ts', import.meta.url),
  'utf8'
);
const approvalsRoute = await readFile(
  new URL('../src/app/api/schools/approvals/route.ts', import.meta.url),
  'utf8'
);
const roster = await readFile(new URL('../src/lib/roster.ts', import.meta.url), 'utf8');
const schemas = await readFile(
  new URL('../src/lib/validation/schemas.ts', import.meta.url),
  'utf8'
);
const tenantContext = await readFile(
  new URL('../src/context/tenant-context.tsx', import.meta.url),
  'utf8'
);
const dashboard = await readFile(
  new URL('../src/components/home/preview-dashboard.tsx', import.meta.url),
  'utf8'
);

test('attendance writes are staff-only and server timestamped', () => {
  assert.match(attendanceRoute, /requireActiveStaff\(\)/);
  assert.doesNotMatch(attendanceRoute, /requireActiveMember/);
  assert.match(attendanceRoute, /const attendedAt = new Date\(\);/);
  assert.doesNotMatch(attendanceRoute, /parsed\.data\.attendedAt/);
  assert.doesNotMatch(schemas, /attendedAt:/);
  assert.match(dashboard, /\(!isRealSession \|\| isOwnerGroup\)/);
});

test('student approval activates tenant-scoped guardian links', () => {
  assert.match(approvalsRoute, /guardianActivation/);
  assert.match(approvalsRoute, /isApproved: false/);
  assert.match(approvalsRoute, /data: \{ isApproved: true \}/);
  assert.match(approvalsRoute, /role: 'GUARDIAN'/);
  assert.match(approvalsRoute, /GUARDIAN_LINK_APPROVED/);
  assert.match(approvalsRoute, /guardianLinksApproved: guardianActivation\.length/);
  assert.match(roster, /isApproved: true/);
  assert.match(tenantContext, /guardian_links:/);
});
