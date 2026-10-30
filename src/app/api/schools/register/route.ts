import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { schoolRegistrationSchema } from '@/lib/validation/schemas';

export async function POST(request: Request) {
  try {
    const json = await request.json();
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
      customCode
    } = validated.data;

    // Generate unique slug & fallback join code
    const baseSlug = schoolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const uniqueSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug}-${uniqueSuffix}`;

    const joinCode = (
      customCode ||
      `${schoolName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase()}-${new Date().getFullYear()}`
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

    // Persist School and Owner User atomically
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
          hashedPassword: 'managed-auth-preview',
          role: 'OWNER',
          status: 'ACTIVE'
        }
      });

      return { school, user };
    });

    return NextResponse.json(
      {
        success: true,
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
          created_at: result.school.createdAt.toISOString(),
          updated_at: result.school.updatedAt.toISOString()
        }
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error registering school tenant';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

