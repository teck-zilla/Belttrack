'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';

export function PreviewDashboard() {
  const { activeRole } = useAuth();
  const [attendedClasses, setAttendedClasses] = useState(42);
  const totalRequired = 50;
  const isEligible = attendedClasses >= totalRequired;

  return (
    <section className="max-w-5xl mx-auto px-4 mb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="font-label text-xs font-bold uppercase tracking-wider text-tertiary">
            Isolated Tenant Live Preview
          </span>
          <h2 className="font-headline text-2xl font-bold text-primary">
            Dojo Operating Dashboard
          </h2>
        </div>
        <div className="font-label text-xs font-medium text-surface-on-variant bg-surface-container px-3 py-1 rounded-full border border-outline-variant">
          Viewing as: <strong className="text-primary capitalize">{activeRole === 'guardian' ? 'Guardian (Read-Only Preview)' : activeRole}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CARD 1: DYNAMIC RANK PROGRESSION & GRADING READINESS */}
        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-soft-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-label text-xs font-bold uppercase text-tertiary">
                Curriculum & Rank Engine
              </span>
              <span className={`font-label text-xs font-bold px-2 py-0.5 rounded ${
                isEligible ? 'bg-tertiary text-tertiary-foreground' : 'bg-surface-container-high text-surface-on-variant'
              }`}>
                {isEligible ? 'GRADING ELIGIBLE' : 'IN PROGRESS'}
              </span>
            </div>

            <h3 className="font-title text-base font-semibold text-primary mb-1">
              {activeRole === 'guardian' ? 'Kids BJJ (Linked Dependent Track)' : 'Brazilian Jiu-Jitsu (Gi Track)'}
            </h3>
            <p className="font-body text-xs text-surface-on-variant mb-4">
              {activeRole === 'guardian'
                ? 'Dependent: Leo Silva (Minor • Age 11) • Guardian: Marcus Vance'
                : activeRole === 'student'
                ? 'Self: Lucas Silva (Adult 18+) • White Belt (3 Stripes)'
                : activeRole === 'coach'
                ? 'Coach Roster View: Lucas Silva • White Belt (3 Stripes)'
                : 'Student: Lucas Silva • Current: White Belt (3 Stripes)'}
            </p>

            {/* Visual Martial Arts Belt */}
            <div className="relative w-full h-8 rounded-sm bg-surface-container-lowest border-2 border-outline mb-4 flex items-center justify-between overflow-hidden shadow-soft-2">
              {/* White Belt Body */}
              <div className="w-3/4 h-full bg-surface-container-lowest border-r-2 border-outline relative">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-outline-variant opacity-40" />
              </div>
              {/* Black Rank Bar */}
              <div className="w-1/4 h-full bg-inverse-surface flex items-center justify-around px-1.5">
                {/* 3 Stripes */}
                <div className="w-1.5 h-6 bg-surface-container-lowest rounded-sm" />
                <div className="w-1.5 h-6 bg-surface-container-lowest rounded-sm" />
                <div className="w-1.5 h-6 bg-surface-container-lowest rounded-sm" />
                <div className="w-1.5 h-6 bg-inverse-surface border border-dashed border-outline-variant" />
              </div>
            </div>

            {/* Progress Metrics */}
            <div className="space-y-3 font-body text-xs">
              <div>
                <div className="flex justify-between text-surface-on-variant mb-1 font-medium">
                  <span>Class Attendance</span>
                  <span className="font-label font-bold text-primary">{attendedClasses} / {totalRequired} classes</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className="h-full bg-tertiary rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (attendedClasses / totalRequired) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-surface-on-variant mb-1 font-medium">
                  <span>Mandatory Technique Sign-Offs</span>
                  <span className="font-label font-bold text-primary">8 / 10 Verified</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '80%' }} />
                </div>
              </div>

              <div className="pt-2 border-t border-outline-variant flex justify-between text-xs text-surface-on-variant">
                <span>Time-in-Rank:</span>
                <span className="font-label font-bold text-primary">142 Days (Min: 120)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-outline-variant">
            <button
              type="button"
              onClick={() => setAttendedClasses(prev => prev < totalRequired ? prev + 1 : 42)}
              className="w-full py-1.5 px-3 rounded text-xs font-title font-semibold bg-surface-container hover:bg-surface-container-high text-surface-foreground transition-colors"
            >
              + Simulate Roll-Call Check-in ({attendedClasses})
            </button>
          </div>
        </div>

        {/* CARD 2: ATTENDANCE & INACTIVE STUDENT DROP-OFF TRIGGER */}
        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-soft-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-label text-xs font-bold uppercase text-tertiary">
                Attendance & Retention
              </span>
              <span className="font-label text-xs font-bold px-2 py-0.5 rounded bg-warning text-surface-foreground">
                RETENTION WATCH
              </span>
            </div>

            <h3 className="font-title text-base font-semibold text-primary mb-1">
              Active Mat Roll-Call
            </h3>
            <p className="font-body text-xs text-surface-on-variant mb-4">
              Automated drop-off flags absent students (10–14 days).
            </p>

            {/* Inactive Alert Banner */}
            <div className="p-3 rounded-lg bg-surface-container border border-outline-variant mb-4 flex items-start gap-2.5">
              <div className="w-2 h-2 rounded-full bg-warning mt-1.5 flex-shrink-0 animate-pulse" />
              <div className="font-body text-xs">
                <span className="font-title font-semibold text-primary block">
                  Dropout Risk Flagged: Elena Rostova
                </span>
                <span className="text-surface-on-variant">
                  Absent for 13 consecutive days. Automated coach retention check triggered.
                </span>
              </div>
            </div>

            {/* Today's Mat Attendance Schedule */}
            <div className="space-y-2 font-body text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-surface-container-low border border-outline-variant">
                <div>
                  <span className="font-title font-semibold text-primary block">BJJ Fundamentals (Gi)</span>
                  <span className="text-surface-on-variant">Coach Marcus • 18:00 - 19:15</span>
                </div>
                <span className="font-label font-bold text-tertiary bg-tertiary-container text-tertiary-on-container px-2 py-0.5 rounded">
                  18 Checked In
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-surface-container-low border border-outline-variant">
                <div>
                  <span className="font-title font-semibold text-primary block">Competition Sparring</span>
                  <span className="text-surface-on-variant">Coach Elena • 19:30 - 20:45</span>
                </div>
                <span className="font-label font-bold text-primary bg-primary-container text-primary-on-container px-2 py-0.5 rounded">
                  12 Confirmed
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-outline-variant flex justify-between items-center text-xs text-surface-on-variant font-medium">
            <span>Overall Dojo Mat Attendance:</span>
            <span className="font-label font-bold text-primary">94.2% Retention</span>
          </div>
        </div>

        {/* CARD 3: INTERNAL LEDGER & MANUAL SETTLEMENT (ZERO-MONETIZATION) */}
        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-soft-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-label text-xs font-bold uppercase text-tertiary">
                Internal Bookkeeping
              </span>
              <span className="font-label text-xs font-bold px-2 py-0.5 rounded bg-primary-container text-primary-on-container">
                0% FEES
              </span>
            </div>

            <h3 className="font-title text-base font-semibold text-primary mb-1">
              Internal Ledger & Receipts
            </h3>
            <p className="font-body text-xs text-surface-on-variant mb-4">
              Manual off-platform settlements (cash/card/transfer).
            </p>

            {/* Recent Manual Settlement Entries */}
            <div className="space-y-2 font-body text-xs mb-4">
              <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-title font-semibold text-primary">Monthly Tuition (Cash Settlement)</span>
                  <span className="font-label font-bold text-primary">$120.00</span>
                </div>
                <div className="flex justify-between text-surface-on-variant text-xs font-label">
                  <span>Student: Mateo Diaz</span>
                  <span className="text-tertiary">REC-2026-BJJ-084</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-title font-semibold text-primary">Belt Promotion Testing Fee</span>
                  <span className="font-label font-bold text-primary">$45.00</span>
                </div>
                <div className="flex justify-between text-surface-on-variant text-xs font-label">
                  <span>Direct Bank Transfer</span>
                  <span className="text-tertiary">REC-2026-BJJ-085</span>
                </div>
              </div>
            </div>

            {/* Zero Monetization Callout */}
            <div className="p-2.5 rounded bg-surface-container border border-outline-variant font-body text-xs text-surface-on-variant">
              <span className="font-title font-semibold text-primary block mb-0.5">
                Closed Single Source of Truth
              </span>
              No third-party payment gateways, no subscription cuts, and zero feature paywalls.
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-outline-variant flex justify-between items-center text-xs text-surface-on-variant font-medium">
            <span>Settled This Month:</span>
            <span className="font-label font-bold text-primary">$4,860.00 (Offline)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
