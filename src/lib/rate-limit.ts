/**
 * BeltTrack Martial Arts Management - In-Memory IP Rate Limiter
 * 
 * Provides sliding/fixed window rate limiting directly within the Next.js runtime.
 * Protects critical auth and onboarding endpoints against brute-force, join-code enumeration,
 * and denial-of-service without external infrastructure dependencies.
 */

export interface RateLimitRule {
  key: string;
  limit: number;
  windowSeconds: number;
  description: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
  retryAfter: number; // Seconds to wait until reset
  message?: string;
}

interface RateLimitRecord {
  count: number;
  resetAt: number; // Unix timestamp in milliseconds
}

// Persist in-memory store across hot module reloading in development
const globalStore = globalThis as unknown as {
  __belttrack_rate_limit_store?: Map<string, RateLimitRecord>;
  __belttrack_rate_limit_last_prune?: number;
};

const store: Map<string, RateLimitRecord> =
  globalStore.__belttrack_rate_limit_store ?? new Map<string, RateLimitRecord>();

globalStore.__belttrack_rate_limit_store = store;

/**
 * Prune expired records to prevent unbounded memory growth.
 * Runs at most once every 60 seconds or when store exceeds 1,000 entries.
 */
function pruneExpiredEntries(): void {
  const now = Date.now();
  const lastPrune = globalStore.__belttrack_rate_limit_last_prune || 0;

  if (now - lastPrune < 60_000 && store.size < 1_000) {
    return;
  }

  for (const [key, record] of store.entries()) {
    if (record.resetAt <= now) {
      store.delete(key);
    }
  }

  globalStore.__belttrack_rate_limit_last_prune = now;
}

/**
 * Formats wait time in human-readable seconds or minutes.
 */
export function formatRetryTime(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.ceil(seconds / 60);
    return `${mins} minute${mins === 1 ? '' : 's'}`;
  }
  return `${seconds} second${seconds === 1 ? '' : 's'}`;
}

/**
 * Resolves the client IP address from proxy and edge headers.
 */
export function getClientIp(request: Request): string {
  // 1. Standard proxy header (comma-separated list, first entry is client IP)
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  // 2. Direct reverse proxy header
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp && xRealIp.trim()) {
    return xRealIp.trim();
  }

  // 3. Cloudflare connecting IP
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  // 4. Local development fallback
  return '127.0.0.1';
}

/**
 * Rate limit configuration rules mapped to BeltTrack endpoint tiers.
 */
export function getRateLimitConfig(pathname: string, method: string): RateLimitRule | null {
  const normalizedMethod = method.toUpperCase();

  // 1. Strict Auth: Login endpoint (brute force & credential stuffing prevention)
  if (pathname === '/api/auth/login' && normalizedMethod === 'POST') {
    return {
      key: 'auth_login',
      limit: 5,
      windowSeconds: 15 * 60, // 15 minutes
      description: 'login attempts'
    };
  }

  // 2. Strict Onboarding: Student Join endpoint (join code enumeration prevention)
  if (pathname === '/api/students/join' && normalizedMethod === 'POST') {
    return {
      key: 'student_join',
      limit: 10,
      windowSeconds: 15 * 60, // 15 minutes
      description: 'join attempts'
    };
  }

  // 3. Strict Tenant: School Registration endpoint (spam / tenant flood prevention)
  if (pathname === '/api/schools/register' && normalizedMethod === 'POST') {
    return {
      key: 'school_register',
      limit: 5,
      windowSeconds: 60 * 60, // 1 hour
      description: 'school registration attempts'
    };
  }

  // 4. Moderate: School approvals mutation
  if (pathname === '/api/schools/approvals' && normalizedMethod === 'POST') {
    return {
      key: 'school_approvals',
      limit: 30,
      windowSeconds: 60, // 1 minute
      description: 'approval requests'
    };
  }

  // 5. Moderate: Logout
  if (pathname === '/api/auth/logout' && normalizedMethod === 'POST') {
    return {
      key: 'auth_logout',
      limit: 30,
      windowSeconds: 60, // 1 minute
      description: 'logout requests'
    };
  }

  // 6. Lenient: Public school directory and authenticated profile reads
  if (
    (pathname === '/api/schools/directory' ||
      pathname === '/api/schools' ||
      pathname === '/api/auth/me') &&
    (normalizedMethod === 'GET' || normalizedMethod === 'HEAD')
  ) {
    return {
      key: 'public_read',
      limit: 60,
      windowSeconds: 60, // 1 minute
      description: 'requests'
    };
  }

  // 7. General API fallback for any unclassified /api/ route
  if (pathname.startsWith('/api/')) {
    return {
      key: 'api_general',
      limit: 100,
      windowSeconds: 60, // 1 minute
      description: 'API requests'
    };
  }

  // Non-API routes (pages, static files) are not rate-limited here
  return null;
}

/**
 * Checks and increments the rate limit count for a given key.
 */
export function checkRateLimit(key: string, rule: RateLimitRule): RateLimitResult {
  // Allow disabling rate limiting via environment variable if needed during bulk testing
  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    return {
      success: true,
      limit: rule.limit,
      remaining: rule.limit,
      reset: Math.floor((Date.now() + rule.windowSeconds * 1000) / 1000),
      retryAfter: 0
    };
  }

  pruneExpiredEntries();

  const now = Date.now();
  const existing = store.get(key);

  // If no record exists or window expired, initialize a new window
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + rule.windowSeconds * 1000;
    store.set(key, { count: 1, resetAt });

    return {
      success: true,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - 1),
      reset: Math.floor(resetAt / 1000),
      retryAfter: 0
    };
  }

  // Existing active window
  const resetInSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count >= rule.limit) {
    const formattedWait = formatRetryTime(resetInSeconds);
    return {
      success: false,
      limit: rule.limit,
      remaining: 0,
      reset: Math.floor(existing.resetAt / 1000),
      retryAfter: resetInSeconds,
      message: `Too many ${rule.description} from this IP address. Please try again in ${formattedWait}.`
    };
  }

  // Increment count
  existing.count += 1;
  store.set(key, existing);

  return {
    success: true,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - existing.count),
    reset: Math.floor(existing.resetAt / 1000),
    retryAfter: 0
  };
}

/**
 * Helper to reset rate limits (useful for testing suites).
 */
export function resetRateLimits(): void {
  store.clear();
}
