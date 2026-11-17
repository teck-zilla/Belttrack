import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireActiveMember } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { attendanceCheckInSchema } from '@/lib/validation/schemas';
import { resolveAttendanceProfile } from '@/lib/roster';
import { createTenantPrisma, withTenantTransaction } from '@/lib/prisma-extension';

function serializeAttendance(attendance: {
  id: string;
  profileId: string;
  classId: string | null;
  idempotencyKey: string;
  attendedAt: Date;
}) {
  return {
    id: attendance.id,
    profileId: attendance.profileId,
    classId: attendance.classId,
    idempotencyKey: attendance.idempotencyKey,
    attendedAt: attendance.attendedAt.toISOString()
  };
}

export async function POST(request: Request) {
  try {
    const guard = await requireActiveMember();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid or missing JSON payload in request body' },
        { status: 400 }
      );
    }

    const parsed = attendanceCheckInSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid attendance parameters' },
        { status: 400 }
      );
    }

    const resolved = await resolveAttendanceProfile(guard.user, parsed.data.profileId);
    if (!resolved.ok || !resolved.profile) {
      return NextResponse.json(
        { error: resolved.ok ? 'No student profile is available for this account.' : resolved.error },
        { status: resolved.ok ? 404 : resolved.status }
      );
    }

    const profile = resolved.profile;
    const attendedAt = parsed.data.attendedAt ? new Date(parsed.data.attendedAt) : new Date();

    if (parsed.data.classId) {
      const scheduledClass = await prisma.classSchedule.findFirst({
        where: { id: parsed.data.classId, schoolId: guard.user.schoolId },
        select: { id: true }
      });

      if (!scheduledClass) {
        return NextResponse.json(
          { error: 'Class schedule not found in this school.' },
          { status: 404 }
        );
      }
    }

    try {
      const attendance = await withTenantTransaction(
        { schoolId: guard.user.schoolId, userId: guard.user.userId },
        async (tx) => {
          const created = await tx.attendance.create({
            data: {
              schoolId: guard.user.schoolId,
              profileId: profile.id,
              classId: parsed.data.classId ?? null,
              idempotencyKey: parsed.data.idempotencyKey,
              attendedAt
            }
          });

          await tx.inactivityAlert.updateMany({
            where: { schoolId: guard.user.schoolId, profileId: profile.id, isResolved: false },
            data: { isResolved: true }
          });

          return created;
        }
      );

      return NextResponse.json(
        { success: true, duplicate: false, attendance: serializeAttendance(attendance) },
        { status: 201 }
      );
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const tenant = createTenantPrisma(guard.user.schoolId);
        const existing = await tenant.attendance.findFirst({
          where: {
            profileId: profile.id,
            idempotencyKey: parsed.data.idempotencyKey
          }
        });

        if (existing) {
          return NextResponse.json({
            success: true,
            duplicate: true,
            attendance: serializeAttendance(existing)
          });
        }
      }

      throw error;
    }
  } catch (error: unknown) {
    console.error('[BELTTRACK ATTENDANCE] POST error:', error);
    return NextResponse.json(
      { error: 'Unable to record attendance. Please try again later.' },
      { status: 500 }
    );
  }
}
