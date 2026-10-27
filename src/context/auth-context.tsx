/**
 * BeltTrack Martial Arts Management - Auth Context Placeholder
 * 
 * Provides mock-ready and Supabase-compatible user authentication state,
 * linked memberships across schools, and active persona status.
 */

'use client';

import React, { createContext, useContext, useState } from 'react';
import type { UserRole, SchoolMember } from '@/types/domain';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  currentMember: SchoolMember | null;
  isAuthenticated: boolean;
  activeRole: UserRole;
  switchRole: (newRole: UserRole) => void;
  logout: () => void;
}

const DEMO_USER: AuthUser = {
  id: 'usr_7f201e8b41',
  email: 'headcoach@kaizenbjj.org',
  fullName: 'Marcus Vance'
};

const DEMO_MEMBER: SchoolMember = {
  id: 'mem_9941a02e',
  school_id: 'd9b2e041-381a-4e2b-bb8c-2f9a1c1d09e1',
  user_id: 'usr_7f201e8b41',
  role: 'owner',
  status: 'active',
  full_name: 'Marcus Vance',
  email: 'headcoach@kaizenbjj.org',
  stripes_count: 3,
  total_classes_attended: 142,
  is_flagged_inactive: false,
  enrolled_at: '2025-03-01T08:00:00Z'
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(DEMO_USER);
  const [currentMember, setCurrentMember] = useState<SchoolMember | null>(DEMO_MEMBER);
  const [activeRole, setActiveRole] = useState<UserRole>('owner');

  const switchRole = (newRole: UserRole) => {
    setActiveRole(newRole);
    if (currentMember) {
      setCurrentMember({
        ...currentMember,
        role: newRole
      });
    }
  };

  const logout = () => {
    setUser(null);
    setCurrentMember(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentMember,
        isAuthenticated: Boolean(user),
        activeRole,
        switchRole,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
