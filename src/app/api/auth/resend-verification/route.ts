import { NextResponse } from 'next/server';
import { z } from 'zod';
import { emailSchema } from '@/lib/validation/schemas';
import { resendVerificationCode } from '@/lib/email-verification';

const resendPayloadSchema = z.object({
  email: emailSchema
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

    const parsed = resendPayloadSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const result = await resendVerificationCode(email);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to resend verification code',
          retryAfter: result.retryAfter
        },
        { status: result.retryAfter ? 429 : 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Verification code resent successfully. Please check your email.'
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error resending verification';
    console.error('[BELTTRACK AUTH /api/auth/resend-verification] POST error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
