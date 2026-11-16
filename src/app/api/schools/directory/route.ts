import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // PRD public directory fields only: name, slug, city, discipline.
    // Join codes, tenant IDs, and all private records are never exposed.
    const schools = await prisma.school.findMany({
      where: { isCodeActive: true },
      select: {
        name: true,
        slug: true,
        city: true,
        discipline: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, schools });
  } catch (error: unknown) {
    console.error('[BELTTRACK AUTH /api/schools/directory] GET error:', error);
    return NextResponse.json(
      { error: 'Unable to load the public directory. Please try again later.' },
      { status: 500 }
    );
  }
}
