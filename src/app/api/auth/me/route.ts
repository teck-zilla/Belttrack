import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import type { DisciplineType } from '@/types/domain';
import { isEmailVerified } from '@/lib/email-verification';

function formatSchool(school: {
  id: string;
  name: string;
  slug: string;
  discipline: string;
  city: string;
  timezone?: string | null;
  joinCode: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const safeCreated = school.createdAt ? new Date(school.createdAt).toISOString() : new Date().toISOString();
  const safeUpdated = school.updatedAt ? new Date(school.updatedAt).toISOString() : new Date().toISOString();

  return {
    id: school.id,
    name: school.name,
    slug: school.slug,
    registration_code: school.joinCode,
    join_code: school.joinCode,
    discipline: school.discipline as DisciplineType,
    city: school.city,
    country: 'United Kingdom',
    timezone: school.timezone || 'UTC',
    is_public: true,
    created_at: safeCreated,
    updated_at: safeUpdated,
  };
}

export async function GET() {
  try {
    let authUser = null;

    try {
      const supabase = await createClient();
      const { data, error: authError } = await supabase.auth.getUser();
      if (!authError && data?.user) {
        authUser = data.user;
      }
    } catch {
      // Graceful fallback when Supabase is unconfigured or offline in dev/preview
      return NextResponse.json({
        authenticated: false,
        user: null
      });
    }

    if (!authUser) {
      return NextResponse.json({
        authenticated: false,
        user: null
      });
    }

    const normalizedEmail = authUser.email?.toLowerCase().trim();

    // Query tenant-scoped user record
    let dbUser = null;
    try {
      dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            { supabaseUid: authUser.id },
            ...(normalizedEmail ? [{ email: normalizedEmail }] : [])
          ]
        },
        include: {
          school: true,
          profile: true
        }
      });

      if (dbUser && !dbUser.supabaseUid) {
        dbUser = await prisma.user.update({
          where: { id: dbUser.id },
          data: { supabaseUid: authUser.id },
          include: {
            school: true,
            profile: true
          }
        });
      }
    } catch (dbErr) {
      console.warn('[BELTTRACK AUTH /api/auth/me] Database query fallback:', dbErr);
    }

    if (!dbUser) {
      return NextResponse.json({
        authenticated: true,
        needsOnboarding: true,
        user: {
          id: authUser.id,
          email: authUser.email,
          role: null,
          status: 'pending_approval',
          school_id: null,
          email_verified: isEmailVerified(authUser.email)
        }
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: dbUser.id,
        supabase_uid: authUser.id,
        email: dbUser.email,
        role: dbUser.role.toLowerCase(),
        status: dbUser.status.toLowerCase(),
        school_id: dbUser.schoolId,
        school_name: dbUser.school?.name || null,
        school_slug: dbUser.school?.slug || null,
        first_name: dbUser.profile?.firstName || null,
        last_name: dbUser.profile?.lastName || null,
        email_verified: isEmailVerified(dbUser.email)
      },
      school: dbUser.school ? formatSchool(dbUser.school) : null
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve active session';
    console.error('[BELTTRACK AUTH /api/auth/me] Unexpected server error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
