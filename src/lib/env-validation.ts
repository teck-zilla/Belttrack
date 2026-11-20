/**
 * BeltTrack Martial Arts Management - Boot-time Environment Validation
 *
 * Fails fast in production when required secrets/config are missing so the app
 * cannot silently start in a degraded or insecure mode. In development it warns
 * and continues so interactive preview work is not blocked.
 */

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VERIFICATION_CODE_SECRET',
  'COOKIE_SECRET',
  'DELETION_PURGE_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM'
] as const;

const SECRET_ENV_VARS = [
  'VERIFICATION_CODE_SECRET',
  'COOKIE_SECRET',
  'DELETION_PURGE_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'UPSTASH_REDIS_REST_TOKEN',
  'SMTP_PASS'
] as const;

const GENERIC_PLACEHOLDER_PATTERNS = [
  /^change[-_]?me$/i,
  /^replace[-_]?me$/i,
  /^your[-_].+/i,
  /^todo$/i
];

const ANGLE_PLACEHOLDER_PATTERN = /<[^>]+>/;

const SECRET_MIN_LENGTHS: Record<string, number> = {
  VERIFICATION_CODE_SECRET: 32,
  COOKIE_SECRET: 32,
  DELETION_PURGE_SECRET: 32,
  SUPABASE_SERVICE_ROLE_KEY: 32,
  UPSTASH_REDIS_REST_TOKEN: 20,
  SMTP_PASS: 8
};

export interface EnvironmentIssue {
  name: string;
  reason: string;
}

function hasPlaceholder(value: string, includeAngleBrackets = true): boolean {
  return (
    (includeAngleBrackets && ANGLE_PLACEHOLDER_PATTERN.test(value)) ||
    GENERIC_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value))
  );
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isValidDatabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'postgresql:' || url.protocol === 'postgres:';
  } catch {
    return false;
  }
}

export function collectEnvironmentIssues(env: NodeJS.ProcessEnv = process.env): EnvironmentIssue[] {
  const issues: EnvironmentIssue[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    const value = env[key]?.trim();
    if (!value) {
      issues.push({ name: key, reason: 'missing' });
      continue;
    }
    if (hasPlaceholder(value, key !== 'SMTP_FROM')) {
      issues.push({ name: key, reason: 'contains a placeholder value' });
    }
  }

  for (const key of SECRET_ENV_VARS) {
    const value = env[key]?.trim();
    const minimum = SECRET_MIN_LENGTHS[key];
    if (value && !hasPlaceholder(value) && value.length < minimum) {
      issues.push({ name: key, reason: `must be at least ${minimum} characters` });
    }
  }

  const databaseUrl = env.DATABASE_URL?.trim();
  if (databaseUrl && !hasPlaceholder(databaseUrl) && !isValidDatabaseUrl(databaseUrl)) {
    issues.push({ name: 'DATABASE_URL', reason: 'must be a PostgreSQL URL' });
  }

  const directUrl = env.DIRECT_URL?.trim();
  if (directUrl && !hasPlaceholder(directUrl) && !isValidDatabaseUrl(directUrl)) {
    issues.push({ name: 'DIRECT_URL', reason: 'must be a PostgreSQL URL' });
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (supabaseUrl && !hasPlaceholder(supabaseUrl) && !isValidHttpUrl(supabaseUrl)) {
    issues.push({ name: 'NEXT_PUBLIC_SUPABASE_URL', reason: 'must be a valid URL' });
  }

  const upstashUrl = env.UPSTASH_REDIS_REST_URL?.trim();
  if (upstashUrl && !hasPlaceholder(upstashUrl) && !isValidHttpUrl(upstashUrl)) {
    issues.push({ name: 'UPSTASH_REDIS_REST_URL', reason: 'must be a valid URL' });
  }

  const smtpPort = env.SMTP_PORT?.trim();
  if (smtpPort && !/^\d+$/.test(smtpPort)) {
    issues.push({ name: 'SMTP_PORT', reason: 'must be a numeric port' });
  } else if (smtpPort) {
    const port = Number(smtpPort);
    if (port < 1 || port > 65535) {
      issues.push({ name: 'SMTP_PORT', reason: 'must be between 1 and 65535' });
    }
  }

  const smtpSecure = env.SMTP_SECURE?.trim();
  if (smtpSecure && smtpSecure !== 'true' && smtpSecure !== 'false') {
    issues.push({ name: 'SMTP_SECURE', reason: 'must be true or false' });
  }

  const smtpFrom = env.SMTP_FROM?.trim();
  if (smtpFrom && !hasPlaceholder(smtpFrom, false) && !smtpFrom.includes('@')) {
    issues.push({ name: 'SMTP_FROM', reason: 'must be a valid sender identity' });
  }

  if (env.DISABLE_RATE_LIMIT?.trim() === 'true') {
    issues.push({ name: 'DISABLE_RATE_LIMIT', reason: 'must not be true in production' });
  }

  return issues;
}

export function validateEnvironment(): void {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  const issues = collectEnvironmentIssues();
  if (issues.length === 0) {
    return;
  }

  const details = issues.map((issue) => `${issue.name} (${issue.reason})`).join('; ');
  const message = `[BELTTRACK] Invalid environment configuration: ${details}`;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(message);
  }

  console.warn(`${message}. Development mode will continue with degraded behavior.`);
}
