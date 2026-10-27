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
  'suspended'
]);

/**
 * 1. DOJO OWNER REGISTRATION SCHEMA
 */
export const schoolRegistrationSchema = z.object({
  schoolName: z
    .string()
    .min(3, 'School name must be at least 3 characters')
    .max(80, 'School name must be under 80 characters'),
  discipline: disciplineEnum,
  ownerFullName: z
    .string()
    .min(2, 'Owner full name is required')
    .max(60, 'Owner full name must be under 60 characters'),
  ownerEmail: z
    .string()
    .email('Please enter a valid email address'),
  city: z
    .string()
    .min(2, 'City is required')
    .max(50, 'City must be under 50 characters'),
  country: z
    .string()
    .min(2, 'Country is required')
    .max(50, 'Country must be under 50 characters'),
  timezone: z
    .string()
    .default('UTC')
    .optional(),
  customCode: z
    .string()
    .min(4, 'Registration code must be at least 4 characters')
    .max(16, 'Registration code must be 16 characters or less')
    .regex(/^[A-Z0-9_-]+$/, 'Code must contain only uppercase alphanumeric characters, dashes, or underscores')
    .optional(),
  isPublicInDirectory: z
    .boolean()
    .default(true)
});

export type SchoolRegistrationInput = z.infer<typeof schoolRegistrationSchema>;

/**
 * 2. STUDENT / GUARDIAN JOIN CODE SCHEMA
 */
export const studentJoinCodeSchema = z.object({
  registrationCode: z
    .string()
    .min(4, 'Registration code must be at least 4 characters')
    .max(16, 'Registration code must be 16 characters or less')
    .regex(/^[A-Z0-9_-]+$/i, 'Registration code is alphanumeric'),
  studentFullName: z
    .string()
    .min(2, 'Student full name is required')
    .max(60, 'Student name must be under 60 characters'),
  studentEmail: z
    .string()
    .email('Please enter a valid email address'),
  isMinor: z
    .boolean()
    .default(false),
  guardianFullName: z
    .string()
    .max(60)
    .optional(),
  guardianEmail: z
    .string()
    .email('Please enter a valid guardian email address')
    .optional()
}).refine(data => {
  if (data.isMinor && !data.guardianFullName) {
    return false;
  }
  return true;
}, {
  message: 'Guardian full name is required for minor students',
  path: ['guardianFullName']
});

export type StudentJoinCodeInput = z.infer<typeof studentJoinCodeSchema>;

/**
 * 3. TECHNIQUE SIGNOFF SCHEMA
 */
export const techniqueSignoffSchema = z.object({
  schoolId: z.string().uuid('Valid tenant school ID required'),
  studentId: z.string().uuid('Valid student ID required'),
  techniqueId: z.string().uuid('Valid technique ID required'),
  coachNotes: z.string().max(500, 'Notes must be under 500 characters').optional()
});

/**
 * 4. ROLL-CALL ATTENDANCE SCHEMA
 */
export const attendanceCheckInSchema = z.object({
  schoolId: z.string().uuid('Valid tenant school ID required'),
  studentId: z.string().uuid('Valid student ID required'),
  className: z.string().min(2, 'Class identifier required'),
  idempotencyKey: z.string().optional(),
  isSparringLogged: z.boolean().default(false)
});

/**
 * 5. INTERNAL LEDGER ENTRY SCHEMA (ZERO-MONETIZATION BOOKKEEPING)
 */
export const ledgerEntrySchema = z.object({
  schoolId: z.string().uuid('Valid tenant school ID required'),
  studentId: z.string().uuid('Valid student ID required'),
  amountCents: z.number().int().positive('Amount must be positive'),
  currency: z.string().length(3, '3-letter currency code required').default('USD'),
  category: z.enum([
    'tuition', 
    'testing_fee', 
    'uniform_equipment', 
    'correction_reversal', 
    'gear', 
    'seminar'
  ]),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'manual_card', 'other']),
  receiptSlug: z.string().regex(/^REC-\d{4}-[A-Z0-9]+-\d+$/, 'Receipt slug must match REC-[YEAR]-[DISCIPLINE]-[INCREMENT]').optional(),
  reversalRefSlug: z.string().regex(/^REC-\d{4}-[A-Z0-9]+-\d+$/, 'Reversal reference slug must match receipt format').optional(),
  notes: z.string().max(250).optional()
});
