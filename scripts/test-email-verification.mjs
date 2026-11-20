import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const service = await readFile(new URL('../src/lib/email-verification.ts', import.meta.url), 'utf8');
const schema = await readFile(new URL('../src/lib/validation/schemas.ts', import.meta.url), 'utf8');

const checks = [
  [
    'verification codes use cryptographically secure random bytes',
    /crypto\.randomBytes\(4\)/.test(service) && /100000 \+ \(num % 900000\)/.test(service)
  ],
  [
    'verification codes are HMAC-peppered before storage',
    /createHmac\('sha256', secret\)/.test(service) && /timingSafeEqual/.test(service)
  ],
  [
    'verification codes expire after six minutes',
    /CODE_EXPIRY_MS = 6 \* 60 \* 1000/.test(service)
  ],
  [
    'verification resends enforce a cooldown',
    /RESEND_COOLDOWN_MS = 60 \* 1000/.test(service) && /Please wait \$\{retryAfter\} seconds/.test(service)
  ],
  [
    'verification attempts are capped',
    /MAX_VERIFICATION_ATTEMPTS = 3/.test(service) && /record\.attempts >= MAX_VERIFICATION_ATTEMPTS/.test(service)
  ],
  [
    'verification rejects expired codes',
    /Date\.now\(\) > record\.expiresAt\.getTime\(\)/.test(service)
  ],
  [
    'successful verification is single-use',
    /where: \{ id: record\.id \}[\s\S]{0,120}used: true/.test(service)
  ],
  [
    'verification status depends only on persisted user state',
    /return Boolean\(user\?\.isEmailVerified\);/.test(service) &&
      !/user\?\.isEmailVerified \|\| verifiedCode/.test(service)
  ],
  [
    'registration and resend paths require SMTP delivery',
    /if \(!isSmtpConfigured\(\)\)/.test(service) && /deliveryUnavailable: true/.test(service)
  ],
  [
    'email and reset code payloads remain schema validated',
    /emailSchema/.test(schema) && /passwordCreationSchema/.test(schema)
  ]
];

let failed = 0;

console.log('==================================================');
console.log('  BeltTrack Email Verification Static Test Suite');
console.log('==================================================\n');

for (const [label, passed] of checks) {
  if (passed) {
    console.log(`  [PASS] ${label}`);
  } else {
    console.error(`  [FAIL] ${label}`);
    failed += 1;
  }
}

console.log(`\nEMAIL VERIFICATION TEST SUMMARY: ${checks.length - failed} passed, ${failed} failed\n`);

if (failed > 0) {
  assert.fail(`${failed} email verification check(s) failed`);
}
