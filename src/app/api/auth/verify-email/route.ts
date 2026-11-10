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
    const json = await request.json();
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

    return NextResponse.json(
      {
        success: true,
        message: 'Email address verified successfully.'
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error processing verification';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email query parameter is required' },
        { status: 400 }
      );
    }

    const verified = isEmailVerified(email);

    return NextResponse.json({
      email: email.toLowerCase().trim(),
      verified
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error checking status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

