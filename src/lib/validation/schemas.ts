/**
 * BeltTrack Martial Arts Management - Zod Validation Schemas
 * 
 * Strict runtime validation for domain entities, tenant boundary inputs,
 * and role-based registration parameters.
 */

import { z } from 'zod';

export const disciplineEnum = z.enum([
  'brazilian_jiu_jitsu',
  'judo',
  'karate',
  'taekwondo',
  'muay_thai',
  'krav_maga'
]);

export const userRoleEnum = z.enum([
  'owner',
  'coach',
  'student',
  'guardian'
]);

export const membershipStatusEnum = z.enum([
  'pending_approval',
  'active',
  'inactive',
  'suspended',
  'deletion_pending'
]);

/**
 * Normalized Email Schemas
 * Automatically trims whitespace, converts to lowercase, and enforces valid email format.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('enter a valid email address');

export const optionalEmailSchema = z
  .union([
    z.string().trim().toLowerCase().email('enter a valid email address'),
    z.literal('').transform(() => undefined)
  ])
  .optional();

/**
 * Secure Password Creation Schema
 * Requires 15 to 128 characters. Explicitly permits letters, digits, symbols, spaces, and passphrases.
 */
export const passwordCreationSchema = z
  .string()
  .min(15, 'Password must be at least 15 characters')
  .max(128, 'Password must not exceed 128 characters');

/**
 * 1. DOJO OWNER REGISTRATION SCHEMA
 */
export const schoolRegistrationSchema = z.object({
  schoolName: z
    .string()
    .min(4, 'School name must be above 3 characters')
    .max(80, 'School name must be under 80 characters'),
  discipline: disciplineEnum,
  ownerFullName: z
    .string()
    .min(3, 'Owner full name must be at least 3 characters')
    .max(60, 'Owner full name must be under 60 characters')
    .refine((val) => val.trim().split(/\s+/).filter(Boolean).length >= 2, {
      message: 'Owner name must have at least 2 words or names'
    }),
  ownerEmail: emailSchema,
  password: passwordCreationSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  city: z
    .string()
    .min(2, 'City is required')
    .max(50, 'City must be under 50 characters'),
  country: z
    .string()
    .min(2, 'Country length should not fall below 2 characters')
    .max(50, 'Country must be under 50 characters'),
  timezone: z
    .string()
    .default('UTC')
    .optional(),
  customCode: z
    .string()
    .regex(/^[A-Za-z]{1,6}-[A-Za-z]{1,4}-[0-9]{1,4}$/, 'wrong details')
    .optional(),
  isPublicInDirectory: z
    .boolean()
    .default(true)
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export type SchoolRegistrationInput = z.infer<typeof schoolRegistrationSchema>;

/**
 * 2. STUDENT / GUARDIAN JOIN CODE SCHEMA
 */
export const dateOfBirthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter date of birth as YYYY-MM-DD')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, { message: 'Enter a valid date of birth' })
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return date <= new Date();
  }, { message: 'Date of birth cannot be in the future' })
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    const oldest = new Date();
    oldest.setFullYear(oldest.getFullYear() - 120);
    return date >= oldest;
  }, { message: 'Date of birth is too far in the past' });

