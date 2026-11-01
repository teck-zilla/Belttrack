import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        authenticated: false,
        user: null
      });
    }

    const normalizedEmail = user.email?.toLowerCase().trim();

    // Query tenant-scoped user record
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { supabaseUid: user.id },
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
        data: { supabaseUid: user.id },
        include: {
          school: true,
          profile: true
        }
      });
    }

    if (!dbUser) {
      return NextResponse.json({
        authenticated: true,
        needsOnboarding: true,
        user: {
          id: user.id,
          email: user.email,
          role: null,
          status: 'pending_approval',
          school_id: null
        }
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: dbUser.id,
        supabase_uid: user.id,
        email: dbUser.email,
        role: dbUser.role.toLowerCase(),
        status: dbUser.status.toLowerCase(),
        school_id: dbUser.schoolId,
        school_name: dbUser.school.name,
        school_slug: dbUser.school.slug,
        first_name: dbUser.profile?.firstName || null,
        last_name: dbUser.profile?.lastName || null
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve active session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

