/**
 * BeltTrack Martial Arts Management - Password Reset API Route
 * 
 * Supports in-modal 6-digit OTP password reset workflow:
 * 1. Action 'request' or 'resend': Validates user / school code and dispatches 6-digit code.
 * 2. Action 'confirm': Verifies 6-digit code, enforces password rules, and updates credentials.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { checkPredictablePassword } from '@/lib/validation/password';
import { passwordCreationSchema } from '@/lib/validation/schemas';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  createAndSendPasswordResetCode,
  verifyPasswordResetCode,
  markPasswordResetCodeUsed,
  resendPasswordResetCode
} from '@/lib/email-verification';

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid or missing JSON payload in request body' },
        { status: 400 }
      );
    }

    const action = String(body.action || '').trim().toLowerCase();

    // =========================================================================
    // ACTION 1: REQUEST OR RESEND RESET CODE
    // =========================================================================
    if (action === 'request' || action === 'resend') {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const schoolCode = typeof body.schoolCode === 'string' ? body.schoolCode.trim().toUpperCase() : '';

      if (!email && !schoolCode) {
        return NextResponse.json(
          { error: 'Please enter your account email or school join code.' },
          { status: 400 }
        );
      }

      // Strict per-email rate limit in addition to the per-IP middleware limit.
      const perEmailKey = `reset_request:${email || schoolCode}`;
      const perEmailLimit = checkRateLimit(perEmailKey, {
        key: 'reset_request_email',
        limit: 3,
        windowSeconds: 15 * 60,
        description: 'password reset requests'
      });

      if (!perEmailLimit.success) {
        return NextResponse.json(
          { error: perEmailLimit.message, retryAfter: perEmailLimit.retryAfter },
          {
            status: 429,
            headers: { 'Retry-After': perEmailLimit.retryAfter.toString() }
          }
        );
      }

      let targetEmail = '';

      // Path A: School Join Code entered by Dojo Owner
      if (schoolCode) {
        const school = await prisma.school.findUnique({
          where: { joinCode: schoolCode },
          include: {
            users: {
              where: { role: 'OWNER' }
            }
          }
        });

        if (school?.users?.[0]) {
          targetEmail = school.users[0].email;
        }
      }
      // Path B: Direct Email entered by Student or Owner
      else if (email) {
        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (user) {
          targetEmail = user.email;
        }
      }

      // Enumeration-safe: always return the same response whether or not an account exists.
      if (targetEmail) {
        try {
          if (action === 'resend') {
            await resendPasswordResetCode(targetEmail);
          } else {
            await createAndSendPasswordResetCode(targetEmail);
          }
        } catch {
          console.error('[BELTTRACK AUTH /api/auth/reset-password] Reset code dispatch failed');
        }
      }

      return NextResponse.json({
        success: true,
        message: 'If an account matches the details provided, a 6-digit reset code has been sent.'
      });
    }

    // =========================================================================
    // ACTION 2: CONFIRM RESET CODE & UPDATE PASSWORD
    // =========================================================================
    if (action === 'confirm') {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const code = typeof body.code === 'string' ? body.code.trim() : '';
      const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

      if (!email || !code || !newPassword) {
        return NextResponse.json(
          { error: 'Email, verification code, and new password are required.' },
          { status: 400 }
        );
      }

      // Strict per-email confirmation limiter in addition to the per-IP middleware limit.
      const confirmLimit = checkRateLimit(`reset_confirm:${email}`, {
        key: 'reset_confirm_email',
        limit: 5,
        windowSeconds: 15 * 60,
        description: 'password reset confirmations'
      });

      if (!confirmLimit.success) {
        return NextResponse.json(
          { error: confirmLimit.message, retryAfter: confirmLimit.retryAfter },
          {
            status: 429,
            headers: { 'Retry-After': confirmLimit.retryAfter.toString() }
          }
        );
      }

      // 1. Verify 6-digit reset code (DB-backed, single-use, attempt limited)
      const verifyResult = await verifyPasswordResetCode(email, code);
      if (!verifyResult.success) {
        return NextResponse.json(
          { error: 'Invalid or expired verification code.' },
          { status: 400 }
        );
      }

      // 2. Enforce the 15-128 character password policy
      const policy = passwordCreationSchema.safeParse(newPassword);
      if (!policy.success) {
        return NextResponse.json(
          { error: policy.error.issues[0]?.message || 'Password does not meet the required policy.' },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid or expired verification code.' },
          { status: 400 }
        );
      }

      const predictability = checkPredictablePassword(newPassword, {
        email: user.email,
        name: user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : undefined
      });

      if (predictability.isPredictable) {
        return NextResponse.json(
          { error: predictability.reason || 'Password is too predictable. Please choose a more complex passphrase.' },
          { status: 400 }
        );
      }

      // 3. Fail closed unless the managed auth identity is available and updates cleanly.
      if (!user.supabaseUid || !isSupabaseAdminConfigured()) {
        return NextResponse.json(
          { error: 'Authentication service unavailable. Please try again later.' },
          { status: 503 }
        );
      }

      try {
        const admin = getAdminClient();
        const { error: updateErr } = await admin.auth.admin.updateUserById(user.supabaseUid, {
          password: newPassword
        });
        if (updateErr) {
          return NextResponse.json(
            { error: 'Authentication service unavailable. Please try again later.' },
            { status: 503 }
          );
        }
      } catch {
        console.warn('[BELTTRACK AUTH /api/auth/reset-password] Supabase admin unavailable');
        return NextResponse.json(
          { error: 'Authentication service unavailable. Please try again later.' },
          { status: 503 }
        );
      }

      // 4. Mark the one-time reset code as consumed
      await markPasswordResetCodeUsed(email);

      console.log('[BELTTRACK AUTH /api/auth/reset-password] Password reset completed.');

      return NextResponse.json({
        success: true,
        message: 'Password has been successfully updated.'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions are "request", "resend", and "confirm".' },
      { status: 400 }
    );
  } catch {
    console.error('[BELTTRACK AUTH /api/auth/reset-password] Unexpected error');
    return NextResponse.json(
      { error: 'Unable to process the password reset request. Please try again later.' },
      { status: 500 }
    );
  }
}

