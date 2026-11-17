/**
 * BeltTrack Martial Arts Management - Server-Side Route Guards
 *
 * Centralizes session resolution and membership authorization so every private
 * route can enforce tenant isolation on the server. Guards fail closed:
 * - Missing/invalid session -> HTTP 401
 * - Managed auth unavailable -> HTTP 503
 * - PENDING_APPROVAL / suspended / inactive accounts -> HTTP 403
 *
 * The tenant school_id is ALWAYS derived from the database user, never from a
 * request body or query parameter.
 */

import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import type { MembershipStatus, Role } from '@prisma/client';

export interface ActiveSessionUser {
  authUserId: string;
  userId: string;
  email: string;
  schoolId: string;
  role: Role;
  status: MembershipStatus;
  deletionScheduledFor: Date | null;
  schoolDeletionScheduledFor: Date | null;
  schoolDeletedAt: Date | null;
}

export type GuardResult =
  | { ok: true; user: ActiveSessionUser }
  | { ok: false; status: number; error: string };

async function resolveSessionUser(): Promise<GuardResult> {
  let authUserId: string;
  let authEmail: string | null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return { ok: false, status: 401, error: 'Authentication required.' };
    }

    authUserId = data.user.id;
    authEmail = data.user.email ?? null;
  } catch {
    return { ok: false, status: 503, error: 'Authentication service unavailable. Please try again later.' };
  }

  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { supabaseUid: authUserId },
        ...(authEmail ? [{ email: authEmail.toLowerCase().trim() }] : [])
      ]
    },
    include: {
      school: {
        select: {
          deletionScheduledFor: true,
          deletedAt: true
        }
      }
    }
  });

  if (!dbUser) {
    return {
      ok: false,
      status: 403,
      error: 'No tenant membership is associated with this account.'
    };
  }

  return {
    ok: true,
    user: {
      authUserId,
      userId: dbUser.id,
      email: dbUser.email,
      schoolId: dbUser.schoolId,
      role: dbUser.role,
      status: dbUser.status,
      deletionScheduledFor: dbUser.deletionScheduledFor,
      schoolDeletionScheduledFor: dbUser.school?.deletionScheduledFor ?? null,
      schoolDeletedAt: dbUser.school?.deletedAt ?? null
    }
  };
}

function getDeletionBlock(session: { user: ActiveSessionUser }): GuardResult | null {
  if (session.user.status === 'DELETION_PENDING') {
    return {
      ok: false,
      status: 403,
      error:
        'This account is scheduled for deletion. Private records are locked during the 14-day grace period. Request cancellation from your account page.'
    };
  }

  if (session.user.schoolDeletedAt) {
    return {
      ok: false,
      status: 403,
      error: 'This school account has been deleted.'
    };
  }

  if (session.user.schoolDeletionScheduledFor) {
    return {
      ok: false,
      status: 403,
      error:
        'This school is scheduled for deletion. Tenant records are locked during the 14-day grace period.'
    };
  }

  return null;
}

/**
 * Requires a valid managed-auth session and tenant membership, but does not
 * require ACTIVE status. Only use for deletion-request cancellation/status
 * routes where a locked account must still be able to view or cancel its own
 * pending deletion.
 */
export async function requireSessionUser(): Promise<GuardResult> {
  return resolveSessionUser();
}

/**
 * Requires an authenticated, ACTIVE OWNER or COACH bound to a tenant.
 */
export async function requireActiveStaff(): Promise<GuardResult> {
  const session = await resolveSessionUser();
  if (!session.ok) return session;

  const deletionBlock = getDeletionBlock(session);
  if (deletionBlock) return deletionBlock;

  if (session.user.status !== 'ACTIVE') {
    return {
      ok: false,
      status: 403,
      error: 'This account is not active. Pending approval or suspended accounts cannot access this resource.'
    };
  }

  if (session.user.role !== 'OWNER' && session.user.role !== 'COACH') {
    return {
      ok: false,
      status: 403,
      error: 'Only school owners or coaches may perform this action.'
    };
  }

  return session;
}

/**
 * Requires an authenticated, ACTIVE member of any role bound to a tenant.
 * Use for rosters, technique curriculum, and the dashboard.
 */
export async function requireActiveMember(): Promise<GuardResult> {
  const session = await resolveSessionUser();
  if (!session.ok) return session;

  const deletionBlock = getDeletionBlock(session);
  if (deletionBlock) return deletionBlock;

  if (session.user.status !== 'ACTIVE') {
    return {
      ok: false,
      status: 403,
      error: 'This account is not active. Pending approval accounts cannot access this resource.'
    };
  }

  return session;
}
