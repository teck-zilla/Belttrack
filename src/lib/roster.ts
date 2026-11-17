import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { ActiveSessionUser } from '@/lib/auth-guard';

const profileSelect = {
  id: true,
  schoolId: true,
  userId: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  isMinor: true,
  currentRankId: true,
  lastPromotionDate: true,
  createdAt: true
} satisfies Prisma.StudentProfileSelect;

export type ResolvedProfile = {
  id: string;
  schoolId: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  isMinor: boolean;
  currentRankId: string | null;
  lastPromotionDate: Date;
  createdAt: Date;
};

export type ProfileResolution =
  | { ok: true; profile: ResolvedProfile | null }
  | { ok: false; status: number; error: string };

export async function resolveOptionalProfile(
  user: ActiveSessionUser,
  requestedProfileId?: string
): Promise<ProfileResolution> {
  if (requestedProfileId) {
    const profile = await prisma.studentProfile.findFirst({
      where: { id: requestedProfileId, schoolId: user.schoolId },
      select: profileSelect
    });

    if (!profile) {
      return { ok: false, status: 404, error: 'Student profile not found in this school.' };
    }

    if (user.role === 'STUDENT' && profile.userId !== user.userId) {
      return { ok: false, status: 403, error: 'Students may only access their own profile.' };
    }

    if (user.role === 'GUARDIAN') {
      const link = await prisma.guardianStudent.findFirst({
        where: {
          schoolId: user.schoolId,
          guardianId: user.userId,
          studentId: profile.userId,
          isApproved: true
        },
        select: { id: true }
      });

      if (!link) {
        return { ok: false, status: 403, error: 'Guardians may only access approved dependents.' };
      }
    }

    return { ok: true, profile };
  }

  if (user.role === 'STUDENT') {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.userId },
      select: profileSelect
    });

    if (!profile || profile.schoolId !== user.schoolId) {
      return { ok: false, status: 403, error: 'No student profile is linked to this account.' };
    }

    return { ok: true, profile };
  }

  if (user.role === 'GUARDIAN') {
    const link = await prisma.guardianStudent.findFirst({
      where: {
        schoolId: user.schoolId,
        guardianId: user.userId,
        isApproved: true
      },
      orderBy: { createdAt: 'asc' },
      select: {
        student: {
          select: {
            profile: { select: profileSelect }
          }
        }
      }
    });

    const profile = link?.student.profile ?? null;

    if (!profile) {
      return { ok: false, status: 404, error: 'No approved dependent is linked to this guardian account.' };
    }

    return { ok: true, profile };
  }

  const profile = await prisma.studentProfile.findFirst({
    where: {
      schoolId: user.schoolId,
      user: { status: 'ACTIVE' }
    },
    orderBy: { createdAt: 'asc' },
    select: profileSelect
  });

  return { ok: true, profile };
}

export async function resolveAttendanceProfile(
  user: ActiveSessionUser,
  requestedProfileId?: string
): Promise<ProfileResolution> {
  if (user.role === 'GUARDIAN') {
    return { ok: false, status: 403, error: 'Guardians have read-only access.' };
  }

  if (user.role === 'STUDENT') {
    return resolveOptionalProfile(user, requestedProfileId);
  }

  if (!requestedProfileId) {
    return { ok: false, status: 400, error: 'profileId is required for staff check-ins.' };
  }

  return resolveOptionalProfile(user, requestedProfileId);
}
