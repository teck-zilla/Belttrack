import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Only expose public accredited schools: name, slug, city, discipline, joinCode
    // All private records (rosters, techniques, ledgers) are excluded
    const schools = await prisma.school.findMany({
      where: { isCodeActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        discipline: true,
        joinCode: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, schools });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error fetching public directory';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

