import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit-log';
import { requireActiveStaff } from '@/lib/auth-guard';
import { joinCodeManagementSchema } from '@/lib/validation/schemas';

const disciplineCodeMap: Record<string, string> = {
  brazilian_jiu_jitsu: 'BJJ',
  judo: 'JUDO',
  karate: 'KT',
  taekwondo: 'TKD',
  muay_thai: 'MT',
  krav_maga: 'KM'
};

function buildGeneratedJoinCode(name: string, discipline: string): string {
  const discCode = disciplineCodeMap[discipline] || 'BJJ';
  const fallbackPrefix =
    name.replace(/[^a-zA-Z]/g, '').substring(0, 6).toUpperCase() || 'DOJO';
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${fallbackPrefix}-${discCode}-${suffix}`.toUpperCase();
}

export async function GET() {
  try {
    const guard = await requireActiveStaff();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    if (guard.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only the school owner may manage join codes.' },
        { status: 403 }
      );
    }

    const school = await prisma.school.findUnique({
      where: { id: guard.user.schoolId },
      select: {
        id: true,
        joinCode: true,
        isCodeActive: true
      }
    });

    if (!school) {
      return NextResponse.json({ error: 'School tenant not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      joinCode: school.joinCode,
      isCodeActive: school.isCodeActive
    });
  } catch {
    console.error('[BELTTRACK AUTH /api/schools/join-code] GET error');
    return NextResponse.json(
      { error: 'Unable to load join code settings. Please try again later.' },
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

    if (guard.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only the school owner may manage join codes.' },
        { status: 403 }
      );
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

    const validated = joinCodeManagementSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || 'Invalid join code request.' },
        { status: 400 }
      );
    }

    const school = await prisma.school.findUnique({
      where: { id: guard.user.schoolId },
      select: {
        id: true,
        name: true,
        discipline: true,
        joinCode: true,
        isCodeActive: true
      }
    });

    if (!school) {
      return NextResponse.json({ error: 'School tenant not found.' }, { status: 404 });
    }

    if (validated.data.action === 'REVOKE') {
      if (!school.isCodeActive) {
        return NextResponse.json({
          success: true,
          message: 'Join code is already inactive.',
          joinCode: school.joinCode,
          isCodeActive: false
        });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.school.update({
          where: { id: school.id },
          data: { isCodeActive: false },
          select: { joinCode: true, isCodeActive: true }
        });

        await writeAuditLog(tx, {
          schoolId: school.id,
          actorUserId: guard.user.userId,
          action: 'JOIN_CODE_REVOKED',
          targetType: 'School',
          targetId: school.id,
          metadata: {
            previousJoinCode: school.joinCode,
            previousIsCodeActive: school.isCodeActive
          }
        });

        return result;
      });

      return NextResponse.json({
        success: true,
        message: 'Join code revoked. New registrations are blocked.',
        joinCode: updated.joinCode,
        isCodeActive: updated.isCodeActive
      });
    }

    const customCode = validated.data.customCode?.toUpperCase();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const nextJoinCode = customCode ?? buildGeneratedJoinCode(school.name, school.discipline);

      if (nextJoinCode === school.joinCode && school.isCodeActive && customCode) {
        return NextResponse.json(
          { error: `Registration code "${nextJoinCode}" is already active for this school.` },
          { status: 409 }
        );
      }

      try {
        const updated = await prisma.$transaction(async (tx) => {
          const result = await tx.school.update({
            where: { id: school.id },
            data: {
              joinCode: nextJoinCode,
              isCodeActive: true
            },
            select: { joinCode: true, isCodeActive: true }
          });

          await writeAuditLog(tx, {
            schoolId: school.id,
            actorUserId: guard.user.userId,
            action: 'JOIN_CODE_ROTATED',
            targetType: 'School',
            targetId: school.id,
            metadata: {
              previousJoinCode: school.joinCode,
              nextJoinCode,
              previousIsCodeActive: school.isCodeActive,
              customCode: Boolean(customCode)
            }
          });

          return result;
        });

        return NextResponse.json({
          success: true,
          message: 'Join code rotated successfully.',
          joinCode: updated.joinCode,
          isCodeActive: updated.isCodeActive
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          if (customCode) {
            return NextResponse.json(
              { error: `Registration code "${nextJoinCode}" is already in use. Please choose another code.` },
              { status: 409 }
            );
          }
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json(
      { error: 'Unable to generate a unique join code. Please try again.' },
      { status: 409 }
    );
  } catch {
    console.error('[BELTTRACK AUTH /api/schools/join-code] PATCH error');
    return NextResponse.json(
      { error: 'Unable to update join code settings. Please try again later.' },
      { status: 500 }
    );
  }
}