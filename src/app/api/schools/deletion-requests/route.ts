import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireActiveStaff } from '@/lib/auth-guard';
import { getAdminClient } from '@/lib/supabase/admin';
import { getDeletionSchedule } from '@/lib/account-deletion';
import {
  deletionDecisionSchema,
  staffUserDeletionSchema
} from '@/lib/validation/schemas';

type RequestRow = {
  id: string;
  targetUserId: string | null;
  requestedById: string | null;
  reviewedById: string | null;
  status: string;
  reason: string | null;
  decisionNote: string | null;
  requestedAt: Date;
  reviewedAt: Date | null;
  scheduledFor: Date | null;
  completedAt: Date | null;
};

function formatRequest(
  request: RequestRow,
  members: Map<string, { email: string; fullName: string; role: string; status: string }>
) {
  const target = request.targetUserId ? members.get(request.targetUserId) : undefined;
  const requester = request.requestedById ? members.get(request.requestedById) : undefined;

  return {
    id: request.id,
    target_user_id: request.targetUserId,
    target_email: target?.email ?? null,
    target_name: target?.fullName ?? target?.email ?? null,
    target_role: target?.role ?? null,
    target_status: target?.status ?? null,
    requested_by_id: request.requestedById,
    requested_by_name: requester?.fullName ?? requester?.email ?? null,
    status: request.status.toLowerCase(),
    reason: request.reason,
    decision_note: request.decisionNote,
    requested_at: request.requestedAt.toISOString(),
    reviewed_at: request.reviewedAt ? request.reviewedAt.toISOString() : null,
    scheduled_for: request.scheduledFor ? request.scheduledFor.toISOString() : null,
    completed_at: request.completedAt ? request.completedAt.toISOString() : null
  };
}

async function loadMemberMap(schoolId: string, userIds: string[]) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const users = await prisma.user.findMany({
    where: { schoolId, id: { in: uniqueIds } },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      profile: { select: { firstName: true, lastName: true } }
    }
  });

  return new Map(
    users.map((user) => [
      user.id,
      {
        email: user.email,
        fullName: user.profile
          ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
          : user.email,
        role: user.role.toLowerCase(),
        status: user.status.toLowerCase()
      }
    ])
  );
}

