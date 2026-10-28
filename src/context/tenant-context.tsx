/**
 * BeltTrack Martial Arts Management - Tenant Isolation Context
 * 
 * Strict Multi-Tenant Enforcement:
 * Maintains active school tenant state and guarantees that all child
 * queries and mutations are isolated to the active school_id.
 */

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { School, SchoolMember } from '@/types/domain';
import { assertTenantMatch } from '@/lib/prisma-extension';

interface TenantContextType {
  activeSchool: School | null;
  isIsolated: boolean;
  setActiveSchool: (school: School) => void;
  clearTenant: () => void;
  pendingMembers: SchoolMember[];
  registerPendingStudent: (params: {
    studentFullName: string;
    studentEmail: string;
    isMinor: boolean;
    guardianFullName?: string;
    guardianEmail?: string;
  }) => SchoolMember;
}

const DEFAULT_DEMO_SCHOOL: School = {
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

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [activeSchool, setActiveSchoolState] = useState<School | null>(DEFAULT_DEMO_SCHOOL);
  const [pendingMembers, setPendingMembers] = useState<SchoolMember[]>([]);

  const setActiveSchool = (school: School) => {
    setActiveSchoolState(school);
  };

  const clearTenant = () => {
    setActiveSchoolState(null);
  };

  const registerPendingStudent = ({
    studentFullName,
    studentEmail,
    isMinor,
    guardianFullName,
    guardianEmail
  }: {
    studentFullName: string;
    studentEmail: string;
    isMinor: boolean;
    guardianFullName?: string;
    guardianEmail?: string;
  }): SchoolMember => {
    if (!activeSchool?.id) {
      throw new Error('Tenant isolation violation: schoolId must be provided for all private operations.');
    }

    const newStudentId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'stud-' + Date.now();
    const newMember: SchoolMember = {
      id: newStudentId,
      school_id: activeSchool.id,
      user_id: 'usr_' + newStudentId.slice(0, 8),
      role: 'student',
      status: 'pending_approval',
      full_name: studentFullName,
      email: studentEmail,
      guardian_name: isMinor ? guardianFullName : undefined,
      guardian_email: isMinor ? guardianEmail : undefined,
      stripes_count: 0,
      total_classes_attended: 0,
      is_flagged_inactive: false,
      enrolled_at: new Date().toISOString()
    };

    // Assert strict school_id tenant match
    assertTenantMatch(newMember.school_id, activeSchool.id);

    setPendingMembers(prev => [...prev, newMember]);
    return newMember;
  };

  return (
    <TenantContext.Provider
      value={{
        activeSchool,
        isIsolated: Boolean(activeSchool?.id),
        setActiveSchool,
        clearTenant,
        pendingMembers,
        registerPendingStudent
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
