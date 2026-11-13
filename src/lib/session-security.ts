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
import { prisma } from '@/lib/prisma';
import type { AuthSessionRow } from '@/types/domain';

export type { AuthSessionRow };

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

/**
 * Queries the active or latest session row directly from PostgreSQL's auth.sessions table.
 */
export async function getLatestAuthSession(supabaseUid: string): Promise<AuthSessionRow | null> {
  if (!supabaseUid || typeof supabaseUid !== 'string') return null;

  try {
    const rows = await prisma.$queryRaw<Array<{
      id: string;
      user_id: string;
      created_at: Date | string;
      updated_at: Date | string;
      ip: string | null;
      user_agent: string | null;
      aal: string | null;
    }>>`
      SELECT 
        id::text, 
        user_id::text, 
        created_at, 
        updated_at, 
        ip::text, 
        user_agent,
        aal::text
      FROM auth.sessions 
      WHERE user_id = ${supabaseUid}::uuid 
      ORDER BY created_at DESC 
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
      ip: row.ip || null,
      user_agent: row.user_agent || null,
      aal: row.aal || null,
    };
  } catch (err) {
    console.warn('[BELTTRACK AUTH] Unable to query auth.sessions from PostgreSQL:', err);
    return null;
  }
}

