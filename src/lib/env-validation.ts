/**
 * BeltTrack Martial Arts Management - Boot-time Environment Validation
 *
 * Fails fast in production when required secrets/config are missing so the app
 * cannot silently start in a degraded or insecure mode. In development it warns
 * and continues so interactive preview work is not blocked.
 */

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
] as const;

export function validateEnvironment(): void {
  // Skip during the production build phase; validate at server boot instead.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]?.trim());

  if (missing.length === 0) {
    return;
  }

  const message = `[BELTTRACK] Missing required environment variables: ${missing.join(', ')}`;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(message);
  }

  console.warn(`${message}. Development mode will continue with degraded behavior.`);
}