export async function GET() {
  try {
    const guard = await requireActiveStaff();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const schoolId = guard.user.schoolId;
    const requests = await prisma.deletionRequest.findMany({
      where: {
        schoolId,
        targetType: 'USER',
        status: { in: ['PENDING', 'APPROVED'] }
      },
      orderBy: { requestedAt: 'desc' }
    });

    const members = await loadMemberMap(
      schoolId,
      requests.flatMap((request) => [
        request.targetUserId ?? '',
        request.requestedById ?? '',
        request.reviewedById ?? ''
      ])
    );

    const formatted = requests.map((request) => formatRequest(request, members));

    return NextResponse.json({
      success: true,
      pendingCount: formatted.filter((request) => request.status === 'pending').length,
      approvedCount: formatted.filter((request) => request.status === 'approved').length,
      requests: formatted
    });
  } catch {
    console.error('[BELTTRACK DELETION /api/schools/deletion-requests] GET error');
    return NextResponse.json(
      { error: 'Unable to load deletion requests. Please try again later.' },
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid or missing JSON payload in request body.' },
        { status: 400 }
      );
    }

    const validated = staffUserDeletionSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || 'Invalid deletion request.' },
        { status: 400 }
      );
    }

    if (validated.data.targetUserId === guard.user.userId) {
      return NextResponse.json(
        { error: 'Use your own account deletion request for self-service deletion.' },
        { status: 409 }
      );
    }

    const target = await prisma.user.findFirst({
      where: {
        id: validated.data.targetUserId,
        schoolId: guard.user.schoolId
      }
    });

    if (!target) {
      return NextResponse.json(
        { error: 'Tenant record not found or tenant isolation mismatch.' },
        { status: 404 }
      );
    }

    if (target.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Owner accounts can only be closed through the school deletion workflow.' },
        { status: 409 }
      );
    }

    const existing = await prisma.deletionRequest.findFirst({
      where: {
        schoolId: guard.user.schoolId,
        targetType: 'USER',
        targetUserId: target.id,
        status: { in: ['PENDING', 'APPROVED'] }
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This member already has an open deletion request.' },
        { status: 409 }
      );
    }

    const scheduledFor = getDeletionSchedule();
    const now = new Date();

    const created = await prisma.$transaction(async (tx) => {
      const deletionRequest = await tx.deletionRequest.create({
        data: {
          schoolId: guard.user.schoolId,
          targetType: 'USER',
          targetUserId: target.id,
          requestedById: guard.user.userId,
          reviewedById: guard.user.userId,
          status: 'APPROVED',
          reason: validated.data.reason || null,
          reviewedAt: now,
          scheduledFor
        }
      });

      await tx.user.update({
        where: { id: target.id },
        data: {
          status: 'DELETION_PENDING',
          deletionRequestedAt: now,
          deletionScheduledFor: scheduledFor
        }
      });

      return deletionRequest;
    });

    if (target.supabaseUid) {
      try {
        const admin = getAdminClient();
        await admin.auth.admin.updateUserById(target.supabaseUid, {
          user_metadata: { status: 'DELETION_PENDING' }
        });
      } catch {
        // DB status is authoritative; metadata sync is best effort.
      }
    }

    const members = await loadMemberMap(guard.user.schoolId, [
      target.id,
      guard.user.userId
    ]);

    return NextResponse.json(
      {
        success: true,
        message: 'Member deletion approved and scheduled for the 14-day grace period.',
        request: formatRequest(created, members)
      },
      { status: 201 }
    );
  } catch {
    console.error('[BELTTRACK DELETION /api/schools/deletion-requests] POST error');
    return NextResponse.json(
      { error: 'Unable to schedule the member deletion. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = await requireActiveStaff();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid or missing JSON payload in request body.' },
        { status: 400 }
      );
    }

    const validated = deletionDecisionSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || 'Invalid deletion decision.' },
        { status: 400 }
      );
    }

    const deletionRequest = await prisma.deletionRequest.findFirst({
      where: {
        id: validated.data.requestId,
        schoolId: guard.user.schoolId,
        targetType: 'USER'
      }
    });

    if (!deletionRequest) {
      return NextResponse.json(
        { error: 'Deletion request not found or tenant isolation mismatch.' },
        { status: 404 }
      );
    }

    if (deletionRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending deletion requests can be reviewed.' },
        { status: 409 }
      );
    }

    if (!deletionRequest.targetUserId) {
      return NextResponse.json(
        { error: 'Deletion request has no target member.' },
        { status: 409 }
      );
    }

    if (deletionRequest.targetUserId === guard.user.userId) {
      return NextResponse.json(
        { error: 'Another owner or coach must review your own deletion request.' },
        { status: 409 }
      );
    }

    const target = await prisma.user.findFirst({
      where: {
        id: deletionRequest.targetUserId,
        schoolId: guard.user.schoolId
      }
    });

    if (!target) {
      return NextResponse.json(
        { error: 'Target member no longer exists in this tenant.' },
        { status: 404 }
      );
    }

    if (target.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Owner accounts can only be closed through the school deletion workflow.' },
        { status: 409 }
      );
    }

    const now = new Date();

    if (validated.data.action === 'REJECT') {
      const rejected = await prisma.deletionRequest.update({
        where: { id: deletionRequest.id },
        data: {
          status: 'REJECTED',
          reviewedById: guard.user.userId,
          reviewedAt: now,
          decisionNote: validated.data.decisionNote || null
        }
      });

      const members = await loadMemberMap(guard.user.schoolId, [
        target.id,
        guard.user.userId
      ]);

      return NextResponse.json({
        success: true,
        message: 'Deletion request rejected. The member account remains active.',
        request: formatRequest(rejected, members)
      });
    }

    const scheduledFor = getDeletionSchedule(now);

    const approved = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.deletionRequest.update({
        where: { id: deletionRequest.id },
        data: {
          status: 'APPROVED',
          reviewedById: guard.user.userId,
          reviewedAt: now,
          scheduledFor,
          decisionNote: validated.data.decisionNote || null
        }
      });

      await tx.user.update({
        where: { id: target.id },
        data: {
          status: 'DELETION_PENDING',
          deletionRequestedAt: deletionRequest.requestedAt,
          deletionScheduledFor: scheduledFor
        }
      });

      return updatedRequest;
    });

    if (target.supabaseUid) {
      try {
        const admin = getAdminClient();
        await admin.auth.admin.updateUserById(target.supabaseUid, {
          user_metadata: { status: 'DELETION_PENDING' }
        });
      } catch {
        // DB status is authoritative; metadata sync is best effort.
      }
    }

    const members = await loadMemberMap(guard.user.schoolId, [
      target.id,
      guard.user.userId
    ]);

    return NextResponse.json({
      success: true,
      message: 'Deletion approved. The member account is locked for the 14-day grace period.',
      request: formatRequest(approved, members)
    });
  } catch {
    console.error('[BELTTRACK DELETION /api/schools/deletion-requests] PATCH error');
    return NextResponse.json(
      { error: 'Unable to review the deletion request. Please try again later.' },
      { status: 500 }
    );
  }
}
