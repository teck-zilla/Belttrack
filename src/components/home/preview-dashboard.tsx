'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';

export function PreviewDashboard() {
  const { activeRole } = useAuth();
  const [attendedClasses, setAttendedClasses] = useState(42);
  const totalRequired = 50;
  const isEligible = attendedClasses >= totalRequired;
  const isOwnerGroup = activeRole === 'owner' || activeRole === 'coach';

  return (
    <section className="max-w-5xl mx-auto px-4 mb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <span className="font-label text-xs font-bold uppercase tracking-wider text-tertiary">
            Isolated Tenant Live Preview
          </span>
          <h2 className="font-headline text-2xl font-bold text-primary">
            Dojo Operating Dashboard
          </h2>
        </div>
        <div className="font-label text-xs font-medium text-surface-on-variant bg-surface-container px-3 py-1 rounded-full border border-outline-variant self-start sm:self-auto">
          Viewing as: <strong className="text-primary capitalize">{isOwnerGroup ? 'Owner / Head Coach' : 'Student / Guardian'}</strong>
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
              <span className={`font-label text-xs font-bold px-2 py-0.5 rounded ${isEligible ? 'bg-tertiary text-tertiary-foreground' : 'bg-surface-container-high text-surface-on-variant'
                }`}>
                {isEligible ? 'GRADING ELIGIBLE' : 'IN PROGRESS'}
              </span>
            </div>

            <h3 className="font-title text-base font-semibold text-primary mb-1 break-words">
              Brazilian Jiu-Jitsu (Gi Track)
            </h3>
            <p className="font-body text-xs text-surface-on-variant mb-4 break-words">
              {isOwnerGroup
                ? 'Student: Lucas Silva • Current: White Belt (3 Stripes)'
                : 'Self: Lucas Silva (Adult 18+) • Linked Minor: Leo Silva (Age 11)'}
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
                <div className="flex flex-wrap justify-between gap-1 text-surface-on-variant mb-1 font-medium">
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
                <div className="flex flex-wrap justify-between gap-1 text-surface-on-variant mb-1 font-medium">
                  <span>Mandatory Technique Sign-Offs</span>
                  <span className="font-label font-bold text-primary">8 / 10 Verified</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '80%' }} />
                </div>
              </div>

              <div className="pt-2 border-t border-outline-variant flex flex-wrap justify-between gap-1 text-xs text-surface-on-variant">
                <span>Time-in-Rank:</span>
                <span className="font-label font-bold text-primary">142 Days (Min: 120)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-outline-variant">
            <button
              type="button"
              onClick={() => setAttendedClasses(prev => prev < totalRequired ? prev + 1 : 42)}
              className="w-full py-1.5 px-3 rounded-[10px] text-xs font-label font-medium bg-surface-container hover:bg-surface-container-high hover:shadow-soft text-surface-foreground transition-all duration-[600ms]"
            >
              {isOwnerGroup ? '+ Simulate Check-in & Sign-off' : '+ Simulate Check-in (Adult)'}
            </button>
          </div>
        </div>

        {/* CARD 2: ATTENDANCE & INACTIVE STUDENT DROP-OFF TRIGGER */}
        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-soft-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-label text-xs font-bold uppercase text-tertiary">
                {isOwnerGroup ? 'Attendance & Retention' : 'Personal & Dependent Attendance'}
              </span>
              <span
                className={`font-label text-xs font-bold px-2 py-0.5 rounded ${
                  isOwnerGroup
                    ? 'bg-warning text-surface-foreground'
                    : 'bg-tertiary text-tertiary-foreground'
                }`}
              >
                {isOwnerGroup ? 'RETENTION WATCH' : 'ACTIVE ENROLLMENT'}
              </span>
            </div>

            <h3 className="font-title text-base font-semibold text-primary mb-3">
              {isOwnerGroup
                ? 'Active Mat Roll-Call & Retention Watch'
                : 'My Schedule & Minor Supervision'}
            </h3>

            {/* Inactive / Status Alert Banner */}
            <div className="p-3 rounded-[10px] bg-surface-container border border-outline-variant mb-4 flex items-start gap-2.5">
              <div
                className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  isOwnerGroup ? 'bg-warning animate-pulse' : 'bg-tertiary'
                }`}
              />
              <div className="font-body text-xs">
                <span className="font-title font-semibold text-primary block">
                  {isOwnerGroup
                    ? 'Dropout Risk Flagged: Elena Rostova'
                    : 'Guardian Supervision & Attendance Status'}
                </span>
                <span className="text-surface-on-variant">
                  {isOwnerGroup
                    ? 'Absent for 13 consecutive days. Automated coach retention check triggered.'
                    : 'Lucas Silva is in good standing (42/50 classes). Minor dependent Leo Silva is supervised strictly under guardian read-only controls.'}
                </span>
              </div>
            </div>

            {/* Schedule Items */}
            <div className="space-y-2 font-body text-xs">
              {isOwnerGroup ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-[10px] bg-surface-container-low border border-outline-variant">
                    <div className="min-w-0">
                      <span className="font-title font-semibold text-primary block break-words">BJJ Fundamentals (Gi)</span>
                      <span className="text-surface-on-variant break-words">
                        Coach Marcus • 18:00 - 19:15
                      </span>
                    </div>
                    <span className="font-label font-bold text-tertiary bg-tertiary-container text-tertiary-on-container px-2 py-0.5 rounded flex-shrink-0">
                      18 Checked In
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-[10px] bg-surface-container-low border border-outline-variant">
                    <div className="min-w-0">
                      <span className="font-title font-semibold text-primary block break-words">Competition Sparring</span>
                      <span className="text-surface-on-variant break-words">Coach Elena • 19:30 - 20:45</span>
                    </div>
                    <span className="font-label font-bold text-primary bg-primary-container text-primary-on-container px-2 py-0.5 rounded flex-shrink-0">
                      12 Confirmed
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-[10px] bg-surface-container-low border border-outline-variant">
                    <div className="min-w-0">
                      <span className="font-title font-semibold text-primary block break-words">BJJ Fundamentals (Gi)</span>
                      <span className="text-surface-on-variant break-words">Today • 18:00 - 19:15</span>
                    </div>
                    <span className="font-label font-bold text-tertiary bg-tertiary-container text-tertiary-on-container px-2 py-0.5 rounded flex-shrink-0">
                      Lucas Silva (Enrolled)
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-[10px] bg-surface-container-low border border-outline-variant">
                    <div className="min-w-0">
                      <span className="font-title font-semibold text-primary block break-words">Kids BJJ Fundamentals</span>
                      <span className="text-surface-on-variant break-words">Saturday • 10:00 - 11:00</span>
                    </div>
                    <span className="font-label font-bold text-tertiary bg-tertiary-container text-tertiary-on-container px-2 py-0.5 rounded flex-shrink-0">
                      Leo Silva (Guardian Read-Only)
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-outline-variant flex flex-wrap justify-between items-center gap-1 text-xs text-surface-on-variant font-medium">
            <span>
              {isOwnerGroup ? 'Overall Dojo Mat Attendance:' : 'Mat Attendance Status:'}
            </span>
            <span className="font-label font-bold text-primary">
              {isOwnerGroup ? '94.2% Retention' : 'Current & Verified'}
            </span>
          </div>
        </div>

        {/* CARD 3: INTERNAL LEDGER & MANUAL SETTLEMENT (ZERO-MONETIZATION) */}
        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-soft-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-label text-xs font-bold uppercase text-tertiary">
                {isOwnerGroup ? 'Internal Bookkeeping & Matrix' : 'Personal & Guardian Receipts'}
              </span>
              <span className="font-label text-xs font-bold px-2 py-0.5 rounded bg-primary-container text-primary-on-container">
                {isOwnerGroup ? '0% FEES' : 'SETTLED'}
              </span>
            </div>

            <h3 className="font-title text-base font-semibold text-primary mb-1 break-words">
              {isOwnerGroup
                ? 'Internal Ledger & Technique Log'
                : 'My Tuition & Dependent Receipts'}
            </h3>
            <p className="font-body text-xs text-surface-on-variant mb-4 break-words">
              {isOwnerGroup
                ? 'Admin ledger entries with real-time coach verification records.'
                : 'Private dojo receipts for adult student and linked minor dependent.'}
            </p>

            {/* Dynamic Items */}
            <div className="space-y-2 font-body text-xs mb-4">
              {isOwnerGroup ? (
                <>
                  <div className="p-2.5 rounded-[10px] bg-surface-container-low border border-outline-variant">
                    <div className="flex flex-wrap justify-between items-center gap-1 mb-1">
                      <span className="font-title font-semibold text-primary break-words">Monthly Tuition (Cash Settlement)</span>
                      <span className="font-label font-bold text-primary flex-shrink-0">$120.00</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-1 text-surface-on-variant text-xs font-label">
                      <span className="break-words">Student: Mateo Diaz</span>
                      <span className="text-tertiary break-all">REC-2026-BJJ-084</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-[10px] bg-surface-container-low border border-outline-variant">
                    <div className="flex flex-wrap justify-between items-center gap-1 mb-1">
                      <span className="font-title font-semibold text-primary break-words">Armbar from Guard (Coach Verified)</span>
                      <span className="font-label font-bold text-primary flex-shrink-0">Verified</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-1 text-surface-on-variant text-xs font-label">
                      <span className="break-words">Lucas Silva • Mat Sign-off</span>
                      <span className="text-tertiary break-all">TECH-BJJ-01</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2.5 rounded-[10px] bg-surface-container-low border border-outline-variant">
                    <div className="flex flex-wrap justify-between items-center gap-1 mb-1">
                      <span className="font-title font-semibold text-primary break-words">Monthly Tuition (Gi Track)</span>
                      <span className="font-label font-bold text-primary flex-shrink-0">$120.00</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-1 text-surface-on-variant text-xs font-label">
                      <span className="break-words">Lucas Silva (Self)</span>
                      <span className="text-tertiary break-all">REC-2026-BJJ-084</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-[10px] bg-surface-container-low border border-outline-variant">
                    <div className="flex flex-wrap justify-between items-center gap-1 mb-1">
                      <span className="font-title font-semibold text-primary break-words">Junior Monthly Tuition (Kids)</span>
                      <span className="font-label font-bold text-primary flex-shrink-0">$95.00</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-1 text-surface-on-variant text-xs font-label">
                      <span className="break-words">Leo Silva (Minor) • Guardian Settled</span>
                      <span className="text-tertiary break-all">REC-2026-BJJ-092</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Zero Monetization Callout */}
            <div className="p-2.5 rounded-[10px] bg-surface-container border border-outline-variant font-body text-xs text-surface-on-variant">
              <span className="font-title font-semibold text-primary block mb-0.5">
                {isOwnerGroup ? 'Closed Single Source of Truth' : 'Direct Dojo Settlement Only'}
              </span>
              {isOwnerGroup
                ? 'No third-party payment gateways, no subscription cuts. Coach mat verifications & cash settlements recorded offline.'
                : 'Zero online payment fees. Minor dependent records are strictly managed through the guardian persona.'}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-outline-variant flex flex-wrap justify-between items-center gap-1 text-xs text-surface-on-variant font-medium">
            <span>
              {isOwnerGroup ? 'Settled This Month:' : 'Receipt Status:'}
            </span>
            <span className="font-label font-bold text-primary">
              {isOwnerGroup ? '$4,860.00 (Offline)' : 'All Dues Settled (Offline)'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
