import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireActiveStaff, requireSessionUser } from '@/lib/auth-guard';
import { getDeletionSchedule } from '@/lib/account-deletion';
import { deletionRequestSchema } from '@/lib/validation/schemas';

function formatSchoolDeletionRequest(request: {
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

    if (guard.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only the school owner may view school deletion status.' },
        { status: 403 }
      );
    }

    const school = await prisma.school.findUnique({
      where: { id: guard.user.schoolId },
      select: {
        id: true,
        name: true,
        deletionRequestedAt: true,
        deletionScheduledFor: true,
        deletedAt: true
      }
    });

    if (!school) {
      return NextResponse.json({ error: 'School tenant not found.' }, { status: 404 });
    }

    const request = await prisma.deletionRequest.findFirst({
      where: {
        schoolId: guard.user.schoolId,
        targetType: 'SCHOOL',
        status: { in: ['PENDING', 'APPROVED'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      school: {
        id: school.id,
        name: school.name,
        deletion_requested_at: school.deletionRequestedAt
          ? school.deletionRequestedAt.toISOString()
          : null,
        deletion_scheduled_for: school.deletionScheduledFor
          ? school.deletionScheduledFor.toISOString()
          : null,
        deleted_at: school.deletedAt ? school.deletedAt.toISOString() : null
      },
      request: request ? formatSchoolDeletionRequest(request) : null
    });
  } catch {
    console.error('[BELTTRACK DELETION /api/schools/deletion] GET error');
    return NextResponse.json(
      { error: 'Unable to load school deletion status. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireActiveStaff();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    if (guard.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only the school owner may request school deletion.' },
        { status: 403 }
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
        targetType: 'SCHOOL',
        status: { in: ['PENDING', 'APPROVED'] }
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This school already has an active deletion request.' },
        { status: 409 }
      );
    }

    const now = new Date();
    const scheduledFor = getDeletionSchedule(now);

    const created = await prisma.$transaction(async (tx) => {
      const deletionRequest = await tx.deletionRequest.create({
        data: {
          schoolId: guard.user.schoolId,
          targetType: 'SCHOOL',
          requestedById: guard.user.userId,
          reviewedById: guard.user.userId,
          status: 'APPROVED',
          reason: validated.data.reason || null,
          reviewedAt: now,
          scheduledFor
        }
      });

      await tx.school.update({
        where: { id: guard.user.schoolId },
        data: {
          deletionRequestedAt: now,
          deletionScheduledFor: scheduledFor,
          isCodeActive: false
        }
      });

      return deletionRequest;
    });

    return NextResponse.json(
      {
        success: true,
        message:
          'School deletion scheduled. All tenant access is locked for the 14-day grace period.',
        request: formatSchoolDeletionRequest(created)
      },
      { status: 201 }
    );
  } catch {
    console.error('[BELTTRACK DELETION /api/schools/deletion] POST error');
    return NextResponse.json(
      { error: 'Unable to schedule school deletion. Please try again later.' },
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

    if (guard.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only the school owner may cancel school deletion.' },
        { status: 403 }
      );
    }

    const deletionRequest = await prisma.deletionRequest.findFirst({
      where: {
        schoolId: guard.user.schoolId,
        targetType: 'SCHOOL',
        status: 'APPROVED'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!deletionRequest) {
      return NextResponse.json(
        { error: 'No scheduled school deletion was found.' },
        { status: 404 }
      );
    }

    const [cancelled] = await prisma.$transaction([
      prisma.deletionRequest.update({
        where: { id: deletionRequest.id },
        data: { status: 'CANCELLED' }
      }),
      prisma.school.update({
        where: { id: guard.user.schoolId },
        data: {
          deletionRequestedAt: null,
          deletionScheduledFor: null,
          isCodeActive: true
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: 'School deletion cancelled. Tenant access is restored.',
      request: formatSchoolDeletionRequest(cancelled)
    });
  } catch {
    console.error('[BELTTRACK DELETION /api/schools/deletion] DELETE error');
    return NextResponse.json(
      { error: 'Unable to cancel school deletion. Please try again later.' },
      { status: 500 }
    );
  }
}
