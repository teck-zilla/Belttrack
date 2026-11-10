import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminClient } from '@/lib/supabase/admin';
import { studentJoinCodeSchema } from '@/lib/validation/schemas';
import { checkPredictablePassword } from '@/lib/validation/password';
import { checkPwnedPassword } from '@/lib/validation/pwned-check';
import { createAndSendVerificationCode } from '@/lib/email-verification';

export async function POST(request: Request) {
  try {
    const json = await request.json();
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
      isMinor,
      guardianFullName,
      guardianEmail
    } = validated.data;

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

    // Split student name
    const parts = studentFullName.trim().split(/\s+/);
    const firstName = parts[0] || studentFullName;
    const lastName = parts.slice(1).join(' ') || 'Student';

    // Provision account in Supabase Auth if service role client is available
    let supabaseUid: string | null = null;
    try {
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
      if (!authErr && authUser?.user) {
        supabaseUid = authUser.user.id;
      }
    } catch {
      // Graceful fallback if admin client is unconfigured or in offline environment
    }

    // Atomic transaction for Student User, StudentProfile, and optional Guardian link
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or link Student User record
      const studentUser = await tx.user.create({
        data: {
          schoolId: school.id,
          email: studentEmail.toLowerCase(),
          supabaseUid,
          hashedPassword: 'managed-auth-preview',
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
          dateOfBirth: new Date('2000-01-01'), // default mock date
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

        if (!guardianUser) {
          guardianUser = await tx.user.create({
            data: {
              schoolId: school.id,
              email: gEmail,
              hashedPassword: 'managed-auth-preview',
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

    // Generate and dispatch 6-digit verification code via randomBytes algorithm
    try {
      await createAndSendVerificationCode(studentEmail.toLowerCase());
    } catch (emailErr) {
      console.error('[BELTTRACK AUTH] Failed to dispatch verification email:', emailErr);
    }

    return NextResponse.json(
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
          country: 'United Kingdom',
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
          enrolled_at: result.profile.createdAt.toISOString()
        }
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please sign in instead.' },
        { status: 409 }
      );
    }
    const message = error instanceof Error ? error.message : 'Database error processing join request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
