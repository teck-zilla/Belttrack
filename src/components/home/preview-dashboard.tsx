'use client';

import { ManualLedgerModal } from './manual-ledger-modal';
import { MemberApprovalModal } from './member-approval-modal';
import { EmailVerificationBanner } from './email-verification-banner';
import { TechniqueCurriculumModal } from './technique-curriculum-modal';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useTenant } from '@/context/tenant-context';
import type { DisciplineType } from '@/types/domain';

interface DisciplineDashboardConfig {
  discipline: DisciplineType;
  label: string;
  card1: {
    trackTitle: string;
    studentRank: {
      ownerView: string;
      studentView: string;
    };
    beltVisual: {
      type: 'bjj' | 'karate' | 'taekwondo' | 'judo' | 'muay_thai' | 'krav_maga';
      bodyClass: string;
      barClass: string;
      stripeCount: number;
      ariaLabel: string;
      badgeText?: string;
    };
    timeInRank: string;
  };
  card2: {
    floorType: string;
    ownerSchedule: Array<{
      name: string;
      details: string;
      count: string;
      isHighlight?: boolean;
    }>;
    studentSchedule: Array<{
      name: string;
      time: string;
      attendee: string;
    }>;
    retentionStat: string;
  };
  card3: {
    receiptPrefix: string;
    trackShortName: string;
    techniqueVerificationTitle: string;
    techniqueCode: string;
    tuitionAmount: string;
    juniorTuitionAmount: string;
    studentName: string;
    dependentName: string;
  };
}

