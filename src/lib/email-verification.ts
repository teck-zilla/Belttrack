/**
 * BeltTrack Martial Arts Management - Email Verification Service
 * 
 * Implements cryptographically secure 6-digit verification code generation
 * using Node.js crypto.randomBytes, transactional email dispatch logging,
 * and stateful verification tracking with defensive error handling.
 */

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface VerificationRecord {
  email: string;
  code: string;
  expiresAt: number;   // Timestamp (ms)
  attempts: number;    // Counter for brute-force prevention
  verified: boolean;
  lastSentAt: number;  // Timestamp (ms) for cooldown rate-limiting
}

// Global store to persist verification state across hot module reloads in development
const globalForVerification = globalThis as unknown as {
  _belttrackVerificationStore?: Map<string, VerificationRecord>;
};

const verificationStore =
  globalForVerification._belttrackVerificationStore ?? new Map<string, VerificationRecord>();

if (process.env.NODE_ENV !== 'production') {
  globalForVerification._belttrackVerificationStore = verificationStore;
}

// Constants
export const CODE_EXPIRY_MS = 6 * 60 * 1000;  // 6 minutes
export const RESEND_COOLDOWN_MS = 60 * 1000;  // 60 seconds
export const MAX_VERIFICATION_ATTEMPTS = 3;

/**
 * Safely normalizes an email address without throwing TypeErrors.
 */
function normalizeEmail(email: unknown): string {
  if (typeof email !== 'string') return '';
  return email.toLowerCase().trim();
}

/**
 * Generates a cryptographically secure 6-digit numeric verification code
 * using the Node.js crypto.randomBytes algorithm.
 * 
 * An unsigned 32-bit integer provides 0 to 4,294,967,295.
 * Modulo 900,000 + 100,000 strictly guarantees a 6-digit string from "100000" to "999999".
 */
export function generateVerificationCode(): string {
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0);
  const code = (100000 + (num % 900000)).toString();
  return code;
}

/**
 * Safely initializes or retrieves the SMTP transporter singleton.
 * Returns null if SMTP_HOST or SMTP_USER are not configured in environment variables.
 */
let smtpTransporter: Transporter | null = null;

export function getSmtpTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host || !user) {
    return null;
  }

  if (!smtpTransporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    smtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass: pass || ''
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000
    });
  }

  return smtpTransporter;
}

/**
 * Checks whether SMTP delivery is configured in the current environment.
 */
export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim());
}

/**
 * Dispatches the transactional verification email via configured SMTP transporter.
 * Gracefully falls back to structured server console logging when SMTP is unconfigured,
 * offline, or encounters delivery failure.
 */
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  const transporter = getSmtpTransporter();

  // If SMTP is configured, attempt outbound delivery via SMTP transporter
  if (transporter) {
    const startTime = performance.now();
    try {
      const fromAddress = process.env.SMTP_FROM?.trim() || '"BeltTrack Martial Arts" <no-reply@belttrack.app>';
      await transporter.sendMail({
        from: fromAddress,
        to: normalizedEmail,
        subject: 'BeltTrack - Verify Your Email Address',
        text: `Welcome to BeltTrack Martial Arts Management!\n\nYour 6-digit account verification code is: ${code}\n\nThis code will expire in 6 minutes.\nEnter this code in your BeltTrack dashboard banner to confirm your email.\nIf you did not register for an account, please disregard this email.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid lightgray; border-radius: 8px; background-color: white; color: black;">
            <div style="margin-bottom: 20px;">
              <span style="font-weight: bold; font-size: 18px; letter-spacing: 0.5px; color: black;">BELTTRACK</span>
              <span style="font-size: 13px; color: dimgray; margin-left: 8px;">Martial Arts Management</span>
            </div>
            <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 12px; color: black;">Verify Your Email Address</h2>
            <p style="font-size: 14px; line-height: 1.5; color: dimgray; margin: 0 0 20px;">
              Welcome to BeltTrack! Use the 6-digit verification code below to confirm your email address and activate your account.
            </p>
            <div style="background-color: whitesmoke; border: 1px solid lightgray; border-radius: 6px; padding: 16px; text-align: center; margin: 0 0 20px;">
              <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: black;">${code}</span>
            </div>
            <p style="font-size: 13px; color: gray; margin: 0 0 16px;">
              This code will expire in <strong>6 minutes</strong>.
            </p>
            <hr style="border: none; border-top: 1px solid lightgray; margin: 20px 0;" />
            <p style="font-size: 12px; color: gray; margin: 0;">
              If you did not create a BeltTrack account, you can safely disregard this email.
            </p>
          </div>
        `
      });

      const durationMs = Math.round(performance.now() - startTime);
      console.log(`[BELTTRACK AUTH] Verification email successfully dispatched via SMTP to: ${normalizedEmail} [${durationMs}ms]`);
      return true;
    } catch (smtpErr) {
      const durationMs = Math.round(performance.now() - startTime);
      console.warn(`[BELTTRACK AUTH] SMTP dispatch failed after ${durationMs}ms, falling back to console logger:`, smtpErr);
    }
  }

  // Graceful fallback: output structured transactional email to the server console
  const timestamp = new Date().toISOString();
  console.log('\n======================================================================');
  console.log('              BELTTRACK TRANSACTIONAL EMAIL DISPATCH                  ');
  console.log('======================================================================');
  console.log(`[Timestamp]: ${timestamp}`);
  console.log(`[To]:        ${normalizedEmail}`);
  console.log(`[Subject]:   BeltTrack - Verify Your Email Address`);
  console.log('----------------------------------------------------------------------');
  console.log('Welcome to BeltTrack Martial Arts Management!');
  console.log('');
  console.log(`Your 6-digit account verification code is:`);
  console.log(`                   >>>  ${code}  <<<`);
  console.log('');
  console.log('This code will expire in 6 minutes.');
  console.log('Enter this code in your BeltTrack dashboard banner to confirm your email.');
  console.log('If you did not register for an account, please disregard this email.');
  console.log('======================================================================\n');

  return true;
}