export const studentJoinCodeSchema = z.object({
  registrationCode: z
    .string()
    .regex(/^[A-Za-z]{1,6}-[A-Za-z]{1,4}-[0-9]{1,4}$/, 'wrong details'),
  studentFullName: z
    .string()
    .min(3, 'Student full name must be at least 3 characters')
    .max(60, 'Student name must be under 60 characters')
    .refine((val) => val.trim().split(/\s+/).filter(Boolean).length >= 2, {
      message: 'Student name must have at least 2 words or names'
    }),
  studentEmail: emailSchema,
  password: passwordCreationSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  dateOfBirth: dateOfBirthSchema,
  isMinor: z
    .boolean()
    .default(false),
  guardianFullName: z
    .string()
    .max(60)
    .optional()
    .refine((val) => !val || (val.trim().length >= 3 && val.trim().split(/\s+/).filter(Boolean).length >= 2), {
      message: 'Guardian name must be at least 3 characters and have at least 2 words or names'
    }),
  guardianEmail: optionalEmailSchema
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
}).refine(data => {
  if (data.isMinor && !data.guardianFullName) {
    return false;
  }
  return true;
}, {
  message: 'Guardian full name is required for minor students',
  path: ['guardianFullName']
}).refine((data) => {
  const dob = new Date(`${data.dateOfBirth}T00:00:00.000Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return data.isMinor === (age < 18);
}, {
  message: 'Minor status does not match date of birth',
  path: ['isMinor']
});

export type StudentJoinCodeInput = z.infer<typeof studentJoinCodeSchema>;

/**
 * 3. TECHNIQUE SIGNOFF SCHEMA
 */
export const techniqueSignoffSchema = z.object({
  profileId: z.string().uuid('Valid student profile ID required').optional(),
  techniqueId: z.string().uuid('Valid technique ID required'),
  status: z.enum(['VERIFIED', 'IN_PROGRESS', 'NOT_STARTED']).default('VERIFIED')
});

/**
 * 4. ROLL-CALL ATTENDANCE SCHEMA
 */
export const attendanceCheckInSchema = z.object({
  idempotencyKey: z.string().uuid('A valid idempotency key is required'),
  profileId: z.string().uuid('Valid student profile ID required').optional(),
  classId: z.string().uuid('Valid class ID required').optional(),
  attendedAt: z.string().datetime().optional()
});

/**
 * 5. INTERNAL LEDGER ENTRY SCHEMA (ZERO-MONETIZATION BOOKKEEPING)
 */
export const ledgerEntrySchema = z.object({
  memberUserId: z.string().uuid('Valid member user ID required').optional(),
  amountCents: z.number().int().positive('Amount must be positive'),
  currency: z.string().length(3, '3-letter currency code required').default('USD'),
  transactionType: z.enum([
    'TUITION',
    'TESTING_FEE',
    'UNIFORM_EQUIPMENT',
    'CORRECTION_REVERSAL'
  ]),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'MANUAL_CARD']).default('CASH'),
  reversalRefSlug: z.string().regex(/^REC-\d{4}-[A-Z0-9]+-\d+$/, 'Reversal reference slug must match receipt format').optional(),
  note: z.string().max(250).optional()
}).refine((data) => data.transactionType !== 'CORRECTION_REVERSAL' || Boolean(data.reversalRefSlug), {
  message: 'A reversal must reference the original receipt.',
  path: ['reversalRefSlug']
});

/**
 * 6. LOGIN AUTHENTICATION SCHEMA
 */
export const loginSchema = z.object({
  email: optionalEmailSchema,
  schoolCode: z.string().regex(/^[A-Za-z]{1,6}-[A-Za-z]{1,4}-[0-9]{1,4}$/, 'wrong details').optional(),
  password: z.string().min(1, 'Password is required').max(128, 'Password must not exceed 128 characters')
}).refine(data => Boolean(data.email || data.schoolCode), {
  message: 'Either email or school code is required',
  path: ['email']
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * 7. ACCOUNT / SCHOOL DELETION WORKFLOW
 */
export const deletionRequestSchema = z.object({
  reason: z.string().trim().max(500, 'Reason must be under 500 characters').optional()
});

export const deletionDecisionSchema = z.object({
  requestId: z.string().uuid('Valid deletion request ID required'),
  action: z.enum(['APPROVE', 'REJECT']),
  decisionNote: z.string().trim().max(500, 'Decision note must be under 500 characters').optional()
});

export const staffUserDeletionSchema = z.object({
  targetUserId: z.string().uuid('Valid member user ID required'),
  reason: z.string().trim().max(500, 'Reason must be under 500 characters').optional()
});

export const schoolDeletionRequestSchema = deletionRequestSchema;
