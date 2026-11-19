import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const schema = await readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
const extension = await readFile(new URL('../src/lib/prisma-extension.ts', import.meta.url), 'utf8');
const rls = await readFile(new URL('../prisma/rls_policies.sql', import.meta.url), 'utf8');
const auditMigration = await readFile(
  new URL('../prisma/migrations/20261119000000_add_audit_log/migration.sql', import.meta.url),
  'utf8'
);

function extractTenantModels() {
  const setBody = extension.match(/const TENANT_MODELS = new Set\(\[([\s\S]*?)\]\)/)?.[1];
  assert.ok(setBody, 'TENANT_MODELS set must exist');
  return [...setBody.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function modelBlock(model) {
  const block = schema.match(new RegExp(`model ${model}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1];
  assert.ok(block, `${model} model must exist in prisma/schema.prisma`);
  return block;
}

test('every tenant-scoped model binds to school_id', () => {
  const tenantModels = extractTenantModels();
  const scalarOnlyTenantModels = new Set(['DeletionRequest']);

  assert.ok(tenantModels.includes('AuditLog'));

  for (const model of tenantModels) {
    const block = modelBlock(model);
    assert.match(block, /schoolId\s+String\s+@map\("school_id"\)/, `${model} must map schoolId to school_id`);

    if (!scalarOnlyTenantModels.has(model)) {
      assert.match(block, /school\s+School\s+@relation/, `${model} must relate to School`);
    }
  }
});

test('Prisma extension injects schoolId into reads and writes', () => {
  assert.match(extension, /return \{ \.\.\.current, schoolId \}/);
  assert.match(extension, /if \(current\.schoolId !== undefined && current\.schoolId !== schoolId\)/);
  assert.match(extension, /return \{ \.\.\.current, schoolId \}/);
});

test('RLS is enabled and forced for every tenant-scoped table', () => {
  for (const model of extractTenantModels()) {
    assert.match(rls, new RegExp(`ALTER TABLE "${model}" ENABLE ROW LEVEL SECURITY;`));
    assert.match(rls, new RegExp(`ALTER TABLE "${model}" FORCE ROW LEVEL SECURITY;`));
  }
});

test('AuditLog is append-only in RLS and migration SQL', () => {
  assert.match(rls, /audit_log_tenant_select_policy/);
  assert.match(rls, /audit_log_tenant_insert_policy/);
  assert.match(rls, /audit_log_block_update[\s\S]*USING \(false\)/);
  assert.match(rls, /audit_log_block_delete[\s\S]*USING \(false\)/);
  assert.match(auditMigration, /CREATE TRIGGER audit_log_append_only/);
  assert.match(auditMigration, /RAISE EXCEPTION 'AuditLog rows are append-only'/);
});