export const DISCIPLINE_DASHBOARD_CONFIG: Record<DisciplineType, DisciplineDashboardConfig> = {
  brazilian_jiu_jitsu: {
    discipline: 'brazilian_jiu_jitsu',
    label: 'Brazilian Jiu-Jitsu',
    card1: {
      trackTitle: 'Brazilian Jiu-Jitsu (Gi Track)',
      studentRank: {
        ownerView: 'Student: Lucas Silva • Current: White Belt (3 Stripes)',
        studentView: 'Self: Lucas Silva (Adult 18+) • Linked Minor: Leo Silva (Age 11)',
      },
      beltVisual: {
        type: 'bjj',
        bodyClass: 'bg-surface-container-lowest',
        barClass: 'bg-inverse-surface',
        stripeCount: 3,
        ariaLabel: 'White Belt with 3 Stripes',
      },
      timeInRank: '142 Days (Min: 120 Days)',
    },
    card2: {
      floorType: 'Dojo Mat',
      ownerSchedule: [
        {
          name: 'BJJ Fundamentals (Gi)',
          details: 'Coach Marcus • 18:00 - 19:15',
          count: '18 Checked In',
          isHighlight: true,
        },
        {
          name: 'Competition Sparring',
          details: 'Coach Elena • 19:30 - 20:45',
          count: '12 Confirmed',
        },
      ],
      studentSchedule: [
        {
          name: 'BJJ Fundamentals (Gi)',
          time: 'Today • 18:00 - 19:15',
          attendee: 'Lucas Silva (Enrolled)',
        },
        {
          name: 'Kids BJJ Fundamentals',
          time: 'Saturday • 10:00 - 11:00',
          attendee: 'Leo Silva (Guardian Read-Only)',
        },
      ],
      retentionStat: 'Overall Dojo Mat Attendance: 94.2% Retention',
    },
    card3: {
      receiptPrefix: 'BJJ',
      trackShortName: 'Gi Track',
      techniqueVerificationTitle: 'Armbar from Guard (Coach Verified)',
      techniqueCode: 'TECH-BJJ-01',
      tuitionAmount: '$120.00',
      juniorTuitionAmount: '$95.00',
      studentName: 'Lucas Silva',
      dependentName: 'Leo Silva',
    },
  },
  karate: {
    discipline: 'karate',
    label: 'Shotokan Karate',
    card1: {
      trackTitle: 'Shotokan Karate (Kyu / Dan Track)',
      studentRank: {
        ownerView: 'Student: Kenji Sato • Current: 8th Kyu (Yellow Belt)',
        studentView: 'Self: Kenji Sato (Adult 18+) • Linked Minor: Ren Sato (Age 9)',
      },
      beltVisual: {
        type: 'karate',
        bodyClass: 'bg-warning',
        barClass: 'bg-inverse-surface',
        stripeCount: 1,
        ariaLabel: 'Yellow Belt (8th Kyu)',
      },
      timeInRank: '95 Days (Min: 90 Days)',
    },
    card2: {
      floorType: 'Dojo Floor',
      ownerSchedule: [
        {
          name: 'Kihon & Kata (Heian Shodan)',
          details: 'Sensei Takahashi • 18:00 - 19:15',
          count: '16 Checked In',
          isHighlight: true,
        },
        {
          name: 'Kumite Drills & Bunkai',
          details: 'Sensei Kenji • 19:30 - 20:45',
          count: '14 Confirmed',
        },
      ],
      studentSchedule: [
        {
          name: 'Kihon & Kata (Heian Shodan)',
          time: 'Today • 18:00 - 19:15',
          attendee: 'Kenji Sato (Enrolled)',
        },
        {
          name: 'Junior Karate Tigers (Kata)',
          time: 'Saturday • 10:00 - 11:00',
          attendee: 'Ren Sato (Guardian Read-Only)',
        },
      ],
      retentionStat: 'Overall Dojo Floor Attendance: 95.8% Retention',
    },
    card3: {
      receiptPrefix: 'KT',
      trackShortName: 'Dojo Kyu Track',
      techniqueVerificationTitle: 'Heian Shodan Kata (Sensei Verified)',
      techniqueCode: 'TECH-KT-01',
      tuitionAmount: '$115.00',
      juniorTuitionAmount: '$90.00',
      studentName: 'Kenji Sato',
      dependentName: 'Ren Sato',
    },
  },
  taekwondo: {
    discipline: 'taekwondo',
    label: 'WT Taekwondo',
    card1: {
      trackTitle: 'WT / Olympic Taekwondo (Geup Track)',
      studentRank: {
        ownerView: 'Student: Min-ho Park • Current: 8th Geup (Yellow Belt)',
        studentView: 'Self: Min-ho Park (Adult 18+) • Linked Minor: Ji-woo Park (Age 8)',
      },
      beltVisual: {
        type: 'taekwondo',
        bodyClass: 'bg-warning',
        barClass: 'bg-primary',
        stripeCount: 1,
        ariaLabel: 'Yellow Belt (8th Geup)',
      },
      timeInRank: '92 Days (Min: 90 Days)',
    },
    card2: {
      floorType: 'Dojang Floor',
      ownerSchedule: [
        {
          name: 'Kicking Drills & Poomsae',
          details: 'Master Park • 18:00 - 19:15',
          count: '20 Checked In',
          isHighlight: true,
        },
        {
          name: 'Olympic Sparring (Gyeorugi)',
          details: 'Instructor Kim • 19:30 - 20:45',
          count: '15 Confirmed',
        },
      ],
      studentSchedule: [
        {
          name: 'Kicking Drills & Poomsae',
          time: 'Today • 18:00 - 19:15',
          attendee: 'Min-ho Park (Enrolled)',
        },
        {
          name: 'Little Tigers Taekwondo',
          time: 'Saturday • 10:00 - 11:00',
          attendee: 'Ji-woo Park (Guardian Read-Only)',
        },
      ],
      retentionStat: 'Overall Dojang Floor Attendance: 96.1% Retention',
    },
    card3: {
      receiptPrefix: 'TKD',
      trackShortName: 'Dojang Geup Track',
      techniqueVerificationTitle: 'Taegeuk 1 Jang Poomsae (Master Verified)',
      techniqueCode: 'TECH-TKD-01',
      tuitionAmount: '$125.00',
      juniorTuitionAmount: '$95.00',
      studentName: 'Min-ho Park',
      dependentName: 'Ji-woo Park',
    },
  },
  judo: {
    discipline: 'judo',
    label: 'Kodokan Judo',
    card1: {
      trackTitle: 'Kodokan Judo (Gokyo Track)',
      studentRank: {
        ownerView: 'Student: Denis Rostova • Current: 5th Kyu (Yellow Belt)',
        studentView: 'Self: Denis Rostova (Adult 18+) • Linked Minor: Mila Rostova (Age 10)',
      },
      beltVisual: {
        type: 'judo',
        bodyClass: 'bg-warning',
        barClass: 'bg-inverse-surface',
        stripeCount: 0,
        ariaLabel: 'Yellow Belt (5th Kyu Gokyo)',
      },
      timeInRank: '130 Days (Min: 120 Days)',
    },
    card2: {
      floorType: 'Tatami Mat',
      ownerSchedule: [
        {
          name: 'Nage-Waza & Ukemi Breakfalls',
          details: 'Sensei Rostova • 18:00 - 19:15',
          count: '17 Checked In',
          isHighlight: true,
        },
        {
          name: 'Randori (Free Practice)',
          details: 'Sensei Mikhail • 19:30 - 20:45',
          count: '11 Confirmed',
        },
      ],
      studentSchedule: [
        {
          name: 'Nage-Waza & Ukemi',
          time: 'Today • 18:00 - 19:15',
          attendee: 'Denis Rostova (Enrolled)',
        },
        {
          name: 'Youth Judo Fundamentals',
          time: 'Saturday • 10:00 - 11:00',
          attendee: 'Mila Rostova (Guardian Read-Only)',
        },
      ],
      retentionStat: 'Overall Tatami Mat Attendance: 93.9% Retention',
    },
    card3: {
      receiptPrefix: 'JUDO',
      trackShortName: 'Gokyo Judogi Track',
      techniqueVerificationTitle: 'Ippon Seoi Nage (Sensei Verified)',
      techniqueCode: 'TECH-JUDO-01',
      tuitionAmount: '$110.00',
      juniorTuitionAmount: '$85.00',
      studentName: 'Denis Rostova',
      dependentName: 'Mila Rostova',
    },
  },
  muay_thai: {
    discipline: 'muay_thai',
    label: 'Muay Thai',
    card1: {
      trackTitle: 'Muay Thai (Khan Prajioud Track)',
      studentRank: {
        ownerView: 'Student: Somchai Thaworn • Current: Khan 4 (Green Prajioud)',
        studentView: 'Self: Somchai Thaworn (Adult 18+) • Linked Minor: Lek Thaworn (Age 12)',
      },
      beltVisual: {
        type: 'muay_thai',
        bodyClass: 'bg-tertiary-container',
        barClass: 'bg-tertiary',
        stripeCount: 2,
        ariaLabel: 'Khan 4 (Green Prajioud Armband)',
        badgeText: 'KHAN 4',
      },
      timeInRank: '85 Days (Min: 75 Days)',
    },
    card2: {
      floorType: 'Ring & Bag',
      ownerSchedule: [
        {
          name: 'Pad Work & Clinch Control',
          details: 'Kru Somchai • 18:00 - 19:15',
          count: '19 Checked In',
          isHighlight: true,
        },
        {
          name: 'Dutch Drills & Light Sparring',
          details: 'Kru Alex • 19:30 - 20:45',
          count: '14 Confirmed',
        },
      ],
      studentSchedule: [
        {
          name: 'Pad Work & Clinch Control',
          time: 'Today • 18:00 - 19:15',
          attendee: 'Somchai Thaworn (Enrolled)',
        },
        {
          name: 'Junior Muay Thai Kickboxing',
          time: 'Saturday • 10:00 - 11:00',
          attendee: 'Lek Thaworn (Guardian Read-Only)',
        },
      ],
      retentionStat: 'Overall Ring & Bag Attendance: 95.1% Retention',
    },
    card3: {
      receiptPrefix: 'MT',
      trackShortName: 'Camp Prajioud Track',
      techniqueVerificationTitle: 'Double Collar Tie & Knee (Kru Verified)',
      techniqueCode: 'TECH-MT-01',
      tuitionAmount: '$130.00',
      juniorTuitionAmount: '$100.00',
      studentName: 'Somchai Thaworn',
      dependentName: 'Lek Thaworn',
    },
  },
  krav_maga: {
    discipline: 'krav_maga',
    label: 'Krav Maga',
    card1: {
      trackTitle: 'Tactical Krav Maga (Civilian Track)',
      studentRank: {
        ownerView: 'Student: David Cohen • Current: Practitioner Level 1 (P1)',
        studentView: 'Self: David Cohen (Adult 18+) • Linked Minor: Eli Cohen (Age 13)',
      },
      beltVisual: {
        type: 'krav_maga',
        bodyClass: 'bg-secondary',
        barClass: 'bg-primary',
        stripeCount: 1,
        ariaLabel: 'Practitioner Level 1 (P1)',
        badgeText: 'P-1 TACTICAL',
      },
      timeInRank: '125 Days (Min: 120 Days)',
    },
    card2: {
      floorType: 'Tactical Center',
      ownerSchedule: [
        {
          name: 'Combatives & 360 Defense',
          details: 'Lead Inst. David • 18:00 - 19:15',
          count: '18 Checked In',
          isHighlight: true,
        },
        {
          name: 'Choke Releases & Ground Escapes',
          details: 'Inst. Sarah • 19:30 - 20:45',
          count: '13 Confirmed',
        },
      ],
      studentSchedule: [
        {
          name: 'Combatives & 360 Defense',
          time: 'Today • 18:00 - 19:15',
          attendee: 'David Cohen (Enrolled)',
        },
        {
          name: 'Teen Self-Defense & Awareness',
          time: 'Saturday • 10:00 - 11:00',
          attendee: 'Eli Cohen (Guardian Read-Only)',
        },
      ],
      retentionStat: 'Overall Tactical Center Attendance: 94.7% Retention',
    },
    card3: {
      receiptPrefix: 'KM',
      trackShortName: 'Civilian P-Level',
      techniqueVerificationTitle: '360-Degree Defense Against Strikes (Verified)',
      techniqueCode: 'TECH-KM-01',
      tuitionAmount: '$135.00',
      juniorTuitionAmount: '$105.00',
      studentName: 'David Cohen',
      dependentName: 'Eli Cohen',
    },
  },
};

