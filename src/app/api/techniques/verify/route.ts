import { NextResponse } from 'next/server';
import { requireActiveStaff } from '@/lib/auth-guard';
import { techniqueSignoffSchema } from '@/lib/validation/schemas';
import { resolveOptionalProfile } from '@/lib/roster';
import { withTenantTransaction } from '@/lib/prisma-extension';

export async function POST(request: Request) {
  try {
    const guard = await requireActiveStaff();
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

    const parsed = techniqueSignoffSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid technique sign-off parameters' },
        { status: 400 }
      );
    }

    const resolved = await resolveOptionalProfile(guard.user, parsed.data.profileId);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    if (!resolved.profile) {
      return NextResponse.json(
        { error: 'No active student profile is available for technique sign-off.' },
        { status: 404 }
      );
    }

    const profile = resolved.profile;
    const status = parsed.data.status;
    const verifiedAt = status === 'VERIFIED' ? new Date() : null;
    const verifiedBy = status === 'VERIFIED' ? guard.user.email : null;

    const outcome = await withTenantTransaction(
      { schoolId: guard.user.schoolId, userId: guard.user.userId },
      async (tx) => {
        const technique = await tx.technique.findFirst({
          where: {
            id: parsed.data.techniqueId,
            schoolId: guard.user.schoolId
          },
          select: { id: true }
        });

        if (!technique) {
          return { ok: false as const, status: 404, error: 'Technique not found in this school.' };
        }

        const progress = await tx.techniqueProgress.upsert({
          where: {
            profileId_techniqueId: {
              profileId: profile.id,
              techniqueId: parsed.data.techniqueId
            },
            schoolId: guard.user.schoolId
          },
          create: {
            schoolId: guard.user.schoolId,
            profileId: profile.id,
            techniqueId: parsed.data.techniqueId,
            status,
            verifiedAt,
            verifiedBy
          },
          update: {
            status,
            verifiedAt,
            verifiedBy
          }
        });

        return { ok: true as const, progress };
      }
    );

    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }

    return NextResponse.json({
      success: true,
      progress: {
        id: outcome.progress.id,
        profileId: outcome.progress.profileId,
        techniqueId: outcome.progress.techniqueId,
        status: outcome.progress.status,
        verifiedAt: outcome.progress.verifiedAt ? outcome.progress.verifiedAt.toISOString() : null,
        verifiedBy: outcome.progress.verifiedBy
      }
    });
  } catch {
    console.error('[BELTTRACK TECHNIQUES] POST verify error');
    return NextResponse.json(
      { error: 'Unable to record the technique sign-off. Please try again later.' },
      { status: 500 }
    );
  }
}
