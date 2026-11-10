import { NextResponse } from 'next/server';
import { z } from 'zod';
import { emailSchema } from '@/lib/validation/schemas';
import { verifyCode, isEmailVerified } from '@/lib/email-verification';
import { prisma } from '@/lib/prisma';

const verifyPayloadSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, 'Verification code must be exactly 6 digits')
});

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

    const parsed = verifyPayloadSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid verification payload' },
        { status: 400 }
      );
    }

    const { email, code } = parsed.data;
    const result = verifyCode(email, code);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to verify email code' },
        { status: 400 }
      );
    }

    // Persist verified status to PostgreSQL User table if present
    try {
      await prisma.user.updateMany({
        where: { email: email.toLowerCase().trim() },
        data: { isEmailVerified: true }
      });
    } catch (dbErr) {
      console.warn('[BELTTRACK AUTH /api/auth/verify-email] Database update warning:', dbErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Email address verified successfully.'
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error processing verification';
    console.error('[BELTTRACK AUTH /api/auth/verify-email] POST error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    let url: URL;
    try {
      url = new URL(request.url, 'http://localhost:3000');
    } catch {
      return NextResponse.json(
        { error: 'Malformed request URL' },
        { status: 400 }
      );
    }

    const email = url.searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email query parameter is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    let verified = isEmailVerified(normalizedEmail);

    // Fall back to database lookup if in-memory store doesn't indicate verified
    if (!verified) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { isEmailVerified: true }
        });
        if (user?.isEmailVerified) {
          verified = true;
        }
      } catch (dbErr) {
        console.warn('[BELTTRACK AUTH /api/auth/verify-email] DB lookup fallback:', dbErr);
      }
    }

    return NextResponse.json({
      email: normalizedEmail,
      verified
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error checking status';
    console.error('[BELTTRACK AUTH /api/auth/verify-email] GET error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
