/**
 * BeltTrack Martial Arts Management - Tenant Isolation Context
 * 
 * Strict Multi-Tenant Enforcement:
 * Maintains active school tenant state and guarantees that all child
 * queries and mutations are isolated to the active school_id.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { School, SchoolMember } from '@/types/domain';
import { assertTenantMatch } from '@/lib/prisma-extension';

interface ApprovalApiGuardianLink {
  id: string;
  guardianId: string;
  isApproved: boolean;
}

interface ApprovalApiMember {
  id: string;
  userId: string;
  schoolId: string;
  email: string;
  role: SchoolMember['role'];
  status: SchoolMember['status'];
  fullName: string;
  guardianName?: string;
  guardianLinks?: ApprovalApiGuardianLink[];
  enrolledAt: string;
}

interface TenantContextType {
  activeSchool: School | null;
  isIsolated: boolean;
  setActiveSchool: (school: School | null) => void;
  clearTenant: () => void;
  pendingMembers: SchoolMember[];
  approvedMembers: SchoolMember[];
  approvalError: string | null;
  refreshApprovals: () => Promise<void>;
  clearApprovalError: () => void;
  approveMember: (memberId: string) => Promise<void>;
  rejectMember: (memberId: string) => Promise<void>;
}

export const DEFAULT_DEMO_SCHOOL: School = {
  id: 'd9b2e041-381a-4e2b-bb8c-2f9a1c1d09e1',
  name: 'Kaizen BJJ & Martial Academy',
  slug: 'kaizen-bjj',
  registration_code: 'KAIZEN-2026',
  discipline: 'brazilian_jiu_jitsu',
  city: 'London',
  country: 'United Kingdom',
  timezone: 'Europe/London',
  is_public: true,
  created_at: '2026-01-10T09:00:00Z',
  updated_at: '2026-10-24T12:00:00Z'
};

const INITIAL_PENDING_MEMBERS: SchoolMember[] = [
  {
    id: 'stud-pend-001',
    school_id: DEFAULT_DEMO_SCHOOL.id,
    user_id: 'usr_pend_001',
    role: 'student',
    status: 'pending_approval',
    full_name: 'Gabriel Santos',
    email: 'gabriel.santos@bjjmail.org',
    stripes_count: 0,
    total_classes_attended: 0,
    is_flagged_inactive: false,
    enrolled_at: '2026-11-06T14:30:00Z'
  },
  {
    id: 'stud-pend-002',
    school_id: DEFAULT_DEMO_SCHOOL.id,
    user_id: 'usr_pend_002',
    role: 'student',
    status: 'pending_approval',
    full_name: 'Maya Lin',
    email: 'maya.lin@martialarts.net',
    guardian_name: 'David Lin',
    guardian_email: 'david.lin@parentmail.com',
    guardian_links: ['guard-link-pend-002'],
    stripes_count: 0,
    total_classes_attended: 0,
    is_flagged_inactive: false,
    enrolled_at: '2026-11-07T08:15:00Z'
  }
];

const INITIAL_APPROVED_MEMBERS: SchoolMember[] = [
  {
    id: 'stud-app-001',
    school_id: DEFAULT_DEMO_SCHOOL.id,
    user_id: 'usr_app_001',
    role: 'student',
    status: 'active',
    full_name: 'Lucas Silva',
    email: 'lucas.silva@bjjdemo.com',
    stripes_count: 3,
    total_classes_attended: 42,
    is_flagged_inactive: false,
    enrolled_at: '2025-08-14T09:00:00Z'
  },
  {
    id: 'stud-app-002',
    school_id: DEFAULT_DEMO_SCHOOL.id,
    user_id: 'usr_app_002',
    role: 'student',
    status: 'active',
    full_name: 'Elena Rostova',
    email: 'elena.rostova@judo-intl.org',
    stripes_count: 2,
    total_classes_attended: 28,
    is_flagged_inactive: true,
    enrolled_at: '2025-11-02T10:30:00Z'
  }
];

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [activeSchool, setActiveSchoolState] = useState<School | null>(DEFAULT_DEMO_SCHOOL);
  const [pendingMembers, setPendingMembers] = useState<SchoolMember[]>(INITIAL_PENDING_MEMBERS);
  const [approvedMembers, setApprovedMembers] = useState<SchoolMember[]>(INITIAL_APPROVED_MEMBERS);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const setActiveSchool = useCallback((school: School | null) => {
    setActiveSchoolState(school);
  }, []);

  const clearTenant = () => {
    setActiveSchoolState(null);
  };

  const refreshApprovals = useCallback(async () => {
    const schoolId = activeSchool?.id;
    if (!schoolId || schoolId === DEFAULT_DEMO_SCHOOL.id) return;

    try {
      const res = await fetch('/api/schools/approvals', { cache: 'no-store' });
      if (!res.ok) {
        setPendingMembers([]);
        setApprovedMembers([]);
        setApprovalError('Unable to load approvals. Sign in again or retry.');
        return;
      }

      const data = (await res.json()) as { pendingMembers?: ApprovalApiMember[] };
      if (!Array.isArray(data.pendingMembers)) {
        setPendingMembers([]);
        setApprovedMembers([]);
        setApprovalError('Approval response was invalid. Please retry.');
        return;
      }

      const members: SchoolMember[] = data.pendingMembers
        .filter((member) => member.schoolId === schoolId)
        .map((member) => ({
          id: member.id,
          school_id: member.schoolId,
          user_id: member.userId,
          role: member.role,
          status: member.status,
          full_name: member.fullName,
          email: member.email,
          guardian_name: member.guardianName,
          guardian_links: member.guardianLinks
            ?.filter((link) => !link.isApproved)
            .map((link) => link.id),
          stripes_count: 0,
          total_classes_attended: 0,
          is_flagged_inactive: false,
          enrolled_at: member.enrolledAt
        }));

      setPendingMembers(members);
      setApprovedMembers((prev) => prev.filter((member) => member.school_id === schoolId));
      setApprovalError(null);
    } catch {
      setPendingMembers([]);
      setApprovedMembers([]);
      setApprovalError('Unable to reach the approval service. Please retry.');
    }
  }, [activeSchool?.id]);

  useEffect(() => {
    void refreshApprovals();
  }, [refreshApprovals]);

  const scopedPendingMembers = pendingMembers.filter((member) => member.school_id === activeSchool?.id);
  const scopedApprovedMembers = approvedMembers.filter((member) => member.school_id === activeSchool?.id);

  const clearApprovalError = useCallback(() => setApprovalError(null), []);

  const approveMember = async (memberId: string) => {
    const target = scopedPendingMembers.find((m) => m.id === memberId);
    if (!target || !activeSchool?.id) return;
    assertTenantMatch(target.school_id, activeSchool.id);

    const activated: SchoolMember = {
      ...target,
      status: 'active'
    };

    if (target.school_id === DEFAULT_DEMO_SCHOOL.id) {
      setPendingMembers((prev) => prev.filter((m) => m.id !== memberId));
      setApprovedMembers((prev) => [activated, ...prev]);
      return;
    }

    try {
      const res = await fetch('/api/schools/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: target.school_id,
          userId: target.user_id,
          action: 'APPROVE'
        })
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setApprovalError(data.error || 'Unable to approve this member. Please retry.');
        return;
      }

      setPendingMembers((prev) => prev.filter((m) => m.id !== memberId));
      setApprovedMembers((prev) => [activated, ...prev]);
      setApprovalError(null);
      await refreshApprovals();
    } catch {
      setApprovalError('Network error approving this member. Please retry.');
    }
  };

  const rejectMember = async (memberId: string) => {
    const target = scopedPendingMembers.find((m) => m.id === memberId);
    if (!target || !activeSchool?.id) return;
    assertTenantMatch(target.school_id, activeSchool.id);

    if (target.school_id === DEFAULT_DEMO_SCHOOL.id) {
      setPendingMembers((prev) => prev.filter((m) => m.id !== memberId));
      return;
    }

    try {
      const res = await fetch('/api/schools/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: target.school_id,
          userId: target.user_id,
          action: 'REJECT'
        })
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setApprovalError(data.error || 'Unable to decline this member. Please retry.');
        return;
      }

      setPendingMembers((prev) => prev.filter((m) => m.id !== memberId));
      setApprovalError(null);
      await refreshApprovals();
    } catch {
      setApprovalError('Network error declining this member. Please retry.');
    }
  };

  return (
    <TenantContext.Provider
      value={{
        activeSchool,
        isIsolated: Boolean(activeSchool?.id),
        setActiveSchool,
        clearTenant,
        pendingMembers: scopedPendingMembers,
        approvedMembers: scopedApprovedMembers,
        approvalError,
        refreshApprovals,
        clearApprovalError,
        approveMember,
        rejectMember
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
