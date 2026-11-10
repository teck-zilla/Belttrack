/**
 * BeltTrack Martial Arts Management - Email Verification Service
 * 
 * Implements cryptographically secure 6-digit verification code generation
 * using Node.js crypto.randomBytes, transactional email dispatch logging,
 * and stateful verification tracking.
 */

import crypto from 'crypto';

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
export const CODE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const RESEND_COOLDOWN_MS = 60 * 1000;  // 60 seconds
export const MAX_VERIFICATION_ATTEMPTS = 5;

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
 * Dispatches or logs the transactional verification email.
 * In development and MVP environments without external SMTP/SES workers,
 * outputs the complete structured email to the server console.
 */
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const timestamp = new Date().toISOString();

  // Output structured transactional email to the server console
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
  console.log('This code will expire in 15 minutes.');
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
  const normalizedEmail = email.toLowerCase().trim();
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
  const normalizedEmail = email.toLowerCase().trim();
  const cleanedCode = inputCode.trim();
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
export function isEmailVerified(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  const record = verificationStore.get(normalizedEmail);
  return record ? record.verified : false;
}

/**
 * Manually marks an email as verified or unverified.
 */
export function setEmailVerified(email: string, verified: boolean): void {
  const normalizedEmail = email.toLowerCase().trim();
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
  const normalizedEmail = email.toLowerCase().trim();
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
  return verificationStore.get(email.toLowerCase().trim());
}

/**
 * Clears verification state for an email (useful for test resets).
 */
export function clearVerificationState(email: string): void {
  verificationStore.delete(email.toLowerCase().trim());
}

