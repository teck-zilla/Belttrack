import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireActiveMember, requireSessionUser } from '@/lib/auth-guard';
import { deletionRequestSchema } from '@/lib/validation/schemas';

function formatDeletionRequest(request: {
  id: string;
  status: string;
  reason: string | null;
  decisionNote: string | null;
  requestedAt: Date;
  reviewedAt: Date | null;
  scheduledFor: Date | null;
  completedAt: Date | null;
}) {
  return {
    id: request.id,
    status: request.status.toLowerCase(),
    reason: request.reason,
    decision_note: request.decisionNote,
    requested_at: request.requestedAt.toISOString(),
    reviewed_at: request.reviewedAt ? request.reviewedAt.toISOString() : null,
    scheduled_for: request.scheduledFor ? request.scheduledFor.toISOString() : null,
    completed_at: request.completedAt ? request.completedAt.toISOString() : null
  };
}

export async function GET() {
  try {
    const guard = await requireSessionUser();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const request = await prisma.deletionRequest.findFirst({
      where: {
        schoolId: guard.user.schoolId,
        targetType: 'USER',
        targetUserId: guard.user.userId,
        status: { in: ['PENDING', 'APPROVED'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      account: {
        status: guard.user.status.toLowerCase(),
        deletion_scheduled_for: guard.user.deletionScheduledFor
          ? guard.user.deletionScheduledFor.toISOString()
          : null
      },
      request: request ? formatDeletionRequest(request) : null
    });
  } catch (error: unknown) {
    console.error('[BELTTRACK DELETION /api/account/deletion] GET error:', error);
    return NextResponse.json(
      { error: 'Unable to load the deletion request. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireActiveMember();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    if (guard.user.role === 'OWNER') {
      return NextResponse.json(
        {
          error:
            'Owner accounts cannot request personal deletion. Use the school deletion workflow to close the school tenant.'
        },
        { status: 409 }
      );
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const validated = deletionRequestSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || 'Invalid deletion request.' },
        { status: 400 }
      );
    }

    const existing = await prisma.deletionRequest.findFirst({
      where: {
        schoolId: guard.user.schoolId,
        targetType: 'USER',
        targetUserId: guard.user.userId,
        status: { in: ['PENDING', 'APPROVED'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existing) {
      return NextResponse.json(
        {
          error:
            existing.status === 'PENDING'
              ? 'A deletion request is already awaiting owner or coach approval.'
              : 'This account is already scheduled for deletion.',
          request: formatDeletionRequest(existing)
        },
        { status: 409 }
      );
    }

    const created = await prisma.deletionRequest.create({
      data: {
        schoolId: guard.user.schoolId,
        targetType: 'USER',
        targetUserId: guard.user.userId,
        requestedById: guard.user.userId,
        status: 'PENDING',
        reason: validated.data.reason || null
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Deletion request submitted for owner or coach approval.',
        request: formatDeletionRequest(created)
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('[BELTTRACK DELETION /api/account/deletion] POST error:', error);
    return NextResponse.json(
      { error: 'Unable to submit the deletion request. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const guard = await requireSessionUser();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const request = await prisma.deletionRequest.findFirst({
      where: {
        schoolId: guard.user.schoolId,
        targetType: 'USER',
        targetUserId: guard.user.userId,
        status: { in: ['PENDING', 'APPROVED'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!request) {
      return NextResponse.json(
        { error: 'No active deletion request was found for this account.' },
        { status: 404 }
      );
    }

    if (request.status === 'APPROVED' && guard.user.status !== 'DELETION_PENDING') {
      return NextResponse.json(
        {
          error:
            'Your account state changed after approval. Contact school staff to cancel the scheduled deletion.'
        },
        { status: 409 }
      );
    }

    if (request.status === 'PENDING') {
      const cancelled = await prisma.deletionRequest.update({
        where: { id: request.id },
        data: { status: 'CANCELLED' }
      });

      return NextResponse.json({
        success: true,
        message: 'Deletion request cancelled.',
        request: formatDeletionRequest(cancelled)
      });
    }

    const [cancelled] = await prisma.$transaction([
      prisma.deletionRequest.update({
        where: { id: request.id },
        data: { status: 'CANCELLED' }
      }),
      prisma.user.update({
        where: { id: guard.user.userId },
        data: {
          status: 'ACTIVE',
          deletionRequestedAt: null,
          deletionScheduledFor: null
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: 'Scheduled account deletion cancelled. Your account is active again.',
      request: formatDeletionRequest(cancelled)
    });
  } catch (error: unknown) {
    console.error('[BELTTRACK DELETION /api/account/deletion] DELETE error:', error);
    return NextResponse.json(
      { error: 'Unable to cancel the deletion request. Please try again later.' },
      { status: 500 }
    );
  }
}
