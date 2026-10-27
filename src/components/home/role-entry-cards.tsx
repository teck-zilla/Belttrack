'use client';

import React from 'react';

export function RoleEntryCards({
  onOpenRegister,
  onOpenJoin
}: {
  onOpenRegister: () => void;
  onOpenJoin: () => void;
}) {
  return (
    <section className="max-w-4xl mx-auto px-4 mb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DOJO OWNER & HEAD COACH ENTRY */}
        <div className="p-6 rounded-xl bg-surface-container-lowest border-2 border-outline-variant hover:border-primary transition-all shadow-medium-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-label text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-primary-container text-primary-on-container">
                Dojo Administrators
              </span>
              <span className="font-display text-2xl font-extrabold text-primary">
                01
              </span>
            </div>

            <h2 className="font-headline text-2xl font-bold text-primary mb-2">
              Register Your Martial Arts School
            </h2>

            <p className="font-body text-sm text-surface-on-variant mb-6 font-medium leading-relaxed">
              Create an isolated dojo tenant. Configure custom belt ladders (White to Black), generate your unique student access code, and schedule weekly roll-call sessions.
            </p>

            <ul className="space-y-2 mb-6 font-body text-xs text-surface-foreground font-medium">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Custom ranking tracks with minimum hours & time-in-rank
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Inactive student automated drop-off alerts (10–14 days)
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Manual cash/card settlement ledger & receipts
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={onOpenRegister}
            className="w-full py-3 px-4 rounded-lg bg-primary text-primary-foreground font-title text-sm font-semibold hover:bg-tertiary hover:text-tertiary-foreground transition-all shadow-soft-2 flex items-center justify-center gap-2"
          >
            <span>Register New School Tenant</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>

        {/* STUDENT & MINOR GUARDIAN ENTRY */}
        <div className="p-6 rounded-xl bg-surface-container-lowest border-2 border-outline-variant hover:border-tertiary transition-all shadow-medium-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-label text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-tertiary-container text-tertiary-on-container">
                Students & Parents
              </span>
              <span className="font-display text-2xl font-extrabold text-tertiary">
                02
              </span>
            </div>

            <h2 className="font-headline text-2xl font-bold text-primary mb-2">
              Join with School Registration Code
            </h2>

            <p className="font-body text-sm text-surface-on-variant mb-6 font-medium leading-relaxed">
              Enrolled in an accredited dojo? Input the unique school registration code provided by your head coach to access personal or child attendance and belt milestones.
            </p>

            <ul className="space-y-2 mb-6 font-body text-xs text-surface-foreground font-medium">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Live belt progression bar & remaining class countdown
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Verified technique sign-offs from your coaching staff
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Internal tuition receipts & testing fee confirmations
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={onOpenJoin}
            className="w-full py-3 px-4 rounded-lg bg-surface-container-high text-surface-foreground border border-outline-variant font-title text-sm font-semibold hover:bg-tertiary hover:text-tertiary-foreground hover:border-tertiary transition-all shadow-soft-2 flex items-center justify-center gap-2"
          >
            <span>Enter School Registration Code</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
