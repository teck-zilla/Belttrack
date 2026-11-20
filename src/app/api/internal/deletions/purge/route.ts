import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit-log';
import {
  isDeletionPurgeAuthorized,
  purgeSchoolAccount,
  purgeUserAccount
} from '@/lib/account-deletion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function completeDeletionRequest(input: {
  id: string;
  schoolId: string;
  targetType: string;
  detail: string;
}) {
  const completedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.deletionRequest.update({
      where: { id: input.id },
      data: { status: 'COMPLETED', completedAt }
    });

    await writeAuditLog(tx, {
      schoolId: input.schoolId,
      actorUserId: null,
      action: 'DELETION_PURGE_COMPLETED',
      targetType: 'DeletionRequest',
      targetId: input.id,
      metadata: {
        targetType: input.targetType,
        completedAt: completedAt.toISOString(),
        detail: input.detail
      }
    });
  });
}

export async function POST(request: Request) {
  if (!isDeletionPurgeAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const dueRequests = await prisma.deletionRequest.findMany({
      where: {
        status: 'APPROVED',
        scheduledFor: { lte: new Date() }
      },
      orderBy: { scheduledFor: 'asc' },
      take: 25
    });

    const results: Array<{
      requestId: string;
      targetType: string;
      status: 'completed' | 'failed';
      detail: string;
    }> = [];

    for (const deletionRequest of dueRequests) {
      try {
        if (deletionRequest.targetType === 'USER') {
          if (!deletionRequest.targetUserId) {
            const detail = 'No target user was attached to the request.';
            await completeDeletionRequest({
              id: deletionRequest.id,
              schoolId: deletionRequest.schoolId,
              targetType: deletionRequest.targetType,
              detail
            });

            results.push({
              requestId: deletionRequest.id,
              targetType: deletionRequest.targetType,
              status: 'completed',
              detail
            });
            continue;
          }

          const result = await purgeUserAccount(
            deletionRequest.targetUserId,
            deletionRequest.schoolId
          );
          const detail = result === 'missing' ? 'User already absent.' : 'User purged.';

          await completeDeletionRequest({
            id: deletionRequest.id,
            schoolId: deletionRequest.schoolId,
            targetType: deletionRequest.targetType,
            detail
          });

          results.push({
            requestId: deletionRequest.id,
            targetType: deletionRequest.targetType,
            status: 'completed',
            detail
          });
          continue;
        }

        const result = await purgeSchoolAccount(deletionRequest.schoolId);
        const detail =
          result === 'missing'
            ? 'School already absent.'
            : result === 'already_purged'
              ? 'School already purged.'
              : 'School purged and ledger anchor retained.';

        await completeDeletionRequest({
          id: deletionRequest.id,
          schoolId: deletionRequest.schoolId,
          targetType: deletionRequest.targetType,
          detail
        });

        results.push({
          requestId: deletionRequest.id,
          targetType: deletionRequest.targetType,
          status: 'completed',
          detail
        });
      } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : 'Unknown purge failure.';
        console.error('[BELTTRACK DELETION] Purge failed for a deletion request');
        try {
          await writeAuditLog(prisma, {
            schoolId: deletionRequest.schoolId,
            actorUserId: null,
            action: 'DELETION_PURGE_FAILED',
            targetType: 'DeletionRequest',
            targetId: deletionRequest.id,
            metadata: {
              targetType: deletionRequest.targetType,
              detail
            }
          });
        } catch {
          console.error('[BELTTRACK DELETION] Failed to append purge failure audit');
        }
        results.push({
          requestId: deletionRequest.id,
          targetType: deletionRequest.targetType,
          status: 'failed',
          detail
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    });
  } catch {
    console.error('[BELTTRACK DELETION /api/internal/deletions/purge] error');
    return NextResponse.json(
      { error: 'Unable to process due deletions. Please try again later.' },
      { status: 500 }
    );
  }
}
