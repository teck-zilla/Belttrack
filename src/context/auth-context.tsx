/**
 * BeltTrack Martial Arts Management - Auth Context
 * 
 * Provides Supabase-backed session management, tenant profile synchronization,
 * email verification tracking, and seamless fallback to interactive preview personas.
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { UserRole, SchoolMember, AuthSessionRow } from '@/types/domain';
import { createClient } from '@/lib/supabase/client';
import { useTenant, DEFAULT_DEMO_SCHOOL } from '@/context/tenant-context';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  school_id?: string | null;
  supabase_uid?: string;
  isEmailVerified?: boolean;
}

export interface LoginCredentials {
  email?: string;
  schoolCode?: string;
  password?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  session: AuthSessionRow | null;
  currentMember: SchoolMember | null;
  isAuthenticated: boolean;
  isRealSession: boolean;
  isLoading: boolean;
  activeRole: UserRole;
  isEmailVerified: boolean;
  switchRole: (newRole: UserRole) => void;
  login: (
    emailOrCredentials: string | LoginCredentials,
    maybePassword?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setSessionUser: (authUser: AuthUser, role?: UserRole, isVerified?: boolean) => void;
  verifyEmailCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationCode: () => Promise<{ success: boolean; error?: string; retryAfter?: number }>;
  setEmailVerifiedState: (verified: boolean) => void;
}

const DEMO_USER: AuthUser = {
  id: 'usr_7f201e8b41',
  email: 'headcoach@kaizenbjj.org',
  fullName: 'Marcus Vance',
  school_id: 'd9b2e041-381a-4e2b-bb8c-2f9a1c1d09e1',
  isEmailVerified: true
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
  const { setActiveSchool } = useTenant();
  const [user, setUser] = useState<AuthUser | null>(DEMO_USER);
  const [currentMember, setCurrentMember] = useState<SchoolMember | null>(DEMO_MEMBER);
  const [activeRole, setActiveRole] = useState<UserRole>('owner');
  const [session, setSession] = useState<AuthSessionRow | null>(null);
  const [isRealSession, setIsRealSession] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(true);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          const verified = data.user.email_verified !== undefined ? Boolean(data.user.email_verified) : true;
          setIsEmailVerified(verified);
          if (data.session) {
            setSession(data.session);
          }

          const authUser: AuthUser = {
            id: data.user.id,
            supabase_uid: data.user.supabase_uid,
            email: data.user.email,
            fullName: data.user.first_name && data.user.last_name
              ? `${data.user.first_name} ${data.user.last_name}`
              : data.user.email,
            school_id: data.user.school_id,
            isEmailVerified: verified
          };

          const role = (data.user.role as UserRole) || 'student';

          setUser(authUser);
          setIsRealSession(true);
          setActiveRole(role);

          if (data.school) {
            setActiveSchool(data.school);
          }

          if (data.user.school_id) {
            setCurrentMember({
              id: `mem_${data.user.id.slice(0, 8)}`,
              school_id: data.user.school_id,
              user_id: data.user.id,
              supabase_uid: data.user.supabase_uid,
              role,
              status: data.user.status || 'pending_approval',
              full_name: authUser.fullName,
              email: data.user.email,
              stripes_count: 0,
              total_classes_attended: 0,
              is_flagged_inactive: false,
              enrolled_at: new Date().toISOString()
            });
          }
          return;
        }
      }
    } catch {
      // Fallback to preview demo mode on network or parse error
    } finally {
      setIsLoading(false);
    }
  }, [setActiveSchool]);

  useEffect(() => {
    refreshSession();

    try {
      const supabase = createClient();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          refreshSession();
        } else if (event === 'SIGNED_OUT') {
          setUser(DEMO_USER);
          setSession(null);
          setCurrentMember(DEMO_MEMBER);
          setActiveRole('owner');
          setIsRealSession(false);
          setIsLoading(false);
          setIsEmailVerified(true);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch {
      setIsLoading(false);
    }
  }, [refreshSession]);

  const switchRole = (newRole: UserRole) => {
    setActiveRole(newRole);
    if (currentMember) {
      setCurrentMember({
        ...currentMember,
        role: newRole
      });
    }
  };

  const setSessionUser = (authUser: AuthUser, role: UserRole = 'owner', isVerified?: boolean) => {
    const verified = isVerified !== undefined
      ? isVerified
      : (authUser.isEmailVerified !== undefined ? authUser.isEmailVerified : false);

    setUser({
      ...authUser,
      isEmailVerified: verified
    });
    setIsRealSession(true);
    setActiveRole(role);
    setIsEmailVerified(verified);

    if (authUser.school_id) {
      setCurrentMember({
        id: `mem_${authUser.id.slice(0, 8)}`,
        school_id: authUser.school_id,
        user_id: authUser.id,
        supabase_uid: authUser.supabase_uid,
        role,
        status: 'active',
        full_name: authUser.fullName,
        email: authUser.email,
        stripes_count: 0,
        total_classes_attended: 0,
        is_flagged_inactive: false,
        enrolled_at: new Date().toISOString()
      });
    }
  };

  const setEmailVerifiedState = (verified: boolean) => {
    setIsEmailVerified(verified);
    setUser((prev) => (prev ? { ...prev, isEmailVerified: verified } : null));
  };

  const verifyEmailCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.email) {
      return { success: false, error: 'No active user email session found.' };
    }

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          code: code.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Verification failed. Please check the code.' };
      }

      setEmailVerifiedState(true);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error verifying code.';
      return { success: false, error: msg };
    }
  };

  const resendVerificationCode = async (): Promise<{ success: boolean; error?: string; retryAfter?: number }> => {
    if (!user?.email) {
      return { success: false, error: 'No active user email session found.' };
    }

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Failed to resend verification code.',
          retryAfter: data.retryAfter
        };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error resending verification code.';
      return { success: false, error: msg };
    }
  };

  const login = async (
    emailOrCredentials: string | LoginCredentials,
    maybePassword?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const payload = typeof emailOrCredentials === 'string'
        ? { email: emailOrCredentials, password: maybePassword }
        : emailOrCredentials;

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setIsLoading(false);
        return { success: false, error: data.error || 'Authentication failed' };
      }

      if (data.session) {
        setSession(data.session);
      }

      if (data.user) {
        const verified = data.user.email_verified !== undefined ? Boolean(data.user.email_verified) : true;
        setIsEmailVerified(verified);

        const authUser: AuthUser = {
          id: data.user.id,
          supabase_uid: data.user.supabase_uid,
          email: data.user.email,
          fullName: data.user.first_name && data.user.last_name
            ? `${data.user.first_name} ${data.user.last_name}`
            : data.user.email,
          school_id: data.user.school_id,
          isEmailVerified: verified
        };

        const role = (data.user.role as UserRole) || 'student';
        setUser(authUser);
        setIsRealSession(true);
        setActiveRole(role);

        if (data.user.school_id) {
          setCurrentMember({
            id: `mem_${data.user.id.slice(0, 8)}`,
            school_id: data.user.school_id,
            user_id: data.user.id,
            supabase_uid: data.user.supabase_uid,
            role,
            status: data.user.status || 'active',
            full_name: authUser.fullName,
            email: data.user.email,
            stripes_count: 0,
            total_classes_attended: 0,
            is_flagged_inactive: false,
            enrolled_at: new Date().toISOString()
          });
          if (data.school) {
            setActiveSchool(data.school);
          }
        }
      }

      await refreshSession();
      return { success: true };
    } catch (err: unknown) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : 'Network error during login';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors during logout
    } finally {
      setUser(DEMO_USER);
      setSession(null);
      setCurrentMember(DEMO_MEMBER);
      setActiveRole('owner');
      setIsRealSession(false);
      setIsLoading(false);
      setIsEmailVerified(true);
      setActiveSchool(DEFAULT_DEMO_SCHOOL);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        currentMember,
        isAuthenticated: Boolean(user),
        isRealSession,
        isLoading,
        activeRole,
        isEmailVerified,
        switchRole,
        login,
        logout,
        refreshSession,
        setSessionUser,
        verifyEmailCode,
        resendVerificationCode,
        setEmailVerifiedState
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
