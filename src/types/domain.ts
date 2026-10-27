/**
 * BeltTrack Martial Arts Management - Domain Data Models
 * 
 * Strict Multi-Tenant Schema Definitions:
 * Every private record is explicitly scoped by `school_id`.
 * Cross-tenant queries are blocked by Row-Level Security (RLS).
 */

export type UserRole = 'owner' | 'coach' | 'student' | 'guardian';

export type DisciplineType = 
  | 'brazilian_jiu_jitsu'
  | 'judo'
  | 'karate'
  | 'taekwondo'
  | 'muay_thai'
  | 'krav_maga';

export type MembershipStatus = 'pending_approval' | 'active' | 'inactive' | 'suspended';

export type TechniqueSignoffStatus = 'not_started' | 'in_progress' | 'verified' | 'pending';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'manual_card' | 'other';

export type LedgerCategory = 
  | 'tuition' 
  | 'testing_fee' 
  | 'uniform_equipment' 
  | 'correction_reversal' 
  | 'gear' 
  | 'seminar';

export type LedgerStatus = 'settled' | 'pending' | 'refunded';

export type NotificationType = 
  | 'milestone_stripe'
  | 'milestone_promotion'
  | 'inactive_dropoff_alert'
  | 'technique_signoff_pending'
  | 'technique_verified'
  | 'attendance_milestone';

/**
 * 1. TENANT ENTITY (DOJO / SCHOOL)
 * Public directory only exposes id, name, slug, city, discipline, is_public.
 * All rosters, ranks, ledgers, and attendance are strictly private.
 */
export interface School {
  id: string;
  name: string;
  slug: string;
  registration_code: string; // Unique school access code (e.g., "KAIZEN-BJJ-2026")
  join_code?: string; // Canonical join code alias matching schema.prisma
  discipline: DisciplineType;
  city: string;
  country: string;
  timezone?: string; // Tenant timezone (default "UTC")
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 2. TENANT MEMBERSHIP & ROLES
 * Links auth.users to a specific school tenant with a specific role and status.
 */
export interface SchoolMember {
  id: string;
  school_id: string; // Tenant FK
  user_id: string;
  role: UserRole;
  status: MembershipStatus; // PENDING_APPROVAL blocks roster reads until sign-off
  full_name: string;
  email: string;
  phone?: string;
  guardian_name?: string; // For minor students
  guardian_email?: string;
  guardian_links?: string[]; // IDs of linked guardian accounts
  current_rank_id?: string;
  stripes_count: number;
  total_classes_attended: number;
  last_attended_at?: string;
  is_flagged_inactive: boolean; // Flagged if absent for 10-14 consecutive days
  enrolled_at: string;
}

/**
 * 3. RANKING TRACK & BELT CRITERIA
 */
export interface RankingTrack {
  id: string;
  school_id: string; // Tenant FK
  discipline: DisciplineType;
  name: string; // e.g. "Adult BJJ Gi", "Kids Judo"
  description?: string;
}

export interface Rank {
  id: string;
  school_id: string; // Tenant FK
  track_id: string;
  belt_name: string; // e.g. "White", "Blue", "Purple", "Brown", "Black"
  belt_color_hex: string;
  bar_color_hex?: string;
  order: number; // Progression index (1 = White, 2 = Blue, etc.)
  min_classes_required: number;
  min_days_in_rank: number;
  max_stripes: number;
}

/**
 * 4. CURRICULUM TECHNIQUES & COACH SIGNOFFS
 */
export interface Technique {
  id: string;
  school_id: string; // Tenant FK
  rank_id: string;
  name: string; // e.g., "Scissor Sweep", "Armbar from Guard", "Osoto Gari"
  category: 'guard' | 'pass' | 'takedown' | 'submission' | 'escape';
  description?: string;
  is_mandatory_for_grading: boolean;
}

export interface TechniqueSignoff {
  id: string;
  school_id: string; // Tenant FK
  student_id: string;
  technique_id: string;
  status: TechniqueSignoffStatus;
  coach_id?: string; // Nullable if pending student request
  coach_feedback?: string;
  signed_off_at?: string;
  requested_at: string;
}

/**
 * 5. ATTENDANCE & ROLL-CALL
 */
export interface AttendanceRecord {
  id: string;
  idempotency_key?: string; // Unique idempotency key to prevent double check-ins on live class mats
  school_id: string; // Tenant FK
  student_id: string;
  class_name: string; // e.g., "Fundamentals BJJ 18:00"
  check_in_timestamp: string;
  coach_id: string; // Verified by roll-call coach
  is_sparring_logged: boolean;
}

/**
 * 6. INTERNAL LEDGER & MANUAL SETTLEMENT (ZERO-MONETIZATION)
 * Administrative accounting records for cash/transfer/card receipts.
 * Ledger entries are immutable and append-only; corrections require reversalRefSlug.
 */
export interface InternalLedgerEntry {
  id: string;
  school_id: string; // Tenant FK
  student_id: string;
  amount_cents: number;
  currency: string; // e.g. "USD", "EUR", "GBP"
  category: LedgerCategory;
  payment_method: PaymentMethod;
  status: LedgerStatus;
  notes?: string;
  receipt_slug: string; // System-generated receipt slug: REC-[YEAR]-[DISCIPLINE]-[INCREMENT] (e.g. "REC-2026-BJJ-084")
  reversal_ref_slug?: string; // Offsetting reversal reference for immutable audit trail
  logged_by_user_id: string;
  settled_at: string;
}

/**
 * 7. INACTIVITY DROPOFF ALERT RECORD
 * Auto-flagged when student absence reaches 10 or more days.
 */
export interface InactivityAlertRecord {
  id: string;
  school_id: string; // Tenant FK
  student_id: string;
  days_inactive: number;
  is_resolved: boolean;
  created_at: string;
}

/**
 * 8. IN-APP NOTIFICATION HUB
 */
export interface InAppNotification {
  id: string;
  school_id: string; // Tenant FK
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

