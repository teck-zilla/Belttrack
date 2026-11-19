import { NextResponse } from 'next/server';
import { z } from 'zod';
import { emailSchema } from '@/lib/validation/schemas';
import { verifyCode, isEmailVerified } from '@/lib/email-verification';

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
    const normalizedEmail = email.toLowerCase().trim();
    const result = await verifyCode(normalizedEmail, code);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to verify email code' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Email address verified successfully.'
      },
      { status: 200 }
    );
  } catch {
    console.error('[BELTTRACK AUTH /api/auth/verify-email] POST error');
    return NextResponse.json(
      { error: 'Unable to verify the email code. Please try again later.' },
      { status: 500 }
    );
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
    const verified = await isEmailVerified(normalizedEmail);

    return NextResponse.json({
      email: normalizedEmail,
      verified
    });
  } catch {
    console.error('[BELTTRACK AUTH /api/auth/verify-email] GET error');
    return NextResponse.json(
      { error: 'Unable to check verification status. Please try again later.' },
      { status: 500 }
    );
  }
}
