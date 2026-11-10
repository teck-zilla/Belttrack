/**
 * BeltTrack Email Verification Automated Verification Suite
 * 
 * Verifies:
 * 1. 6-digit code generation using randomBytes algorithm (format, distribution, length).
 * 2. Dispatching verification code and storing record.
 * 3. Rejecting invalid 6-digit codes and decrementing attempts.
 * 4. Maximum attempts lockout.
 * 5. Accepting correct 6-digit code and updating verification state.
 * 6. Cooldown rate-limiting on code resends.
 */

import {
  generateVerificationCode,
  createAndSendVerificationCode,
  verifyCode,
  isEmailVerified,
  resendVerificationCode,
  clearVerificationState,
  getVerificationRecord,
  CODE_EXPIRY_MS,
  MAX_VERIFICATION_ATTEMPTS
} from '../src/lib/email-verification.ts';

async function runEmailVerificationSuite() {
  console.log('==================================================');
  console.log('  BeltTrack Email Verification Test Suite');
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

  // --- Test 1: randomBytes 6-digit generation ---
  console.log('[Test 1] Testing randomByte 6-digit code generation...');
  let allValid = true;
  const sampleCodes = new Set();

  for (let i = 0; i < 50; i++) {
    const code = generateVerificationCode();
    if (!/^\d{6}$/.test(code) || Number(code) < 100000 || Number(code) > 999999) {
      allValid = false;
      break;
    }
    sampleCodes.add(code);
  }

  assert(allValid, 'All 50 generated codes are strictly 6-digit numbers (100000 - 999999)');
  assert(sampleCodes.size > 40, `High entropy verified: ${sampleCodes.size}/50 unique codes in sample`);

  // --- Test 2: createAndSendVerificationCode ---
  console.log('\n[Test 2] Creating and dispatching verification code...');
  const testEmail = 'student.verify@kaizen.org';
  clearVerificationState(testEmail);

  assert(!isEmailVerified(testEmail), 'Email initially reports unverified');

  const createResult = await createAndSendVerificationCode(testEmail);
  assert(createResult.success === true, 'Verification code created and dispatched successfully');
  assert(typeof createResult.code === 'string' && createResult.code.length === 6, 'Generated code is 6 digits');
  assert(createResult.expiresAt > Date.now() + 5 * 60 * 1000, 'Expiration is set to ~6 minutes');

  const record = getVerificationRecord(testEmail);
  assert(record !== undefined && record.code === createResult.code, 'Record correctly stored in verification store');

  // --- Test 3: Incorrect code rejection & attempt tracking ---
  console.log('\n[Test 3] Testing incorrect code rejection and attempt tracking...');
  const wrongCode = createResult.code === '111111' ? '222222' : '111111';
  const fail1 = verifyCode(testEmail, wrongCode);
  assert(!fail1.success, 'Incorrect code was rejected');
  assert(fail1.error && fail1.error.includes('attempt'), 'Error message informs user of remaining attempts');

  // --- Test 4: Resend cooldown rate limit ---
  console.log('\n[Test 4] Testing 60-second cooldown rate limit on resends...');
  const resendCooldown = await resendVerificationCode(testEmail);
  assert(!resendCooldown.success, 'Immediate resend was rejected by cooldown');
  assert(resendCooldown.error && resendCooldown.error.includes('wait'), 'Error message instructs user to wait');

  // --- Test 5: Successful verification with correct code ---
  console.log('\n[Test 5] Verifying with correct 6-digit code...');
  const successVerify = verifyCode(testEmail, createResult.code);
  assert(successVerify.success === true, 'Correct 6-digit code successfully verified');
  assert(isEmailVerified(testEmail) === true, 'isEmailVerified() now returns true');

  // --- Test 5b: Replay rejection / second use of same valid code ---
  console.log('\n[Test 5b] Testing replay rejection on second use of same valid code...');
  const replayVerify = verifyCode(testEmail, createResult.code);
  assert(!replayVerify.success, 'Replay of same valid code is rejected');
  assert(replayVerify.error && replayVerify.error.includes('already been used'), 'Error message indicates code already used');

  // --- Test 6: Expired code handling ---
  console.log('\n[Test 6] Testing expired code rejection...');
  const expiredEmail = 'expired@kaizen.org';
  clearVerificationState(expiredEmail);
  await createAndSendVerificationCode(expiredEmail);
  const expRecord = getVerificationRecord(expiredEmail);
  if (expRecord) {
    expRecord.expiresAt = Date.now() - 1000; // force expired
  }
  const expiredResult = verifyCode(expiredEmail, expRecord.code);
  assert(!expiredResult.success, 'Expired code was rejected');
  assert(expiredResult.error && expiredResult.error.includes('expired'), 'Error message indicates code expiration');

  // --- Test 7: Max attempts lockout ---
  console.log('\n[Test 7] Testing maximum attempts lockout...');
  const lockoutEmail = 'lockout@kaizen.org';
  clearVerificationState(lockoutEmail);
  const lockoutCreate = await createAndSendVerificationCode(lockoutEmail);
  for (let i = 0; i < MAX_VERIFICATION_ATTEMPTS; i++) {
    verifyCode(lockoutEmail, '000000');
  }
  const lockedOut = verifyCode(lockoutEmail, lockoutCreate.code);
  assert(!lockedOut.success, 'Submitting correct code after 3 failures is rejected');
  assert(lockedOut.error && lockedOut.error.includes('exceeded'), 'Lockout error reported');

  console.log('\n==================================================');
  console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEmailVerificationSuite().catch((err) => {
  console.error('Unexpected suite failure:', err);
  process.exit(1);
});

