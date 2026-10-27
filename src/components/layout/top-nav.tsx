'use client';

import React from 'react';
import { useTenant } from '@/context/tenant-context';
import { useAuth } from '@/context/auth-context';
import type { UserRole } from '@/types/domain';

export function TopNav({
  onOpenDirectory,
  onOpenRegister,
  onOpenJoin
}: {
  onOpenDirectory?: () => void;
  onOpenRegister?: () => void;
  onOpenJoin?: () => void;
}) {
  const { activeSchool } = useTenant();
  const { activeRole, switchRole } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-surface-container-lowest border-b border-outline-variant shadow-soft-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center shadow-soft">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="4" />
              <line x1="8" y1="6" x2="8" y2="18" />
              <line x1="12" y1="6" x2="12" y2="18" strokeDasharray="2 2" />
              <path d="M16 10l2 2-2 2" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-extrabold uppercase tracking-tight text-primary">
                BeltTrack
              </span>
              <span className="font-label text-xs font-bold uppercase tracking-wider text-tertiary px-2 py-0.5 rounded-sm bg-tertiary-container text-tertiary-on-container">
                Martial OS
              </span>
            </div>
            <p className="font-title text-xs text-surface-on-variant font-medium">
              Private Dojo Management & Rank Tracker
            </p>
          </div>
        </div>

        {/* Active Tenant Dojo Indicator */}
        {activeSchool && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container border border-outline-variant">
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse" />
            <span className="font-title text-xs font-semibold text-surface-foreground">
              {activeSchool.name}
            </span>
            <span className="font-label text-xs font-bold px-2 py-0.5 rounded bg-primary text-primary-foreground">
              {activeSchool.registration_code}
            </span>
          </div>
        )}

        {/* Persona Switcher & Fast Actions */}
        <div className="flex items-center gap-3">
          {/* Public School Directory Trigger */}
          <button
            type="button"
            onClick={onOpenDirectory}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-title font-semibold bg-surface-container text-surface-foreground border border-outline-variant hover:bg-surface-container-high transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Public Directory
          </button>

          {/* Role Preview Segment Selector */}
          <div className="flex items-center rounded-lg bg-surface-container border border-outline-variant p-0.5">
            {(['owner', 'coach', 'student', 'guardian'] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => switchRole(r)}
                className={`px-2.5 py-1 rounded text-xs font-title font-semibold transition-all capitalize ${
                  activeRole === r
                    ? 'bg-primary text-primary-foreground shadow-soft-2'
                    : 'text-surface-on-variant hover:text-surface-foreground'
                }`}
              >
                {r === 'owner' ? 'Owner / Admin' : r === 'coach' ? 'Coach' : r === 'student' ? 'Student' : 'Guardian'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
