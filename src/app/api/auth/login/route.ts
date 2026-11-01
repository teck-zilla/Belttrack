import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/validation/schemas';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const validated = loginSchema.safeParse(json);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || 'Invalid login credentials' },
        { status: 400 }
      );
    }

    const { email, password } = validated.data;
    const normalizedEmail = email.toLowerCase().trim();

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Resolve tenant user record bound strictly to school_id
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { supabaseUid: authData.user.id },
          { email: normalizedEmail }
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
          email: normalizedEmail,
          role: null,
          status: 'pending_approval',
          school_id: null
        }
      });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: dbUser.id,
        supabase_uid: authData.user.id,
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
    const message = error instanceof Error ? error.message : 'Internal authentication error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

