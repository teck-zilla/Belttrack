import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

function safeEqual(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function isAuthorizedInternalMutation(request: NextRequest): boolean {
  if (!request.nextUrl.pathname.startsWith('/api/internal/')) return false;

  const secret = process.env.DELETION_PURGE_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;

  return safeEqual(request.headers.get('authorization') ?? '', `Bearer ${secret}`);
}

export function isSameOriginMutation(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
    return false;
  }

  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}
