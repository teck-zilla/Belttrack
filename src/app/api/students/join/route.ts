import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { studentJoinCodeSchema } from '@/lib/validation/schemas';

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
      isMinor,
      guardianFullName,
      guardianEmail
    } = validated.data;

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

    // Atomic transaction for Student User, StudentProfile, and optional Guardian link
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or link Student User record
      const studentUser = await tx.user.create({
        data: {
          schoolId: school.id,
          email: studentEmail.toLowerCase(),
          hashedPassword: 'managed-auth-preview',
          role: 'STUDENT',
          status: 'PENDING_APPROVAL' // strictly locked until coach verification
        }
      });

      // 2. Create StudentProfile
      const profile = await tx.studentProfile.create({
        data: {
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
              guardianId: guardianUser.id,
              studentId: studentUser.id,
              isApproved: false
            }
          });
        }
      }

      return { studentUser, profile };
    });

    return NextResponse.json(
      {
        success: true,
        schoolName: school.name,
        schoolId: school.id,
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

