/**
 * BeltTrack Martial Arts Management - Session Security & Cryptographic Cookie Helpers
 * 
 * Enforces OWASP-recommended session hardening:
 * 1. SHA-256 one-way hashing for database session token storage.
 * 2. HMAC-SHA256 cookie signing and timing-safe verification.
 * 3. Strict cookie flag defaults: HttpOnly, Secure, SameSite=Lax, Path=/
 * 4. Origin/Host matching for CSRF mutation protection.
 */

import crypto from 'crypto';

/**
 * Returns hardened cookie flags for BeltTrack authentication cookies.
 */
export function getSecureCookieOptions(overrides: Record<string, unknown> = {}) {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    ...overrides,
  };
}

/**
 * One-way hash for session tokens before database persistence (SHA-256).
 * Ensures an attacker with database read access cannot hijack active sessions.
 */
export function hashSessionToken(rawToken: string): string {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new Error('Session token must be a non-empty string');
  }
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Signs a session identifier using HMAC-SHA256 for tamper-proof cookie storage.
 */
export function signSessionCookie(sessionId: string, customSecret?: string): string {
  if (!sessionId || typeof sessionId !== 'string') {
    throw new Error('Session ID must be a non-empty string');
  }

  const secret = customSecret || process.env.COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'belttrack-default-session-security-secret-key-32';
  const hmac = crypto.createHmac('sha256', secret).update(sessionId).digest('base64url');
  return `${sessionId}.${hmac}`;
}

/**
 * Verifies an HMAC-SHA256 signed cookie value using timing-safe comparison.
 * Returns the raw session identifier if valid, or null if tampered with.
 */
export function verifySessionCookie(signedValue: string, customSecret?: string): string | null {
  if (!signedValue || typeof signedValue !== 'string') return null;

  const dotIndex = signedValue.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const sessionId = signedValue.slice(0, dotIndex);
  const signature = signedValue.slice(dotIndex + 1);

  if (!sessionId || !signature) return null;

  const secret = customSecret || process.env.COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'belttrack-default-session-security-secret-key-32';
  const expectedSignature = crypto.createHmac('sha256', secret).update(sessionId).digest('base64url');

  try {
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return null;
    }

    const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    return isValid ? sessionId : null;
  } catch {
    return null;
  }
}

/**
 * Evaluates whether an incoming mutation request complies with CSRF origin checks.
 */
export function validateCsrfOrigin(
  originHeader: string | null,
  hostHeader: string | null
): { valid: boolean; reason?: string } {
  // If no origin header is provided (e.g. server-to-server or script), pass
  if (!originHeader) {
    return { valid: true };
  }

  if (!hostHeader) {
    return { valid: false, reason: 'Missing Host header' };
  }

  try {
    const originUrl = new URL(originHeader);
    if (originUrl.host !== hostHeader) {
      return {
        valid: false,
        reason: `Origin '${originUrl.host}' does not match expected host '${hostHeader}'`
      };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Malformed Origin header' };
  }
}

