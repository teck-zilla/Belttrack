import assert from 'node:assert/strict';
import test from 'node:test';

import {
  attendanceCheckInSchema,
  emailSchema,
  joinCodeManagementSchema,
  ledgerEntrySchema,
  passwordCreationSchema,
  schoolRegistrationSchema,
  studentJoinCodeSchema,
  techniqueSignoffSchema
} from '../src/lib/validation/schemas.ts';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const PROFILE_ID = '22222222-2222-4222-8222-222222222222';
const TECHNIQUE_ID = '33333333-3333-4333-8333-333333333333';
const CLASS_ID = '44444444-4444-4444-8444-444444444444';
const IDEMPOTENCY_KEY = '55555555-5555-4555-8555-555555555555';
const PASSWORD = 'CorrectHorseBatteryStaple1!';

test('email schema normalizes whitespace and casing', () => {
  assert.equal(emailSchema.parse('  Coach@Example.COM '), 'coach@example.com');
  assert.equal(emailSchema.safeParse('not-an-email').success, false);
});

test('password schema enforces the 15 character minimum', () => {
  assert.equal(passwordCreationSchema.safeParse('short').success, false);
  assert.equal(passwordCreationSchema.safeParse(PASSWORD).success, true);
});

test('school registration rejects confirmation mismatches', () => {
  const base = {
    schoolName: 'River Dojo',
    discipline: 'judo',
    ownerFullName: 'Alex Rivera',
    ownerEmail: 'Owner@Example.com',
    password: PASSWORD,
    confirmPassword: PASSWORD,
    city: 'Austin',
    country: 'US'
  };

  assert.equal(schoolRegistrationSchema.safeParse(base).success, true);
  assert.equal(
    schoolRegistrationSchema.safeParse({ ...base, confirmPassword: `${PASSWORD}!` }).success,
    false
  );
});

test('student join schema enforces minor guardian and DOB consistency', () => {
  const base = {
    registrationCode: 'KAIZEN-BJJ-2026',
    studentFullName: 'Jamie Rivera',
    studentEmail: 'jamie@example.com',
    password: PASSWORD,
    confirmPassword: PASSWORD,
    dateOfBirth: '1995-05-15',
    isMinor: false
  };

  assert.equal(studentJoinCodeSchema.safeParse(base).success, true);
  assert.equal(
    studentJoinCodeSchema.safeParse({ ...base, isMinor: true }).success,
    false
  );
  assert.equal(
    studentJoinCodeSchema.safeParse({
      ...base,
      dateOfBirth: '2015-05-15',
      isMinor: true
    }).success,
    false
  );
});

test('technique signoff requires a valid technique UUID', () => {
  assert.equal(
    techniqueSignoffSchema.safeParse({ techniqueId: TECHNIQUE_ID, status: 'VERIFIED' }).success,
    true
  );
  assert.equal(
    techniqueSignoffSchema.safeParse({ techniqueId: 'not-a-uuid' }).success,
    false
  );
});

test('attendance check-in requires a valid idempotency key', () => {
  assert.equal(
    attendanceCheckInSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      profileId: PROFILE_ID,
      classId: CLASS_ID
    }).success,
    true
  );
  assert.equal(
    attendanceCheckInSchema.safeParse({ idempotencyKey: 'duplicate-check-in' }).success,
    false
  );
});

test('attendance check-in ignores client-supplied timestamps', () => {
  const parsed = attendanceCheckInSchema.parse({
    idempotencyKey: IDEMPOTENCY_KEY,
    profileId: PROFILE_ID,
    attendedAt: '2020-01-01T00:00:00.000Z'
  });

  assert.equal('attendedAt' in parsed, false);
  assert.deepEqual(parsed, { idempotencyKey: IDEMPOTENCY_KEY, profileId: PROFILE_ID });
});

test('ledger reversals require a correctly formatted receipt slug', () => {
  assert.equal(
    ledgerEntrySchema.safeParse({
      amountCents: 5000,
      transactionType: 'TUITION'
    }).success,
    true
  );

  const reversal = {
    memberUserId: USER_ID,
    amountCents: 5000,
    transactionType: 'CORRECTION_REVERSAL'
  };

  assert.equal(ledgerEntrySchema.safeParse(reversal).success, false);
  assert.equal(
    ledgerEntrySchema.safeParse({
      ...reversal,
      reversalRefSlug: 'REC-2026-BJJ-1'
    }).success,
    true
  );
  assert.equal(
    ledgerEntrySchema.safeParse({
      ...reversal,
      reversalRefSlug: 'BAD-2026-BJJ-1'
    }).success,
    false
  );
});

test('join code management validates rotate and revoke actions', () => {
  const rotate = joinCodeManagementSchema.safeParse({
    action: 'ROTATE',
    customCode: 'ZEN-BJJ-2026'
  });
  const revoke = joinCodeManagementSchema.safeParse({ action: 'REVOKE' });
  const invalidRevoke = joinCodeManagementSchema.safeParse({
    action: 'REVOKE',
    customCode: 'ZEN-BJJ-2026'
  });
  const invalidCode = joinCodeManagementSchema.safeParse({
    action: 'ROTATE',
    customCode: 'bad code'
  });

  assert.equal(rotate.success, true);
  assert.equal(revoke.success, true);
  assert.equal(invalidRevoke.success, false);
  assert.equal(invalidCode.success, false);
});
