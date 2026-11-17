import { timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

export const DELETION_GRACE_PERIOD_DAYS = 14;
const DAY_MS = 86_400_000;

export function getDeletionSchedule(now = new Date()): Date {
  return new Date(now.getTime() + DELETION_GRACE_PERIOD_DAYS * DAY_MS);
}

function isAuthUserNotFound(error: { status?: number; message?: string }): boolean {
  return error.status === 404 || Boolean(error.message?.toLowerCase().includes('not found'));
}

async function deleteManagedAuthUser(supabaseUid: string | null | undefined): Promise<void> {
  if (!supabaseUid) return;

  if (!isSupabaseAdminConfigured()) {
    throw new Error('Managed authentication is not configured. Cannot purge auth identity.');
  }

  const admin = getAdminClient();
  const { error } = await admin.auth.admin.deleteUser(supabaseUid);

  if (error && !isAuthUserNotFound(error)) {
    throw new Error(`Unable to delete managed auth identity: ${error.message}`);
  }
}

export async function purgeUserAccount(
  userId: string,
  expectedSchoolId?: string
): Promise<'purged' | 'missing'> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      ...(expectedSchoolId ? { schoolId: expectedSchoolId } : {})
    },
    select: {
      id: true,
      schoolId: true,
      email: true,
      supabaseUid: true,
      profile: { select: { id: true } }
    }
  });

  if (!user) return 'missing';

  // Auth identity goes first. If the DB transaction then fails, a retry treats
  // the already-deleted Supabase user as success and deletes the DB row.
  await deleteManagedAuthUser(user.supabaseUid);

  await prisma.$transaction(async (tx) => {
    if (user.profile?.id) {
      await tx.inactivityAlert.deleteMany({
        where: { schoolId: user.schoolId, profileId: user.profile.id }
      });
    }

    await tx.verificationCode.deleteMany({
      where: { email: user.email.toLowerCase().trim() }
    });

    await tx.user.delete({ where: { id: user.id } });
  });

  return 'purged';
}

/**
 * Whole-school deletion is a tombstone purge, not a cascade delete. The ledger
 * is append-only and must survive, so the School row is anonymized and retained
 * as the immutable ledger anchor. All member identities and operational data
 * are removed.
 */
export async function purgeSchoolAccount(schoolId: string): Promise<'purged' | 'missing' | 'already_purged'> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      deletedAt: true,
      users: {
        select: {
          id: true,
          email: true,
          supabaseUid: true
        }
      }
    }
  });

  if (!school) return 'missing';
  if (school.deletedAt) return 'already_purged';

  // Fail closed: do not remove tenant data while any managed auth identity
  // remains. Retries are safe because missing auth users are treated as success.
  for (const user of school.users) {
    await deleteManagedAuthUser(user.supabaseUid);
  }

  const emails = school.users.map((user) => user.email.toLowerCase().trim());

  await prisma.$transaction(async (tx) => {
    await tx.inactivityAlert.deleteMany({ where: { schoolId } });

    if (emails.length > 0) {
      await tx.verificationCode.deleteMany({
        where: { email: { in: emails } }
      });
    }

    await tx.user.deleteMany({ where: { schoolId } });
    await tx.classSchedule.deleteMany({ where: { schoolId } });
    await tx.rankTrack.deleteMany({ where: { schoolId } });
    await tx.receiptCounter.deleteMany({ where: { schoolId } });

    await tx.school.update({
      where: { id: schoolId },
      data: {
        name: 'Deleted School',
        slug: `deleted-${schoolId}`,
        joinCode: `DELETED-${schoolId}`,
        city: 'Deleted',
        country: null,
        isCodeActive: false,
        deletionRequestedAt: null,
        deletionScheduledFor: null,
        deletedAt: new Date()
      }
    });
  });

  return 'purged';
}

export function isDeletionPurgeAuthorized(request: Request): boolean {
  const secret = process.env.DELETION_PURGE_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;

  const provided = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}
