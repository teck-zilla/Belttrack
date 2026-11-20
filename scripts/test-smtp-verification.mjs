import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const service = await readFile(new URL('../src/lib/email-verification.ts', import.meta.url), 'utf8');
const registerRoute = await readFile(new URL('../src/app/api/schools/register/route.ts', import.meta.url), 'utf8');
const joinRoute = await readFile(new URL('../src/app/api/students/join/route.ts', import.meta.url), 'utf8');
const resendRoute = await readFile(new URL('../src/app/api/auth/resend-verification/route.ts', import.meta.url), 'utf8');
const resetRoute = await readFile(new URL('../src/app/api/auth/reset-password/route.ts', import.meta.url), 'utf8');

const checks = [
  [
    'SMTP configuration requires host, user, and password',
    /SMTP_HOST[\s\S]{0,200}SMTP_USER[\s\S]{0,200}SMTP_PASS/.test(service)
  ],
  [
    'verification dispatch fails closed when transporter is unavailable',
    /if \(!transporter\) \{[\s\S]{0,200}return false;/.test(service)
  ],
  [
    'verification dispatch fails closed on send error',
    /SMTP verification dispatch failed[\s\S]{0,120}return false;/.test(service)
  ],
  [
    'no email console fallback success path remains',
    !/fallback used; recipient and code withheld/.test(service)
  ],
  [
    'verification code issuance requires configured SMTP',
    /if \(!isSmtpConfigured\(\)\) \{[\s\S]{0,220}deliveryUnavailable: true/.test(service)
  ],
  [
    'undelivered verification codes are invalidated',
    /where: \{ email: normalizedEmail, purpose: 'EMAIL_VERIFICATION', used: false \}[\s\S]{0,120}used: true/.test(
      service
    )
  ],
  [
    'password reset dispatch fails closed on send error',
    /SMTP password reset dispatch failed[\s\S]{0,120}return false;/.test(service)
  ],
  [
    'verification status trusts only the persisted user flag',
    !/user\?\.isEmailVerified \|\| verifiedCode/.test(service) &&
      /return Boolean\(user\?\.isEmailVerified\);/.test(service)
  ],
  [
    'registration and join routes require SMTP before provisioning',
    /registration is temporarily unavailable/i.test(registerRoute) &&
      /registration is temporarily unavailable/i.test(joinRoute)
  ],
  [
    'async email mode is blocked in production',
    /process\.env\.NODE_ENV !== 'production'/.test(registerRoute) &&
      /process\.env\.NODE_ENV !== 'production'/.test(joinRoute)
  ],
  [
    'resend route returns 503 for delivery unavailability',
    /deliveryUnavailable \? 503/.test(resendRoute)
  ],
  [
    'password reset route blocks requests when SMTP is unconfigured',
    /Password reset is temporarily unavailable/.test(resetRoute)
  ]
];

let failed = 0;

console.log('==================================================');
console.log('       BeltTrack SMTP Fail-Closed Test Suite');
console.log('==================================================\n');

for (const [label, passed] of checks) {
  if (passed) {
    console.log(`  [PASS] ${label}`);
  } else {
    console.error(`  [FAIL] ${label}`);
    failed += 1;
  }
}

console.log(`\nSMTP TEST SUMMARY: ${checks.length - failed} passed, ${failed} failed\n`);

if (failed > 0) {
  assert.fail(`${failed} SMTP fail-closed check(s) failed`);
}
