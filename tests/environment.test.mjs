import assert from 'node:assert/strict';
import test from 'node:test';
import { collectEnvironmentIssues, validateEnvironment } from '../src/lib/env-validation.ts';

const VALID_ENV = {
  DATABASE_URL: 'postgresql://user:pass@localhost:6543/belttrack?pgbouncer=true',
  DIRECT_URL: 'postgresql://user:pass@localhost:5432/belttrack',
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 's'.repeat(64),
  VERIFICATION_CODE_SECRET: 'v'.repeat(64),
  COOKIE_SECRET: 'c'.repeat(64),
  DELETION_PURGE_SECRET: 'd'.repeat(64),
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'u'.repeat(40),
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '587',
  SMTP_USER: 'user@example.com',
  SMTP_PASS: 'app-password',
  SMTP_FROM: '"BeltTrack Martial Arts" <no-reply@belttrack.app>'
};

function withProcessEnv(env, callback) {
  const original = { ...process.env };

  for (const key of Object.keys(process.env)) {
    if (!(key in env)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, env);

  try {
    return callback();
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in original)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, original);
  }
}

test('collectEnvironmentIssues accepts a complete production configuration', () => {
  assert.deepEqual(collectEnvironmentIssues(VALID_ENV), []);
});

test('collectEnvironmentIssues detects missing required variables', () => {
  const env = { ...VALID_ENV };
  delete env.COOKIE_SECRET;
  delete env.SMTP_PASS;

  const names = collectEnvironmentIssues(env).map((issue) => issue.name);
  assert.ok(names.includes('COOKIE_SECRET'));
  assert.ok(names.includes('SMTP_PASS'));
});

test('collectEnvironmentIssues rejects placeholders and weak secrets', () => {
  const env = {
    ...VALID_ENV,
    DATABASE_URL: 'postgresql://<USER>:<PASSWORD>@<HOST>:6543/<DATABASE>?pgbouncer=true',
    COOKIE_SECRET: 'short'
  };

  const issues = collectEnvironmentIssues(env);
  assert.ok(issues.some((issue) => issue.name === 'DATABASE_URL' && issue.reason.includes('placeholder')));
  assert.ok(issues.some((issue) => issue.name === 'COOKIE_SECRET' && issue.reason.includes('32 characters')));
});

test('collectEnvironmentIssues rejects invalid SMTP and rate-limit settings', () => {
  const env = {
    ...VALID_ENV,
    SMTP_PORT: '70000',
    SMTP_SECURE: 'maybe',
    DISABLE_RATE_LIMIT: 'true'
  };

  const names = collectEnvironmentIssues(env).map((issue) => issue.name);
  assert.ok(names.includes('SMTP_PORT'));
  assert.ok(names.includes('SMTP_SECURE'));
  assert.ok(names.includes('DISABLE_RATE_LIMIT'));
});

test('validateEnvironment fails closed in production', () => {
  withProcessEnv({ ...VALID_ENV, NODE_ENV: 'production' }, () => {
    assert.doesNotThrow(() => validateEnvironment());
  });

  const invalidEnv = { ...VALID_ENV, NODE_ENV: 'production' };
  delete invalidEnv.DELETION_PURGE_SECRET;

  withProcessEnv(invalidEnv, () => {
    assert.throws(
      () => validateEnvironment(),
      /DELETION_PURGE_SECRET \(missing\)/
    );
  });
});
