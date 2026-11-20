import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { studentJoinCodeSchema } from '@/lib/validation/schemas';
import { checkPredictablePassword } from '@/lib/validation/password';
import { checkPwnedPassword } from '@/lib/validation/pwned-check';
import { createAndSendVerificationCode, isSmtpConfigured } from '@/lib/email-verification';

export async function POST(request: Request) {
  const requestStart = performance.now();
  let dbDurationMs = 0;
  let emailDurationMs = 0;

  try {
    const url = new URL(request.url, 'http://localhost:3000');
    const isAsyncEmail =
      process.env.NODE_ENV !== 'production' &&
      (url.searchParams.get('async_email') === 'true' || request.headers.get('x-email-mode') === 'async');

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid or missing JSON payload in request body' },
        { status: 400 }
      );
    }

    const validated = studentJoinCodeSchema.safeParse(json);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || 'Invalid join parameters' },
        { status: 400 }
      );
    }

    const {
      registrationCode,
      studentFullName,
      studentEmail,
      password,
      dateOfBirth,
      isMinor,
      guardianFullName,
      guardianEmail
    } = validated.data;

    // Fail closed: managed auth is mandatory. Never provision a member without a real auth identity.
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json(
        { error: 'Authentication service is not configured. Registration is temporarily unavailable.' },
        { status: 503 }
      );
    }

    if (!isSmtpConfigured()) {
      return NextResponse.json(
        { error: 'Email delivery is not configured. Registration is temporarily unavailable.' },
        { status: 503 }
      );
    }

    // Reject predictable sequences, excessive repetition, or user info
    const predictability = checkPredictablePassword(password, {
      email: studentEmail,
      name: studentFullName
    });
    if (predictability.isPredictable) {
      return NextResponse.json(
        { error: predictability.reason || 'Password is too predictable. Please choose a more complex passphrase.' },
        { status: 400 }
      );
    }

    // Reject compromised/breached passwords via HIBP k-Anonymity (Registration only)
    const pwned = await checkPwnedPassword(password);
    if (pwned.isPwned) {
      return NextResponse.json(
        { error: 'This password has appeared in a known data breach. Please choose a different, unique passphrase.' },
        { status: 400 }
      );
    }

    // Verify school exists by join code
    const school = await prisma.school.findUnique({
      where: { joinCode: registrationCode.toUpperCase() }
    });

    if (!school || !school.isCodeActive) {
      return NextResponse.json(
        { error: `Registration code "${registrationCode}" is invalid or inactive.` },
        { status: 404 }
      );
    }

    // Verify student email is not already registered
    const existingStudent = await prisma.user.findUnique({
      where: { email: studentEmail.toLowerCase().trim() }
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: `An account with email "${studentEmail}" already exists. Please sign in instead.` },
        { status: 409 }
      );
    }

    // Guardians may only be linked inside the school they already belong to.
    if (isMinor && guardianEmail) {
      const existingGuardian = await prisma.user.findUnique({
        where: { email: guardianEmail.toLowerCase().trim() }
      });

      if (existingGuardian && existingGuardian.schoolId !== school.id) {
        return NextResponse.json(
          { error: 'That guardian email belongs to a different school.' },
          { status: 409 }
        );
      }

      if (existingGuardian && existingGuardian.role !== 'GUARDIAN') {
        return NextResponse.json(
          { error: 'That guardian email is already registered with a different role.' },
          { status: 409 }
        );
      }
    }

    // Split student name
    const parts = studentFullName.trim().split(/\s+/);
    const firstName = parts[0] || studentFullName;
    const lastName = parts.slice(1).join(' ') || 'Student';

    // Provision the student auth identity. If this fails, abort before any DB write.
    const admin = getAdminClient();
    const authEmail = studentEmail.toLowerCase().trim();
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        school_id: school.id,
        role: 'STUDENT',
        status: 'PENDING_APPROVAL'
      }
    });

    if (authErr || !authUser?.user) {
      return NextResponse.json(
        { error: 'Authentication service unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const supabaseUid: string = authUser.user.id;

    // Atomic transaction for Student User, StudentProfile, and optional Guardian link
    const dbStart = performance.now();
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or link Student User record
      const studentUser = await tx.user.create({
        data: {
          schoolId: school.id,
          email: studentEmail.toLowerCase(),
          supabaseUid,
          role: 'STUDENT',
          status: 'PENDING_APPROVAL' // strictly locked until coach verification
        }
      });

      // 2. Create StudentProfile
      const profile = await tx.studentProfile.create({
        data: {
          schoolId: school.id,
          userId: studentUser.id,
          firstName,
          lastName,
          dateOfBirth: new Date(`${dateOfBirth}T00:00:00.000Z`),
          isMinor
        }
      });

      // 3. If minor, find or create Guardian record and link
      if (isMinor && guardianFullName) {
        const gEmail = (guardianEmail
          ? guardianEmail.toLowerCase()
          : `guardian.${studentUser.id.slice(0, 8)}@example.com`).trim();

        let guardianUser = await tx.user.findUnique({
          where: { email: gEmail }
        });

        if (guardianUser && (guardianUser.schoolId !== school.id || guardianUser.role !== 'GUARDIAN')) {
          throw new Error('GUARDIAN_TENANT_MISMATCH');
        }

        if (!guardianUser) {
          guardianUser = await tx.user.create({
            data: {
              schoolId: school.id,
              email: gEmail,
              role: 'GUARDIAN',
              status: 'PENDING_APPROVAL'
            }
          });
        }

        const existingLink = await tx.guardianStudent.findUnique({
          where: {
            guardianId_studentId: {
              guardianId: guardianUser.id,
              studentId: studentUser.id
            }
          }
        });

        if (!existingLink) {
          await tx.guardianStudent.create({
            data: {
              schoolId: school.id,
              guardianId: guardianUser.id,
              studentId: studentUser.id,
              isApproved: false
            }
          });
        }
      }

      return { studentUser, profile };
    });
    dbDurationMs = Math.round(performance.now() - dbStart);

    const emailMode = isAsyncEmail ? 'background' : 'synchronous';

    if (isAsyncEmail) {
      createAndSendVerificationCode(studentEmail.toLowerCase()).catch(() => {
        console.error('[BELTTRACK AUTH] Background email dispatch failed');
      });
    } else {
      const emailStart = performance.now();
      const emailResult = await createAndSendVerificationCode(studentEmail.toLowerCase());
      emailDurationMs = Math.round(performance.now() - emailStart);

      if (!emailResult.success) {
        return NextResponse.json(
          { error: emailResult.error || 'Unable to send verification email. Please try again later.' },
          { status: emailResult.deliveryUnavailable ? 503 : 400 }
        );
      }
    }

    const totalDurationMs = Math.round(performance.now() - requestStart);

    const response = NextResponse.json(
      {
        success: true,
        schoolName: school.name,
        schoolId: school.id,
        school: {
          id: school.id,
          name: school.name,
          slug: school.slug,
          registration_code: school.joinCode,
          discipline: school.discipline,
          city: school.city,
          country: school.country ?? '',
          timezone: school.timezone,
          is_public: true
        },
        user: {
          id: result.studentUser.id,
          email: result.studentUser.email,
          role: 'student',
          status: 'PENDING_APPROVAL',
          email_verified: false,
          supabaseUid: result.studentUser.supabaseUid
        },
        member: {
          id: result.profile.id,
          school_id: school.id,
          user_id: result.studentUser.id,
          role: 'student',
          status: 'pending_approval',
          full_name: studentFullName,
          email: studentEmail,
          guardian_name: isMinor ? guardianFullName : undefined,
          guardian_email: isMinor ? guardianEmail : undefined,
          stripes_count: 0,
          total_classes_attended: 0,
          is_flagged_inactive: false,
          enrolled_at: result.profile.createdAt ? new Date(result.profile.createdAt).toISOString() : new Date().toISOString()
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
    if (error instanceof Error && error.message === 'GUARDIAN_TENANT_MISMATCH') {
      return NextResponse.json(
        { error: 'That guardian email belongs to a different school or role.' },
        { status: 409 }
      );
    }
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please sign in instead.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Unable to complete join request right now. Please try again.' },
      { status: 500 }
    );
  }
}
