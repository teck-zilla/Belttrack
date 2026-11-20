import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const authContext = await readFile(
  new URL('../src/context/auth-context.tsx', import.meta.url),
  'utf8'
);
const page = await readFile(new URL('../src/app/page.tsx', import.meta.url), 'utf8');
const joinModal = await readFile(
  new URL('../src/components/home/student-join-modal.tsx', import.meta.url),
  'utf8'
);
const tenantContext = await readFile(
  new URL('../src/context/tenant-context.tsx', import.meta.url),
  'utf8'
);
const approvalModal = await readFile(
  new URL('../src/components/home/member-approval-modal.tsx', import.meta.url),
  'utf8'
);
const topNav = await readFile(
  new URL('../src/components/layout/top-nav.tsx', import.meta.url),
  'utf8'
);

test('client sessions cannot be synthesized from fallback data', () => {
  assert.doesNotMatch(authContext, /setSessionUser/);
  assert.doesNotMatch(page, /setSessionUser/);
  assert.doesNotMatch(joinModal, /setSessionUser/);
  assert.match(authContext, /sessionError/);
  assert.match(authContext, /resetToPreview\(\)/);
  assert.match(authContext, /if \(!res\.ok\)/);
  assert.match(topNav, /sessionError/);
});

test('approval failures do not produce optimistic real state', () => {
  assert.match(tenantContext, /approvalError/);
  assert.match(tenantContext, /clearApprovalError/);
  assert.match(tenantContext, /target\.school_id === DEFAULT_DEMO_SCHOOL\.id/);
  assert.doesNotMatch(tenantContext, /retain scoped local demo state/);
  assert.match(approvalModal, /approvalError/);
});
