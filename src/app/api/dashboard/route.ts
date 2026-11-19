import { NextResponse } from 'next/server';
import { requireActiveMember } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { withTenantTransaction } from '@/lib/prisma-extension';
import { resolveOptionalProfile } from '@/lib/roster';
import { DEMO_SCHOOL_SLUG } from '@/lib/tenant-constants';

const DAY_MS = 86_400_000;

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_MS));
}

export async function GET(request: Request) {
  try {
    const guard = await requireActiveMember();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const schoolId = guard.user.schoolId;
    const url = new URL(request.url);
    const requestedProfileId = url.searchParams.get('profileId') || undefined;

    const resolved = await resolveOptionalProfile(guard.user, requestedProfileId);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        slug: true,
        discipline: true,
        city: true,
        country: true,
        timezone: true
      }
    });

    if (!school) {
      return NextResponse.json({ error: 'School tenant not found.' }, { status: 404 });
    }

    const profile = resolved.profile;
    const now = new Date();
    const isStaff = guard.user.role === 'OWNER' || guard.user.role === 'COACH';

    let rank: {
      id: string;
      title: string;
      beltColorHex: string;
      requiredClasses: number;
      requiredActiveDays: number;
    } | null = null;

    let attendance = {
      totalClasses: 0,
      daysInRank: 0,
      lastAttendedAt: null as string | null
    };

    let techniques = {
      verifiedCount: 0,
      requiredCount: 0
    };

    let inactivity = {
      daysInactive: 0,
      isInactive: false,
      alertId: null as string | null
    };

    if (profile) {
      const [rankRow, totalClasses, lastAttendance] = await Promise.all([
        profile.currentRankId
          ? prisma.rank.findFirst({
              where: { id: profile.currentRankId, schoolId },
              select: {
                id: true,
                title: true,
                beltColorHex: true,
                requiredClasses: true,
                requiredActiveDays: true
              }
            })
          : Promise.resolve(null),
        prisma.attendance.count({
          where: {
            schoolId,
            profileId: profile.id,
            attendedAt: { gte: profile.lastPromotionDate }
          }
        }),
        prisma.attendance.findFirst({
          where: { schoolId, profileId: profile.id },
          orderBy: { attendedAt: 'desc' },
          select: { attendedAt: true }
        })
      ]);

      rank = rankRow;

      const lastAttendedAt = lastAttendance?.attendedAt ?? null;
      const inactivityBaseline = lastAttendedAt ?? profile.createdAt;
      const daysInactive = daysBetween(inactivityBaseline, now);

      attendance = {
        totalClasses,
        daysInRank: daysBetween(profile.lastPromotionDate, now),
        lastAttendedAt: lastAttendedAt ? lastAttendedAt.toISOString() : null
      };

      const [requiredCount, verifiedCount] = await Promise.all([
        rank
          ? prisma.technique.count({ where: { schoolId, rankId: rank.id } })
          : Promise.resolve(0),
        rank
          ? prisma.techniqueProgress.count({
              where: {
                schoolId,
                profileId: profile.id,
                status: 'VERIFIED',
                technique: { rankId: rank.id }
              }
            })
          : Promise.resolve(0)
      ]);

      techniques = { verifiedCount, requiredCount };
      inactivity = {
        daysInactive,
        isInactive: daysInactive >= 10,
        alertId: null
      };

      if (inactivity.isInactive) {
        const alert = await withTenantTransaction(
          { schoolId, userId: guard.user.userId },
          async (tx) =>
            tx.inactivityAlert.upsert({
              where: {
                schoolId_profileId: {
                  schoolId,
                  profileId: profile.id
                }
              },
              create: {
                schoolId,
                profileId: profile.id,
                daysInactive,
                isResolved: false
              },
              update: {
                daysInactive,
                isResolved: false
              }
            })
        );

        inactivity.alertId = alert.id;
      } else {
        await withTenantTransaction(
          { schoolId, userId: guard.user.userId },
          async (tx) =>
            tx.inactivityAlert.updateMany({
              where: { schoolId, profileId: profile.id, isResolved: false },
              data: { isResolved: true }
            })
        );
      }
    }

    let retention: Array<{
      profileId: string;
      fullName: string;
      daysInactive: number;
      lastAttendedAt: string | null;
      isInactive: boolean;
    }> = [];

    let members: Array<{
      profileId: string;
      userId: string;
      fullName: string;
    }> = [];

    if (isStaff) {
      const profiles = await prisma.studentProfile.findMany({
        where: {
          schoolId,
          user: { status: 'ACTIVE' }
        },
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          attendances: {
            orderBy: { attendedAt: 'desc' },
            take: 1,
            select: { attendedAt: true }
          }
        },
        orderBy: { createdAt: 'asc' },
        take: 100
      });

      members = profiles.map((item) => ({
        profileId: item.id,
        userId: item.userId,
        fullName: `${item.firstName} ${item.lastName}`
      }));

      retention = profiles
        .map((item) => {
          const lastAttendedAt = item.attendances[0]?.attendedAt ?? null;
          const baseline = lastAttendedAt ?? item.createdAt;
          const daysInactive = daysBetween(baseline, now);

          return {
            profileId: item.id,
            fullName: `${item.firstName} ${item.lastName}`,
            daysInactive,
            lastAttendedAt: lastAttendedAt ? lastAttendedAt.toISOString() : null,
            isInactive: daysInactive >= 10
          };
        })
        .filter((item) => item.isInactive)
        .sort((a, b) => b.daysInactive - a.daysInactive);

      const retentionIds = new Set(retention.map((item) => item.profileId));

      await withTenantTransaction(
        { schoolId, userId: guard.user.userId },
        async (tx) => {
          for (const item of retention) {
            await tx.inactivityAlert.upsert({
              where: {
                schoolId_profileId: {
                  schoolId,
                  profileId: item.profileId
                }
              },
              create: {
                schoolId,
                profileId: item.profileId,
                daysInactive: item.daysInactive,
                isResolved: false
              },
              update: {
                daysInactive: item.daysInactive,
                isResolved: false
              }
            });
          }

          const openAlerts = await tx.inactivityAlert.findMany({
            where: { schoolId, isResolved: false },
            select: { profileId: true }
          });

          const staleProfileIds = openAlerts
            .map((item) => item.profileId)
            .filter((profileId) => !retentionIds.has(profileId));

          if (staleProfileIds.length > 0) {
            await tx.inactivityAlert.updateMany({
              where: { schoolId, profileId: { in: staleProfileIds } },
              data: { isResolved: true }
            });
          }
        }
      );
    }

    const ledger = await prisma.ledgerEntry.findMany({
      where: isStaff
        ? { schoolId }
        : { schoolId, userId: profile?.userId ?? '__no_profile__' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        receiptSlug: true,
        amountCents: true,
        currency: true,
        paymentMethod: true,
        transactionType: true,
        reversalRefSlug: true,
        note: true,
        userId: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      school: {
        ...school,
        isDemo: school.slug === DEMO_SCHOOL_SLUG
      },
      profile: profile
        ? {
            id: profile.id,
            userId: profile.userId,
            firstName: profile.firstName,
            lastName: profile.lastName,
            fullName: `${profile.firstName} ${profile.lastName}`,
            dateOfBirth: profile.dateOfBirth.toISOString(),
            isMinor: profile.isMinor,
            currentRankId: profile.currentRankId,
            lastPromotionDate: profile.lastPromotionDate.toISOString(),
            createdAt: profile.createdAt.toISOString()
          }
        : null,
      rank,
      attendance,
      techniques,
      inactivity,
      retention,
      members,
      ledger: ledger.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString()
      }))
    });
  } catch {
    console.error('[BELTTRACK DASHBOARD] GET error');
    return NextResponse.json(
      { error: 'Unable to load the dashboard. Please try again later.' },
      { status: 500 }
    );
  }
}