export function PreviewDashboard() {
  const { activeRole, isRealSession, logout } = useAuth();
  const { pendingMembers, activeSchool } = useTenant();
  const [attendedClasses, setAttendedClasses] = useState(42);
  const totalRequired = 50;
  const isEligible = attendedClasses >= totalRequired;
  const isOwnerGroup = activeRole === 'owner' || activeRole === 'coach';
  const [isManualLedgerOpen, setIsManualLedgerOpen] = useState(false);
  const [isApprovalsModalOpen, setIsApprovalsModalOpen] = useState(false);
  const [isCurriculumModalOpen, setIsCurriculumModalOpen] = useState(false);
  const [verifiedTechniques, setVerifiedTechniques] = useState(8);
  const [previewDisciplineOverride, setPreviewDisciplineOverride] = useState<DisciplineType | null>(null);
  const [manualEntries, setManualEntries] = useState<Array<{
    title: string;
    amount: string;
    subtext: string;
    slug: string;
  }>>([]);

  // Resolve active discipline: real signed-in school discipline takes precedence;
  // in preview demo mode, allows interactive switching across all 6 martial arts.
  const currentDiscipline: DisciplineType = (
    !isRealSession && previewDisciplineOverride
      ? previewDisciplineOverride
      : (activeSchool?.discipline || 'brazilian_jiu_jitsu')
  ) as DisciplineType;

  const config = DISCIPLINE_DASHBOARD_CONFIG[currentDiscipline] || DISCIPLINE_DASHBOARD_CONFIG.brazilian_jiu_jitsu;

  return (
    <section className="max-w-5xl mx-auto px-4 mb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <span className="font-label text-xs font-bold uppercase tracking-wider text-tertiary">
            {isOwnerGroup ? 'Dojo Head Coach Console' : 'Student & Guardian Portal'}
          </span>
          <h2 className="font-headline text-2xl font-bold text-primary">
            {isOwnerGroup ? 'Dojo Operating Dashboard' : 'Student Progression & Attendance'}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {!isRealSession && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] bg-surface-container border border-outline-variant">
              <label htmlFor="select-dashboard-discipline" className="font-label text-[10px] uppercase font-bold text-surface-on-variant">
                Discipline:
              </label>
              <select
                id="select-dashboard-discipline"
                value={currentDiscipline}
                onChange={(e) => setPreviewDisciplineOverride(e.target.value as DisciplineType)}
                className="bg-surface-container-lowest text-primary font-label text-xs font-semibold rounded px-1.5 py-0.5 border border-outline-variant cursor-pointer focus:outline-none"
                aria-label="Filter preview dashboard discipline"
              >
                <option value="brazilian_jiu_jitsu">BJJ</option>
                <option value="karate">Karate</option>
                <option value="taekwondo">Taekwondo</option>
                <option value="judo">Judo</option>
                <option value="muay_thai">Muay Thai</option>
                <option value="krav_maga">Krav Maga</option>
              </select>
            </div>
          )}
          <button
            type="button"
            id="btn-open-curriculum"
            onClick={() => setIsCurriculumModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-surface-container hover:bg-surface-container-high text-surface-foreground font-label text-xs font-semibold border border-outline-variant hover:shadow-soft transition-all duration-[300ms] cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Curriculum</span>
            <span className="px-1.5 py-0.2 rounded-full font-bold text-[10px] bg-tertiary-container text-tertiary-on-container">
              {verifiedTechniques}/10
            </span>
          </button>
          {isOwnerGroup && (
            <button
              type="button"
              id="btn-open-approvals"
              onClick={() => setIsApprovalsModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-primary text-primary-foreground font-label text-xs font-semibold hover:bg-tertiary hover:shadow-soft transition-all duration-[600ms] cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Member Approvals</span>
              <span
                className={`px-1.5 py-0.2 rounded-full font-bold text-[10px] ${
                  pendingMembers.length > 0
                    ? 'bg-warning text-surface-foreground'
                    : 'bg-primary-container text-primary-on-container'
                }`}
              >
                {pendingMembers.length} Pending
              </span>
            </button>
          )}
          <div className="font-label text-xs font-medium text-surface-on-variant bg-surface-container px-3 py-1 rounded-full border border-outline-variant">
            Viewing as: <strong className="text-primary capitalize">{isOwnerGroup ? 'Owner / Head Coach' : 'Student / Guardian'}</strong>
          </div>

          {/* Sign Out button: only appears after either role has signed in */}
          {isRealSession && (
            <button
              type="button"
              id="btn-dashboard-sign-out"
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-label font-medium bg-error-container text-error-on-container hover:shadow-soft transition-all duration-[600ms] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
              aria-label="Sign out of dojo session"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* EMAIL VERIFICATION BANNER */}
      <EmailVerificationBanner />

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
              {config.card1.trackTitle}
            </h3>
            <p className="font-body text-xs text-surface-on-variant mb-4 break-words">
              {isOwnerGroup
                ? config.card1.studentRank.ownerView
                : config.card1.studentRank.studentView}
            </p>

            {/* Visual Martial Arts Belt */}
            <div
              className="relative w-full h-8 rounded-sm bg-surface-container-lowest border-2 border-outline mb-4 flex items-center justify-between overflow-hidden shadow-soft-2"
              aria-label={config.card1.beltVisual.ariaLabel}
            >
              {/* Belt Body */}
              <div className={`w-3/4 h-full border-r-2 border-outline relative ${config.card1.beltVisual.bodyClass}`}>
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-outline-variant opacity-40" />
                {config.card1.beltVisual.badgeText && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 font-label text-[9px] font-bold tracking-wider text-primary px-1 rounded bg-surface-container-lowest border border-outline-variant">
                    {config.card1.beltVisual.badgeText}
                  </span>
                )}
              </div>
              {/* Rank Bar / Insignia Sleeve */}
              <div className={`w-1/4 h-full flex items-center justify-around px-1.5 ${config.card1.beltVisual.barClass}`}>
                {config.card1.beltVisual.stripeCount > 0 ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-6 rounded-sm ${
                        idx < config.card1.beltVisual.stripeCount
                          ? 'bg-surface-container-lowest'
                          : 'bg-transparent border border-dashed border-outline-variant'
                      }`}
                    />
                  ))
                ) : (
                  <div className="w-2 h-6 bg-surface-container-lowest rounded-sm opacity-60" />
                )}
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

              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsCurriculumModalOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsCurriculumModalOpen(true);
                  }
                }}
                className="group cursor-pointer rounded-lg p-1.5 -mx-1.5 hover:bg-surface-container-low transition-colors"
                title="Click to view technique curriculum syllabus"
              >
                <div className="flex flex-wrap justify-between gap-1 text-surface-on-variant mb-1 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span>Mandatory Technique Sign-Offs</span>
                    <span className="text-[10px] font-mono text-tertiary group-hover:underline">View Syllabus ↗</span>
                  </span>
                  <span className="font-label font-bold text-primary">{verifiedTechniques} / 10 Verified</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${(verifiedTechniques / 10) * 100}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-outline-variant flex flex-wrap justify-between gap-1 text-xs text-surface-on-variant">
                <span>Time-in-Rank:</span>
                <span className="font-label font-bold text-primary">{config.card1.timeInRank}</span>
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
                ? `Active ${config.card2.floorType} Roll-Call & Retention Watch`
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
                    : `${config.card3.studentName} is in good standing (42/50 classes). Minor dependent ${config.card3.dependentName} is supervised strictly under guardian read-only controls.`}
                </span>
              </div>
            </div>

            {/* Schedule Items */}
            <div className="space-y-2 font-body text-xs">
              {isOwnerGroup ? (
                <>
                  {manualEntries.map((entry, idx) => (
                    <div key={idx} className="p-2.5 rounded-[10px] bg-surface-container-low border border-tertiary shadow-soft">
                      <div className="flex flex-wrap justify-between items-center gap-1 mb-1">
                        <span className="font-title font-semibold text-primary break-words">{entry.title}</span>
                        <span className="font-label font-bold text-tertiary flex-shrink-0">{entry.amount}</span>
                      </div>
                      <div className="flex flex-wrap justify-between gap-1 text-surface-on-variant text-xs font-label">
                        <span className="break-words">{entry.subtext}</span>
                        <span className="text-tertiary font-bold break-all">{entry.slug}</span>
                      </div>
                    </div>
                  ))}
                  {config.card2.ownerSchedule.map((sched, idx) => (
                    <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-[10px] bg-surface-container-low border border-outline-variant">
                      <div className="min-w-0">
                        <span className="font-title font-semibold text-primary block break-words">{sched.name}</span>
                        <span className="text-surface-on-variant break-words">{sched.details}</span>
                      </div>
                      <span className={`font-label font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                        sched.isHighlight
                          ? 'text-tertiary bg-tertiary-container text-tertiary-on-container'
                          : 'text-primary bg-primary-container text-primary-on-container'
                      }`}>
                        {sched.count}
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {config.card2.studentSchedule.map((sched, idx) => (
                    <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-[10px] bg-surface-container-low border border-outline-variant">
                      <div className="min-w-0">
                        <span className="font-title font-semibold text-primary block break-words">{sched.name}</span>
                        <span className="text-surface-on-variant break-words">{sched.time}</span>
                      </div>
                      <span className="font-label font-bold text-tertiary bg-tertiary-container text-tertiary-on-container px-2 py-0.5 rounded flex-shrink-0">
                        {sched.attendee}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-outline-variant flex flex-wrap justify-between items-center gap-1 text-xs text-surface-on-variant font-medium">
            <span>
              {isOwnerGroup ? `${config.card2.floorType} Attendance:` : 'Attendance Status:'}
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

            {isOwnerGroup && (
              <button
                type="button"
                id="btn-open-manual-ledger"
                onClick={() => setIsManualLedgerOpen(true)}
                className="w-full mb-3 py-2 px-3 rounded-[10px] bg-tertiary text-tertiary-foreground font-label text-xs font-semibold hover:shadow-soft transition-all duration-[600ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Record Manual Settlement</span>
              </button>
            )}

            {/* Dynamic Items */}
            <div className="space-y-2 font-body text-xs mb-4">
              {isOwnerGroup ? (
                <>
                  <div className="p-2.5 rounded-[10px] bg-surface-container-low border border-outline-variant">
                    <div className="flex flex-wrap justify-between items-center gap-1 mb-1">
                      <span className="font-title font-semibold text-primary break-words">Monthly Tuition (Cash Settlement)</span>
                      <span className="font-label font-bold text-primary flex-shrink-0">{config.card3.tuitionAmount}</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-1 text-surface-on-variant text-xs font-label">
                      <span className="break-words">Student: Mateo Diaz</span>
                      <span className="text-tertiary break-all">REC-2026-{config.card3.receiptPrefix}-084</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-[10px] bg-surface-container-low border border-outline-variant">
                    <div className="flex flex-wrap justify-between items-center gap-1 mb-1">
                      <span className="font-title font-semibold text-primary break-words">{config.card3.techniqueVerificationTitle}</span>
                      <span className="font-label font-bold text-primary flex-shrink-0">Verified</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-1 text-surface-on-variant text-xs font-label">
                      <span className="break-words">{config.card3.studentName} • Mat Sign-off</span>
                      <span className="text-tertiary break-all">{config.card3.techniqueCode}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2.5 rounded-[10px] bg-surface-container-low border border-outline-variant">
                    <div className="flex flex-wrap justify-between items-center gap-1 mb-1">
                      <span className="font-title font-semibold text-primary break-words">Monthly Tuition ({config.card3.trackShortName})</span>
                      <span className="font-label font-bold text-primary flex-shrink-0">{config.card3.tuitionAmount}</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-1 text-surface-on-variant text-xs font-label">
                      <span className="break-words">{config.card3.studentName} (Self)</span>
                      <span className="text-tertiary break-all">REC-2026-{config.card3.receiptPrefix}-084</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-[10px] bg-surface-container-low border border-outline-variant">
                    <div className="flex flex-wrap justify-between items-center gap-1 mb-1">
                      <span className="font-title font-semibold text-primary break-words">Junior Monthly Tuition (Kids)</span>
                      <span className="font-label font-bold text-primary flex-shrink-0">{config.card3.juniorTuitionAmount}</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-1 text-surface-on-variant text-xs font-label">
                      <span className="break-words">{config.card3.dependentName} (Minor) • Guardian Settled</span>
                      <span className="text-tertiary break-all">REC-2026-{config.card3.receiptPrefix}-092</span>
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

      <ManualLedgerModal
        isOpen={isManualLedgerOpen}
        onClose={() => setIsManualLedgerOpen(false)}
        onRecordCreated={(rec) => setManualEntries((prev) => [rec, ...prev])}
      />
      <MemberApprovalModal
        isOpen={isApprovalsModalOpen}
        onClose={() => setIsApprovalsModalOpen(false)}
      />
      <TechniqueCurriculumModal
        isOpen={isCurriculumModalOpen}
        onClose={() => setIsCurriculumModalOpen(false)}
        verifiedTechniquesCount={verifiedTechniques}
        onTechniqueVerified={(newCount) => setVerifiedTechniques(newCount)}
      />
    </section>
  );
}
