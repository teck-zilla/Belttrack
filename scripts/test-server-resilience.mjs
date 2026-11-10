/**
 * BeltTrack Server-Side Robustness & 500 Prevention Test Suite
 * 
 * Verifies defensive handling of edge cases, null pointers, and malformed inputs:
 * 1. Verification service functions with null, undefined, non-string, or empty arguments.
 * 2. Protection against TypeErrors and unhandled exceptions across server helpers.
 */

import {
  isEmailVerified,
  verifyCode,
  createAndSendVerificationCode,
  resendVerificationCode,
  setEmailVerified,
  getVerificationRecord,
  clearVerificationState
} from '../src/lib/email-verification.ts';

async function runResilienceTests() {
  console.log('==================================================');
  console.log(' BeltTrack Server-Side Robustness Verification');
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

  // --- Test 1: isEmailVerified null safety ---
  console.log('[Test 1] Testing isEmailVerified() with invalid inputs...');
  try {
    assert(isEmailVerified(null) === false, 'isEmailVerified(null) safely returns false');
    assert(isEmailVerified(undefined) === false, 'isEmailVerified(undefined) safely returns false');
    assert(isEmailVerified('') === false, 'isEmailVerified("") safely returns false');
    assert(isEmailVerified(123) === false, 'isEmailVerified(123) safely returns false');
    assert(isEmailVerified({}) === false, 'isEmailVerified({}) safely returns false');
  } catch (err) {
    assert(false, `isEmailVerified threw unexpected error: ${err.message}`);
  }

  // --- Test 2: verifyCode null safety ---
  console.log('\n[Test 2] Testing verifyCode() with invalid inputs...');
  try {
    const r1 = verifyCode(null, null);
    assert(r1.success === false, 'verifyCode(null, null) safely returns error');

    const r2 = verifyCode('test@kaizen.org', null);
    assert(r2.success === false, 'verifyCode(email, null) safely returns error');

    const r3 = verifyCode(null, '123456');
    assert(r3.success === false, 'verifyCode(null, code) safely returns error');

    const r4 = verifyCode('', '');
    assert(r4.success === false, 'verifyCode("", "") safely returns error');
  } catch (err) {
    assert(false, `verifyCode threw unexpected error: ${err.message}`);
  }

  // --- Test 3: createAndSendVerificationCode null safety ---
  console.log('\n[Test 3] Testing createAndSendVerificationCode() with invalid inputs...');
  try {
    const r1 = await createAndSendVerificationCode(null);
    assert(r1.success === false, 'createAndSendVerificationCode(null) safely returns error');

    const r2 = await createAndSendVerificationCode('');
    assert(r2.success === false, 'createAndSendVerificationCode("") safely returns error');

    const r3 = await createAndSendVerificationCode(undefined);
    assert(r3.success === false, 'createAndSendVerificationCode(undefined) safely returns error');
  } catch (err) {
    assert(false, `createAndSendVerificationCode threw unexpected error: ${err.message}`);
  }

  // --- Test 4: resendVerificationCode null safety ---
  console.log('\n[Test 4] Testing resendVerificationCode() with invalid inputs...');
  try {
    const r1 = await resendVerificationCode(null);
    assert(r1.success === false, 'resendVerificationCode(null) safely returns error');

    const r2 = await resendVerificationCode('');
    assert(r2.success === false, 'resendVerificationCode("") safely returns error');
  } catch (err) {
    assert(false, `resendVerificationCode threw unexpected error: ${err.message}`);
  }

  // --- Test 5: State mutation functions null safety ---
  console.log('\n[Test 5] Testing setEmailVerified, getVerificationRecord, clearVerificationState...');
  try {
    setEmailVerified(null, true);
    assert(true, 'setEmailVerified(null, true) does not throw');

    const rec = getVerificationRecord(null);
    assert(rec === undefined, 'getVerificationRecord(null) returns undefined');

    clearVerificationState(null);
    assert(true, 'clearVerificationState(null) does not throw');
  } catch (err) {
    assert(false, `State functions threw unexpected error: ${err.message}`);
  }

  console.log('\n==================================================');
  console.log(`RESILIENCE SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runResilienceTests().catch((err) => {
  console.error('Unexpected failure:', err);
  process.exit(1);
});

