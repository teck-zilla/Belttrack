/**
 * BeltTrack Verification Failure Simulation Suite
 * 
 * Demonstrates and validates three specific failure modes via PostgreSQL:
 * 1. Failure 1 (Expired Code): Code exists in PostgreSQL but verification_expires_at is in the past.
 * 2. Failure 2 (Wrong Code): Active code exists in PostgreSQL, but an incorrect code is submitted.
 * 3. Failure 3 (Replay / Code Used Twice): A valid code succeeds on 1st use, but a 2nd submission
 *    of the exact same code is rejected because the code has been consumed and email is verified.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// In-process verification engine mirror for isolated simulation
async function simulateVerificationAttempt(email, code) {
  const normalizedEmail = email.toLowerCase().trim();

  // Query database User record
  const dbUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      verificationCode: true,
      verificationExpiresAt: true,
      isEmailVerified: true
    }
  });

  if (!dbUser) {
    return {
      status: 404,
      body: { error: 'User not found in system' }
    };
  }

  // 1. Replay check: already verified or code already consumed
  if (dbUser.isEmailVerified) {
    return {
      status: 400,
      body: { error: 'This email is already verified. The verification code has already been consumed.' }
    };
  }

  if (!dbUser.verificationCode) {
    return {
      status: 400,
      body: { error: 'No active verification code found for this email. Please request a new code.' }
    };
  }

  // 2. Expired code check
  if (dbUser.verificationExpiresAt && new Date() > dbUser.verificationExpiresAt) {
    return {
      status: 400,
      body: { error: 'Verification code has expired. Please request a new code.' }
    };
  }

  // 3. Wrong code check
  if (dbUser.verificationCode !== code) {
    return {
      status: 400,
      body: { error: 'Incorrect verification code. Please check the code and try again.' }
    };
  }

  // 4. Success: consume one-time code and mark verified
  await prisma.user.update({
    where: { email: normalizedEmail },
    data: {
      isEmailVerified: true,
      verificationCode: null,
      verificationExpiresAt: null
    }
  });

  return {
    status: 200,
    body: { success: true, message: 'Email address verified successfully.' }
  };
}

async function runSimulation() {
  console.log('======================================================================');
  console.log('       BELTTRACK POSTGRESQL VERIFICATION FAILURE SIMULATION           ');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      if (details) console.log(`         -> ${details}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      if (details) console.error(`         -> ${details}`);
      failed++;
    }
  }

  const testEmail = `test.failure.sim.${Date.now()}@kaizenbjj.org`;

  try {
    // Check connection to PostgreSQL
    const school = await prisma.school.findFirst();
    if (!school) {
      console.error('No school found in database to link test user.');
      process.exit(1);
    }

    console.log(`Connected to PostgreSQL. Creating test user: ${testEmail}...\n`);
    await prisma.user.create({
      data: {
        schoolId: school.id,
        email: testEmail,
        role: 'STUDENT',
        status: 'PENDING_APPROVAL',
        isEmailVerified: false
      }
    });

    // -------------------------------------------------------------------------
    // FAILURE MODE 1: EXPIRED CODE
    // -------------------------------------------------------------------------
    console.log('----------------------------------------------------------------------');
    console.log(' [SIMULATION 1] Expired Verification Code');
    console.log('----------------------------------------------------------------------');
    const expiredCode = '111222';
    const pastExpiry = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes in past

    console.log(`  Staging in DB: verification_code='${expiredCode}', verification_expires_at='${pastExpiry.toISOString()}'`);
    await prisma.user.update({
      where: { email: testEmail },
      data: {
        verificationCode: expiredCode,
        verificationExpiresAt: pastExpiry,
        isEmailVerified: false
      }
    });

    console.log(`  Submitting verification request for expired code '${expiredCode}'...`);
    const res1 = await simulateVerificationAttempt(testEmail, expiredCode);
    console.log(`  Received Response: HTTP ${res1.status} -> ${JSON.stringify(res1.body)}`);

    assert(res1.status === 400, 'HTTP 400 Bad Request returned');
    assert(
      res1.body.error && res1.body.error.toLowerCase().includes('expired'),
      'Error message identifies code expiration',
      res1.body.error
    );

    // Verify DB state remained unverified
    const dbCheck1 = await prisma.user.findUnique({ where: { email: testEmail } });
    assert(dbCheck1.isEmailVerified === false, 'Database is_email_verified remains FALSE');

    // -------------------------------------------------------------------------
    // FAILURE MODE 2: WRONG CODE
    // -------------------------------------------------------------------------
    console.log('\n----------------------------------------------------------------------');
    console.log(' [SIMULATION 2] Wrong / Incorrect Verification Code');
    console.log('----------------------------------------------------------------------');
    const activeCode = '333444';
    const submittedWrongCode = '999999';
    const futureExpiry = new Date(Date.now() + 6 * 60 * 1000); // 6 minutes in future

    console.log(`  Staging in DB: verification_code='${activeCode}', verification_expires_at='${futureExpiry.toISOString()}'`);
    await prisma.user.update({
      where: { email: testEmail },
      data: {
        verificationCode: activeCode,
        verificationExpiresAt: futureExpiry,
        isEmailVerified: false
      }
    });

    console.log(`  Submitting verification request with wrong code '${submittedWrongCode}'...`);
    const res2 = await simulateVerificationAttempt(testEmail, submittedWrongCode);
    console.log(`  Received Response: HTTP ${res2.status} -> ${JSON.stringify(res2.body)}`);

    assert(res2.status === 400, 'HTTP 400 Bad Request returned');
    assert(
      res2.body.error && res2.body.error.toLowerCase().includes('incorrect'),
      'Error message identifies incorrect code',
      res2.body.error
    );

    // Verify DB state remained unverified
    const dbCheck2 = await prisma.user.findUnique({ where: { email: testEmail } });
    assert(dbCheck2.isEmailVerified === false, 'Database is_email_verified remains FALSE');
    assert(dbCheck2.verificationCode === activeCode, 'Active code retained in database for retry');

    // -------------------------------------------------------------------------
    // FAILURE MODE 3: SAME VALID CODE USED TWICE (REPLAY ATTACK)
    // -------------------------------------------------------------------------
    console.log('\n----------------------------------------------------------------------');
    console.log(' [SIMULATION 3] Same Valid Code Used Twice (Replay Attack)');
    console.log('----------------------------------------------------------------------');
    const validCode = '555666';
    console.log(`  Staging in DB: verification_code='${validCode}', verification_expires_at='${futureExpiry.toISOString()}'`);
    await prisma.user.update({
      where: { email: testEmail },
      data: {
        verificationCode: validCode,
        verificationExpiresAt: futureExpiry,
        isEmailVerified: false
      }
    });

    // 1st Attempt: Legitimate verification with correct code
    console.log(`\n  [Step 3A] First submission with valid code '${validCode}'...`);
    const res3A = await simulateVerificationAttempt(testEmail, validCode);
    console.log(`  Received Response: HTTP ${res3A.status} -> ${JSON.stringify(res3A.body)}`);

    assert(res3A.status === 200, '1st submission succeeds with HTTP 200 OK');
    assert(res3A.body.success === true, '1st submission confirms verification success');

    const dbCheck3A = await prisma.user.findUnique({ where: { email: testEmail } });
    assert(dbCheck3A.isEmailVerified === true, 'Database is_email_verified is now TRUE');
    assert(dbCheck3A.verificationCode === null, 'Database verification_code was consumed (nullified)');
    assert(dbCheck3A.verificationExpiresAt === null, 'Database verification_expires_at was nullified');

    // 2nd Attempt: Replay attempt with the EXACT SAME code
    console.log(`\n  [Step 3B] Second submission (replay) with exact same code '${validCode}'...`);
    const res3B = await simulateVerificationAttempt(testEmail, validCode);
    console.log(`  Received Response: HTTP ${res3B.status} -> ${JSON.stringify(res3B.body)}`);

    assert(res3B.status === 400, '2nd submission fails with HTTP 400 Bad Request');
    assert(
      res3B.body.error && (res3B.body.error.toLowerCase().includes('already') || res3B.body.error.toLowerCase().includes('consumed')),
      'Error message identifies code already consumed / already verified',
      res3B.body.error
    );

    // Clean up test user
    console.log('\nCleaning up simulation test user from database...');
    await prisma.user.delete({ where: { email: testEmail } });
    console.log('Cleanup complete.');

    console.log('\n======================================================================');
    console.log(` SIMULATION SUMMARY: ${passed} assertions passed, ${failed} failed`);
    console.log('======================================================================\n');

  } catch (err) {
    console.error('\nDatabase Connection Error during simulation:', err.message || err);
    console.log('\nNOTE: Connecting to PostgreSQL pooler requires network access (BypassSandbox or direct terminal).');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    if (failed > 0) process.exit(1);
  }
}

runSimulation();

