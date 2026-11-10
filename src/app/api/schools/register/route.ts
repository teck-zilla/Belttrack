import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminClient } from '@/lib/supabase/admin';
import { schoolRegistrationSchema } from '@/lib/validation/schemas';
import { checkPredictablePassword } from '@/lib/validation/password';
import { checkPwnedPassword } from '@/lib/validation/pwned-check';
import { createAndSendVerificationCode } from '@/lib/email-verification';

export async function POST(request: Request) {
  const requestStart = performance.now();
  let dbDurationMs = 0;
  let emailDurationMs = 0;

  try {
    const url = new URL(request.url, 'http://localhost:3000');
    const isAsyncEmail = url.searchParams.get('async_email') === 'true' || request.headers.get('x-email-mode') === 'async';

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid or missing JSON payload in request body' },
        { status: 400 }
      );
    }

    const validated = schoolRegistrationSchema.safeParse(json);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || 'Invalid registration parameters' },
        { status: 400 }
      );
    }

    const {
      schoolName,
      discipline,
      ownerFullName,
      ownerEmail,
      city,
      country,
      timezone,
      customCode,
      password
    } = validated.data;

    // Check for predictable or personal info patterns
    const predictability = checkPredictablePassword(password, {
      email: ownerEmail,
      name: ownerFullName
    });
    if (predictability.isPredictable) {
      return NextResponse.json(
        { error: predictability.reason || 'Password is too predictable. Please choose a more complex passphrase.' },
        { status: 400 }
      );
    }

    // Check Have I Been Pwned breach database (Registration only)
    const pwned = await checkPwnedPassword(password);
    if (pwned.isPwned) {
      return NextResponse.json(
        { error: 'This password has appeared in a known data breach. Please choose a different, unique passphrase.' },
        { status: 400 }
      );
    }

    // Generate unique slug & fallback join code
    const baseSlug = schoolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const uniqueSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug}-${uniqueSuffix}`;

    const disciplineCodeMap: Record<string, string> = {
      brazilian_jiu_jitsu: 'BJJ',
      judo: 'JUDO',
      karate: 'KT',
      taekwondo: 'TKD',
      muay_thai: 'MT',
      krav_maga: 'KM'
    };
    const discCode = disciplineCodeMap[discipline] || 'BJJ';
    const fallbackPrefix = schoolName.replace(/[^a-zA-Z]/g, '').substring(0, 6).toUpperCase() || 'DOJO';

    const joinCode = (
      customCode ||
      `${fallbackPrefix}-${discCode}-${new Date().getFullYear()}`
    ).toUpperCase();

    // Check if joinCode is already taken
    const existingCode = await prisma.school.findUnique({
      where: { joinCode }
    });

    if (existingCode) {
      return NextResponse.json(
        { error: `Registration code "${joinCode}" is already in use. Please choose another code.` },
        { status: 409 }
      );
    }

    // Check if user email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: ownerEmail.toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: `An account with email "${ownerEmail}" already exists. Please sign in instead.` },
        { status: 409 }
      );
    }

    // Provision owner account in Supabase Auth if service role client is available
    let supabaseUid: string | null = null;
    try {
      const admin = getAdminClient();
      const authEmail = ownerEmail.toLowerCase().trim();
      const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
        email: authEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          role: 'OWNER',
          status: 'ACTIVE'
        }
      });
      if (!authErr && authUser?.user) {
        supabaseUid = authUser.user.id;
      }
    } catch {
      // Graceful fallback if admin client is unconfigured or in offline environment
    }

    // Persist School and Owner User atomically
    const dbStart = performance.now();
    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: schoolName,
          slug,
          discipline,
          city,
          timezone: timezone || 'UTC',
          joinCode,
          isCodeActive: true
        }
      });

      // Upsert or create owner user bound strictly to this school_id
      const user = await tx.user.create({
        data: {
          schoolId: school.id,
          email: ownerEmail.toLowerCase(),
          supabaseUid,
          hashedPassword: 'managed-auth-preview',
          role: 'OWNER',
          status: 'ACTIVE'
        }
      });

      return { school, user };
    });
    dbDurationMs = Math.round(performance.now() - dbStart);

    if (supabaseUid) {
      try {
        const admin = getAdminClient();
        await admin.auth.admin.updateUserById(supabaseUid, {
          user_metadata: {
            school_id: result.school.id,
            role: 'OWNER',
            status: 'ACTIVE'
          }
        });
      } catch {
        // Safe catch if metadata update is skipped
      }
    }

    // Dispatch 6-digit verification code: Synchronous (in-request) vs Background (asynchronous)
    const emailMode = isAsyncEmail ? 'background' : 'synchronous';

    if (isAsyncEmail) {
      // Mode 2: Detached background execution (non-blocking for HTTP response)
      createAndSendVerificationCode(ownerEmail.toLowerCase()).catch((emailErr) => {
        console.error('[BELTTRACK AUTH] Background email dispatch failed:', emailErr);
      });
    } else {
      // Mode 1: Synchronous execution on request thread
      const emailStart = performance.now();
      try {
        await createAndSendVerificationCode(ownerEmail.toLowerCase());
      } catch (emailErr) {
        console.error('[BELTTRACK AUTH] Failed to dispatch verification email:', emailErr);
      }
      emailDurationMs = Math.round(performance.now() - emailStart);
    }

    const totalDurationMs = Math.round(performance.now() - requestStart);

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          role: 'owner',
          email_verified: false,
          supabaseUid: result.user.supabaseUid
        },
        school: {
          id: result.school.id,
          name: result.school.name,
          slug: result.school.slug,
          registration_code: result.school.joinCode,
          join_code: result.school.joinCode,
          discipline: result.school.discipline,
          city: result.school.city,
          country,
          timezone: result.school.timezone,
          is_public: true,
          created_at: result.school.createdAt ? new Date(result.school.createdAt).toISOString() : new Date().toISOString(),
          updated_at: result.school.updatedAt ? new Date(result.school.updatedAt).toISOString() : new Date().toISOString()
        },
        timings: {
          totalMs: totalDurationMs,
          dbMs: dbDurationMs,
          emailMs: emailDurationMs,
          emailMode
        }
      },
      { status: 201 }
    );

    // Set Server-Timing header for browser DevTools and performance profilers
    response.headers.set(
      'Server-Timing',
      `db;dur=${dbDurationMs}, email;dur=${emailDurationMs}, total;dur=${totalDurationMs};desc="${emailMode}"`
    );

    return response;
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'An account with this email address or registration code already exists.' },
        { status: 409 }
      );
    }
    const message = error instanceof Error ? error.message : 'Database error registering school tenant';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
