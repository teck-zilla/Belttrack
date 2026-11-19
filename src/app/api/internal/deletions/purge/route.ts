import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isDeletionPurgeAuthorized,
  purgeSchoolAccount,
  purgeUserAccount
} from '@/lib/account-deletion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
            await prisma.deletionRequest.update({
              where: { id: deletionRequest.id },
              data: { status: 'COMPLETED', completedAt: new Date() }
            });

            results.push({
              requestId: deletionRequest.id,
              targetType: deletionRequest.targetType,
              status: 'completed',
              detail: 'No target user was attached to the request.'
            });
            continue;
          }

          const result = await purgeUserAccount(
            deletionRequest.targetUserId,
            deletionRequest.schoolId
          );

          await prisma.deletionRequest.update({
            where: { id: deletionRequest.id },
            data: { status: 'COMPLETED', completedAt: new Date() }
          });

          results.push({
            requestId: deletionRequest.id,
            targetType: deletionRequest.targetType,
            status: 'completed',
            detail: result === 'missing' ? 'User already absent.' : 'User purged.'
          });
          continue;
        }

        const result = await purgeSchoolAccount(deletionRequest.schoolId);

        await prisma.deletionRequest.update({
          where: { id: deletionRequest.id },
          data: { status: 'COMPLETED', completedAt: new Date() }
        });

        results.push({
          requestId: deletionRequest.id,
          targetType: deletionRequest.targetType,
          status: 'completed',
          detail:
            result === 'missing'
              ? 'School already absent.'
              : result === 'already_purged'
                ? 'School already purged.'
                : 'School purged and ledger anchor retained.'
        });
      } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : 'Unknown purge failure.';
        console.error('[BELTTRACK DELETION] Purge failed for a deletion request');
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
