/**
 * BeltTrack Database Verification Code Persistence Test
 * 
 * Verifies:
 * 1. Database columns 'verification_code' and 'verification_expires_at' exist on User table.
 * 2. createAndSendVerificationCode() synchronizes the active code to PostgreSQL.
 * 3. The code can be retrieved directly from the User record in PostgreSQL.
 */

import { PrismaClient } from '@prisma/client';
import { createAndSendVerificationCode, clearVerificationState } from '../src/lib/email-verification.ts';

const prisma = new PrismaClient();

async function runDbCodeSuite() {
  console.log('==================================================');
  console.log('  BeltTrack Database Verification Code Suite      ');
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

  const testEmail = `test.db.code.${Date.now()}@kaizenbjj.org`;

  try {
    // 1. Get an existing school ID for test user
    const school = await prisma.school.findFirst();
    if (!school) {
      console.error('No school found in database to link test user.');
      process.exit(1);
    }

    // 2. Create test user in PostgreSQL
    console.log(`[Step 1] Creating test user in PostgreSQL: ${testEmail}...`);
    const user = await prisma.user.create({
      data: {
        schoolId: school.id,
        email: testEmail,
        role: 'STUDENT',
        status: 'PENDING_APPROVAL',
        isEmailVerified: false
      }
    });
    assert(user.id !== null, 'User created in PostgreSQL');
    assert(user.verificationCode === null, 'Initial verificationCode is null');

    // 3. Dispatch verification code
    console.log('\n[Step 2] Calling createAndSendVerificationCode()...');
    const result = await createAndSendVerificationCode(testEmail);
    assert(result.success === true, 'createAndSendVerificationCode succeeded');
    assert(Boolean(result.code), 'Returned 6-digit code');

    // 4. Query PostgreSQL directly to confirm persistence
    console.log('\n[Step 3] Querying PostgreSQL User table directly for verificationCode...');
    const updatedUser = await prisma.user.findUnique({
      where: { email: testEmail },
      select: {
        id: true,
        email: true,
        verificationCode: true,
        verificationExpiresAt: true,
        isEmailVerified: true
      }
    });

    assert(updatedUser !== null, 'Found user in database');
    assert(updatedUser.verificationCode === result.code, `Database verificationCode (${updatedUser.verificationCode}) matches generated code (${result.code})`);
    assert(updatedUser.verificationExpiresAt !== null, 'Database verificationExpiresAt is set');
    assert(updatedUser.isEmailVerified === false, 'User remains unverified prior to code entry');

    console.log(`\n  ✅ Verified in DB: User ${testEmail} has verification_code: ${updatedUser.verificationCode}`);

    // Cleanup test user
    await prisma.user.delete({ where: { email: testEmail } });
    clearVerificationState(testEmail);

    console.log('\n==================================================');
    console.log(`DB CODE TEST SUMMARY: ${passed} passed, ${failed} failed`);
    console.log('==================================================\n');

  } catch (err) {
    console.error('Test suite error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
    if (failed > 0) process.exit(1);
  }
}

runDbCodeSuite();

