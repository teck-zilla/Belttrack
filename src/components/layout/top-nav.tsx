'use client';

import React from 'react';
import Link from 'next/link';
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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 no-underline cursor-pointer group transition-all duration-[600ms] min-w-0">
          <div className="w-10 h-10 rounded-[10px] bg-primary text-primary-foreground flex-shrink-0 flex items-center justify-center shadow-soft group-hover:shadow-soft transition-all duration-[600ms]">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="4" />
              <line x1="8" y1="6" x2="8" y2="18" />
              <line x1="12" y1="6" x2="12" y2="18" strokeDasharray="2 2" />
              <path d="M16 10l2 2-2 2" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-primary">
                BeltTrack
              </span>
              <span className="font-label text-xs font-bold uppercase tracking-wider text-tertiary px-2 py-0.5 rounded-sm bg-tertiary-container text-tertiary-on-container">
                Martial OS
              </span>
            </div>
            <p className="font-title text-[11px] sm:text-xs text-surface-on-variant font-medium leading-tight">
              Single Source of Truth for Martial Arts Academies
            </p>
          </div>
        </Link>

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
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center sm:justify-end">
          {/* Public School Directory Trigger */}
          <button
            type="button"
            onClick={onOpenDirectory}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-label font-medium bg-surface-container text-surface-foreground border border-outline-variant hover:bg-surface-container-high hover:shadow-soft transition-all duration-[600ms]"
          >
            <svg className="w-3.5 h-3.5 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Public Directory
          </button>

          {/* Role Preview Segment Selector */}
          <div
            role="group"
            aria-label="Simulate Persona Role"
            className="flex items-center gap-0.5 rounded-[0.625rem] bg-surface-container border border-outline-variant p-0.5 w-full sm:w-auto justify-center"
          >
            {[
              {
                role: 'owner' as const,
                label: 'Owner / Head Coach',
                isActive: activeRole === 'owner' || activeRole === 'coach',
              },
              {
                role: 'student' as const,
                label: 'Student / Guardian',
                isActive: activeRole === 'student' || activeRole === 'guardian',
              },
            ].map(({ role: r, label, isActive }) => (
              <button
                key={r}
                type="button"
                aria-pressed={isActive}
                onClick={() => switchRole(r)}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 rounded-[10px] text-[11px] sm:text-xs font-label font-medium transition-all text-center ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-soft-2'
                    : 'text-surface-on-variant hover:text-surface-foreground hover:shadow-soft'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
