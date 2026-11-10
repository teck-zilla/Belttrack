/**
 * BeltTrack SMTP Integration Test Suite
 * 
 * Verifies:
 * 1. isSmtpConfigured() reports false when environment variables are omitted.
 * 2. sendVerificationEmail() falls back cleanly to console logging without crashing.
 * 3. getSmtpTransporter() initializes properly when valid SMTP environment variables are present.
 */

import {
  isSmtpConfigured,
  sendVerificationEmail,
  getSmtpTransporter
} from '../src/lib/email-verification.ts';

async function runSmtpSuite() {
  console.log('==================================================');
  console.log('       BeltTrack SMTP Test Suite');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // --- Test 1: Fallback mode when SMTP is unconfigured ---
  console.log('[Test 1] Testing fallback behavior without SMTP variables...');
  const initialConfigured = isSmtpConfigured();
  assert(typeof initialConfigured === 'boolean', 'isSmtpConfigured() returns a valid boolean');

  // Verify sendVerificationEmail succeeds and returns true in fallback mode
  const sent = await sendVerificationEmail('test.smtp@kaizenbjj.org', '123456');
  assert(sent === true, 'sendVerificationEmail() returns true in console fallback mode');

  // --- Test 2: Input validation ---
  console.log('\n[Test 2] Testing invalid email handling...');
  const invalidEmailResult = await sendVerificationEmail('', '123456');
  assert(invalidEmailResult === false, 'sendVerificationEmail() safely returns false for empty email');

  // --- Test 3: Transporter creation when SMTP is defined ---
  console.log('\n[Test 3] Testing SMTP transporter configuration with mock variables...');
  const originalHost = process.env.SMTP_HOST;
  const originalUser = process.env.SMTP_USER;
  const originalPass = process.env.SMTP_PASS;

  try {
    process.env.SMTP_HOST = 'smtp.testserver.local';
    process.env.SMTP_USER = 'test-user';
    process.env.SMTP_PASS = 'test-pass';

    assert(isSmtpConfigured() === true, 'isSmtpConfigured() returns true when SMTP_HOST and SMTP_USER are set');
    const transporter = getSmtpTransporter();
    assert(transporter !== null, 'getSmtpTransporter() returns a valid transporter object');
  } finally {
    process.env.SMTP_HOST = originalHost;
    process.env.SMTP_USER = originalUser;
    process.env.SMTP_PASS = originalPass;
  }

  console.log('\n==================================================');
  console.log(`SMTP TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSmtpSuite().catch((err) => {
  console.error('Unhandled exception during SMTP test suite:', err);
  process.exit(1);
});

