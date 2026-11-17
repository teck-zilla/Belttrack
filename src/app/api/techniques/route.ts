import { NextResponse } from 'next/server';
import { requireActiveMember } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { resolveOptionalProfile } from '@/lib/roster';

export async function GET(request: Request) {
  try {
    const guard = await requireActiveMember();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const url = new URL(request.url);
    const requestedProfileId = url.searchParams.get('profileId') || undefined;

    const resolved = await resolveOptionalProfile(guard.user, requestedProfileId);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const profile = resolved.profile;

    const techniques = await prisma.technique.findMany({
      where: { schoolId: guard.user.schoolId },
      include: {
        rank: {
          select: {
            id: true,
            title: true,
            orderIndex: true
          }
        }
      },
      orderBy: [{ rank: { orderIndex: 'asc' } }, { name: 'asc' }]
    });

    const progress = profile
      ? await prisma.techniqueProgress.findMany({
          where: { schoolId: guard.user.schoolId, profileId: profile.id },
          select: {
            techniqueId: true,
            status: true,
            verifiedAt: true,
            verifiedBy: true
          }
        })
      : [];

    const progressByTechnique = new Map(progress.map((item) => [item.techniqueId, item]));

    return NextResponse.json({
      success: true,
      profileId: profile?.id ?? null,
      profileName: profile ? `${profile.firstName} ${profile.lastName}` : null,
      techniques: techniques.map((technique) => {
        const item = progressByTechnique.get(technique.id);

        return {
          id: technique.id,
          name: technique.name,
          description: technique.description,
          rankId: technique.rankId,
          rankTitle: technique.rank.title,
          rankOrder: technique.rank.orderIndex,
          status: item?.status ?? 'NOT_STARTED',
          verifiedAt: item?.verifiedAt ? item.verifiedAt.toISOString() : null,
          verifiedBy: item?.verifiedBy ?? null
        };
      })
    });
  } catch (error: unknown) {
    console.error('[BELTTRACK TECHNIQUES] GET error:', error);
    return NextResponse.json(
      { error: 'Unable to load the technique curriculum. Please try again later.' },
      { status: 500 }
    );
  }
}
