/**
 * Audit and optionally remove orphaned Supabase Auth users.
 *
 * An orphan is an auth.users record with no matching BeltTrack User row by
 * supabaseUid or email. Dry-run is the default. Use --delete only after the
 * audit backup has been reviewed.
 *
 * Usage:
 *   node --env-file=.env scripts/audit-orphan-auth-users.mjs
 *   node --env-file=.env scripts/audit-orphan-auth-users.mjs --delete
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const deleteMode = process.argv.includes('--delete');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

async function supabaseRequest(endpoint, options = {}) {
  const response = await fetch(`${supabaseUrl}${endpoint}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(30000)
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message = body?.msg || body?.message || body?.error_description || text || response.statusText;
    throw new Error(`Supabase ${options.method || 'GET'} ${endpoint} failed (${response.status}): ${message}`);
  }

  return body;
}

async function listAllAuthUsers() {
  const perPage = 1000;
  const users = [];

  for (let page = 1; ; page += 1) {
    const data = await supabaseRequest(`/auth/v1/admin/users?page=${page}&per_page=${perPage}`);
    const batch = Array.isArray(data?.users) ? data.users : [];
    users.push(...batch);
    if (batch.length < perPage) break;
  }

  return users;
}

function ensureBackupDirectory() {
  const directory = path.join(os.tmpdir(), 'opencode');
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

const prisma = new PrismaClient();

try {
  const [authUsers, dbUsers] = await Promise.all([
    listAllAuthUsers(),
    prisma.user.findMany({
      select: { id: true, email: true, supabaseUid: true }
    })
  ]);

  const dbIds = new Set(dbUsers.map((user) => user.supabaseUid).filter(Boolean));
  const dbEmails = new Set(dbUsers.map((user) => user.email?.toLowerCase().trim()).filter(Boolean));

  const orphans = authUsers.filter((authUser) => {
    const email = authUser.email?.toLowerCase().trim();
    return !dbIds.has(authUser.id) && !(email && dbEmails.has(email));
  });

  const backup = {
    generatedAt: new Date().toISOString(),
    supabaseUrl,
    deleteMode,
    counts: {
      authUsers: authUsers.length,
      dbUsers: dbUsers.length,
      orphans: orphans.length
    },
    orphans: orphans.map((user) => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      email_confirmed_at: user.email_confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata
    }))
  };

  const backupPath = path.join(
    ensureBackupDirectory(),
    `belttrack-orphan-auth-users-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');

  console.log('ORPHAN AUTH USER AUDIT');
  console.log(`Auth users: ${authUsers.length}`);
  console.log(`BeltTrack DB users: ${dbUsers.length}`);
  console.log(`Orphaned auth users: ${orphans.length}`);
  console.log(`Backup: ${backupPath}`);

  if (orphans.length > 0) {
    console.log('\nOrphaned accounts:');
    for (const orphan of orphans) {
      console.log(`- ${orphan.email || '(no email)'} | id=${orphan.id} | created=${orphan.created_at || 'unknown'}`);
    }
  }

  if (!deleteMode) {
    console.log('\nDry run only. Re-run with --delete to remove the orphaned auth users.');
    process.exitCode = 0;
  } else if (orphans.length === 0) {
    console.log('\nNo orphaned auth users to delete.');
    process.exitCode = 0;
  } else {
    console.log('\nDeleting orphaned auth users...');
    const deleted = [];
    const failed = [];

    for (const orphan of orphans) {
      try {
        await supabaseRequest(`/auth/v1/admin/users/${encodeURIComponent(orphan.id)}`, {
          method: 'DELETE'
        });
        deleted.push(orphan.id);
        console.log(`Deleted ${orphan.email || orphan.id}`);
      } catch (error) {
        failed.push({ id: orphan.id, email: orphan.email, error: error.message });
        console.error(`Failed ${orphan.email || orphan.id}: ${error.message}`);
      }
    }

    console.log(`\nDeleted: ${deleted.length}`);
    console.log(`Failed: ${failed.length}`);
    if (failed.length > 0) {
      console.log(JSON.stringify(failed, null, 2));
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.error('Orphan audit failed:', error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
