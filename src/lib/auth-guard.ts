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
      status: dbUser.status
    }
  };
}

/**
 * Requires an authenticated, ACTIVE OWNER or COACH bound to a tenant.
 */
export async function requireActiveStaff(): Promise<GuardResult> {
  const session = await resolveSessionUser();
  if (!session.ok) return session;

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

  if (session.user.status !== 'ACTIVE') {
    return {
      ok: false,
      status: 403,
      error: 'This account is not active. Pending approval accounts cannot access this resource.'
    };
  }

  return session;
}