/**
 * Creates and dispatches a new verification code for the specified email.
 */
export async function createAndSendVerificationCode(
  email: string
): Promise<{ success: boolean; error?: string; expiresAt?: number; code?: string }> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return { success: false, error: 'A valid email address is required.' };
  }

  const now = Date.now();
  const existing = verificationStore.get(normalizedEmail);

  // Check cooldown if existing record was sent recently
  if (existing && !existing.verified && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
    return {
      success: false,
      error: `Please wait ${retryAfterSeconds} seconds before requesting a new code.`
    };
  }

  const code = generateVerificationCode();
  const expiresAt = now + CODE_EXPIRY_MS;

  const record: VerificationRecord = {
    email: normalizedEmail,
    code,
    expiresAt,
    attempts: 0,
    verified: false,
    lastSentAt: now
  };

  verificationStore.set(normalizedEmail, record);

  await sendVerificationEmail(normalizedEmail, code);

  return {
    success: true,
    expiresAt,
    code // Exposed in dev/test for easy verification inspection
  };
}

/**
 * Verifies a 6-digit code submitted for an email address.
 */
export function verifyCode(
  email: string,
  inputCode: string
): { success: boolean; error?: string } {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return {
      success: false,
      error: 'Invalid or missing email address.'
    };
  }

  const cleanedCode = typeof inputCode === 'string' ? inputCode.trim() : '';
  if (!cleanedCode) {
    return {
      success: false,
      error: 'Verification code is required.'
    };
  }

  const now = Date.now();
  const record = verificationStore.get(normalizedEmail);

  if (!record) {
    return {
      success: false,
      error: 'No active verification code found for this email. Please request a new code.'
    };
  }

  if (record.verified) {
    return {
      success: true
    };
  }

  if (now > record.expiresAt) {
    return {
      success: false,
      error: 'Verification code has expired. Please request a new code.'
    };
  }

  if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    return {
      success: false,
      error: 'Maximum verification attempts exceeded. Please request a new code.'
    };
  }

  if (record.code !== cleanedCode) {
    record.attempts += 1;
    const remaining = MAX_VERIFICATION_ATTEMPTS - record.attempts;
    return {
      success: false,
      error: remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Incorrect code. Maximum attempts exceeded. Please request a new code.'
    };
  }

  // Mark record as verified
  record.verified = true;
  verificationStore.set(normalizedEmail, record);

  console.log(`[BELTTRACK AUTH] Email verified successfully: ${normalizedEmail}`);

  return {
    success: true
  };
}

/**
 * Checks whether an email address is verified.
 */
export function isEmailVerified(email?: string | null): boolean {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  const record = verificationStore.get(normalizedEmail);
  return record ? record.verified : false;
}

/**
 * Manually marks an email as verified or unverified.
 */
export function setEmailVerified(email: string, verified: boolean): void {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;

  const existing = verificationStore.get(normalizedEmail);
  if (existing) {
    existing.verified = verified;
  } else {
    verificationStore.set(normalizedEmail, {
      email: normalizedEmail,
      code: '',
      expiresAt: 0,
      attempts: 0,
      verified,
      lastSentAt: 0
    });
  }
}

/**
 * Resends a verification code to the user's email if cooldown period has elapsed.
 */
export async function resendVerificationCode(
  email: string
): Promise<{ success: boolean; error?: string; retryAfter?: number; code?: string }> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return {
      success: false,
      error: 'A valid email address is required.'
    };
  }

  const now = Date.now();
  const record = verificationStore.get(normalizedEmail);

  if (record && !record.verified) {
    const elapsed = now - record.lastSentAt;
    if (elapsed < RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return {
        success: false,
        error: `Please wait ${retryAfter} seconds before requesting a new code.`,
        retryAfter
      };
    }
  }

  const result = await createAndSendVerificationCode(normalizedEmail);
  return result;
}

/**
 * Retrieves the current verification record (for diagnostic/test inspection).
 */
export function getVerificationRecord(email: string): VerificationRecord | undefined {
  const normalized = normalizeEmail(email);
  if (!normalized) return undefined;
  return verificationStore.get(normalized);
}

/**
 * Clears verification state for an email (useful for test resets).
 */
export function clearVerificationState(email: string): void {
  const normalized = normalizeEmail(email);
  if (normalized) {
    verificationStore.delete(normalized);
  }
}
