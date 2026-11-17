import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/validation/schemas';
import { isEmailVerified } from '@/lib/email-verification';
import { getLatestAuthSession } from '@/lib/session-security';

function formatSchool(school: {
  id: string;
  name: string;
  slug: string;
  discipline: string;
  city: string;
  country?: string | null;
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
    discipline: school.discipline,
    city: school.city,
    country: school.country ?? '',
    timezone: school.timezone || 'UTC',
    is_public: true,
    created_at: safeCreated,
    updated_at: safeUpdated,
  };
}

export async function POST(request: Request) {
  try {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid or missing JSON payload in request body' },
        { status: 400 }
      );
    }

    const validated = loginSchema.safeParse(json);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || 'Invalid login credentials' },
        { status: 400 }
      );
    }

    const { email, schoolCode, password } = validated.data;
    let targetEmail: string;

    // If schoolCode is provided, resolve the school and its registered owner
    if (schoolCode) {
      const normalizedCode = schoolCode.toUpperCase().trim();
      const school = await prisma.school.findUnique({
        where: { joinCode: normalizedCode }
      });

      if (!school) {
        return NextResponse.json(
          { error: `No accredited school found for join code "${schoolCode}".` },
          { status: 404 }
        );
      }

      const ownerUser = await prisma.user.findFirst({
        where: {
          schoolId: school.id,
          role: 'OWNER'
        }
      });

      if (!ownerUser) {
        return NextResponse.json(
          { error: `No dojo owner registered under school "${school.name}".` },
          { status: 404 }
        );
      }

      targetEmail = ownerUser.email.toLowerCase().trim();
    } else if (email) {
      targetEmail = email.toLowerCase().trim();
    } else {
      return NextResponse.json(
        { error: 'Either email address or school code is required.' },
        { status: 400 }
      );
    }

    let authData: { user: { id: string } | null } | null = null;
    let authError: { message?: string } | null = null;
    let authUnavailable = false;

    try {
      const supabase = await createClient();
      const res = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });
      authData = res.data;
      authError = res.error;
    } catch {
      // Fail closed: managed auth must be available, never fall back to a shared preview password.
      authUnavailable = true;
    }

    if (authUnavailable) {
      return NextResponse.json(
        { error: 'Authentication service unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: 'Invalid credentials or password' },
        { status: 401 }
      );
    }

    // Resolve tenant user record bound strictly to school_id
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { supabaseUid: authData.user.id },
          { email: targetEmail }
        ]
      },
      include: {
        school: true,
        profile: true
      }
    });

    // Link supabase_uid if previously unlinked
    if (dbUser && !dbUser.supabaseUid) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { supabaseUid: authData.user.id },
        include: {
          school: true,
          profile: true
        }
      });
    }

    if (!dbUser) {
      return NextResponse.json({
        success: true,
        authenticated: true,
        needsOnboarding: true,
        user: {
          id: authData.user.id,
          email: targetEmail,
          role: null,
          status: 'pending_approval',
          school_id: null,
          email_verified: await isEmailVerified(targetEmail)
        }
      });
    }

    const sessionRow = await getLatestAuthSession(authData.user.id);
    if (sessionRow) {
      console.log(`[BELTTRACK AUTH /api/auth/login] Captured PostgreSQL auth.sessions row for ${dbUser.email}:`, {
        sessionId: sessionRow.id,
        userId: sessionRow.user_id,
        createdAt: sessionRow.created_at,
        ip: sessionRow.ip,
        userAgent: sessionRow.user_agent,
      });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      session: sessionRow,
      user: {
        id: dbUser.id,
        supabase_uid: authData.user.id,
        email: dbUser.email,
        role: dbUser.role.toLowerCase(),
        status: dbUser.status.toLowerCase(),
        school_id: dbUser.schoolId,
        school_name: dbUser.school?.name || null,
        school_slug: dbUser.school?.slug || null,
        first_name: dbUser.profile?.firstName || null,
        last_name: dbUser.profile?.lastName || null,
        email_verified: Boolean(dbUser.isEmailVerified)
      },
      school: dbUser.school ? formatSchool(dbUser.school) : null
    });
  } catch (error: unknown) {
    console.error('[BELTTRACK AUTH /api/auth/login] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unable to process authentication. Please try again later.' },
      { status: 500 }
    );
  }
}
