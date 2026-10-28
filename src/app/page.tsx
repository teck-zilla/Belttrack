'use client';

import React, { useState } from 'react';
import { TopNav } from '@/components/layout/top-nav';
import { HeroSection } from '@/components/home/hero-section';
import { RoleEntryCards } from '@/components/home/role-entry-cards';
import { PreviewDashboard } from '@/components/home/preview-dashboard';
import { useTenant } from '@/context/tenant-context';
import { schoolRegistrationSchema, studentJoinCodeSchema } from '@/lib/validation/schemas';
import type { DisciplineType } from '@/types/domain';


export default function HomePage() {
  const { activeSchool, setActiveSchool, registerPendingStudent } = useTenant();
  const [isRegisterModalOpen, setRegisterModalOpen] = useState(false);
  const [isJoinModalOpen, setJoinModalOpen] = useState(false);
  const [isDirectoryModalOpen, setDirectoryModalOpen] = useState(false);

  // Form states
  const [schoolName, setSchoolName] = useState('Vance Gracie Jiu-Jitsu');
  const [discipline, setDiscipline] = useState<DisciplineType>('brazilian_jiu_jitsu');
  const [city, setCity] = useState('Manchester');
  const [country, setCountry] = useState('United Kingdom');
  const [timezone, setTimezone] = useState('UTC');
  const [ownerName, setOwnerName] = useState('Marcus Vance');
  const [ownerEmail, setOwnerEmail] = useState('marcus@vancebjj.com');
  const [generatedCode, setGeneratedCode] = useState('VANCE-BJJ-2026');

  const [inputCode, setInputCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [formFeedback, setFormFeedback] = useState<string | null>(null);

  // Handle Dojo Registration
  const handleRegisterSchool = (e: React.FormEvent) => {
    e.preventDefault();
    const result = schoolRegistrationSchema.safeParse({
      schoolName,
      discipline,
      ownerFullName: ownerName,
      ownerEmail,
      city,
      country,
      timezone,
      customCode: generatedCode,
      isPublicInDirectory: true
    });

    if (!result.success) {
      setFormFeedback(result.error.issues[0]?.message || 'Invalid registration parameters');
      return;
    }

    // Set new isolated tenant with a unique UUID
    const newTenantId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'tenant-' + Date.now();
    setActiveSchool({
      id: newTenantId,
      name: schoolName,
      slug: schoolName.toLowerCase().replace(/\s+/g, '-'),
      registration_code: generatedCode,
      join_code: generatedCode,
      discipline,
      city,
      country,
      timezone,
      is_public: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    setFormFeedback('School tenant registered successfully! Access code generated.');
    setTimeout(() => {
      setRegisterModalOpen(false);
      setFormFeedback(null);
    }, 1200);
  };

  // Handle Student Join with Code
  const handleJoinSchool = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCode = inputCode.trim().toUpperCase();

    const result = studentJoinCodeSchema.safeParse({
      registrationCode: normalizedCode,
      studentFullName: studentName.trim(),
      studentEmail: studentEmail.trim(),
      isMinor,
      guardianFullName: isMinor ? guardianName.trim() : undefined,
      guardianEmail: isMinor && guardianEmail.trim() ? guardianEmail.trim() : undefined
    });

    if (!result.success) {
      setFormFeedback(result.error.issues[0]?.message || 'Invalid join parameters');
      return;
    }

    if (!activeSchool) {
      setFormFeedback('No active school tenant found to associate registration.');
      return;
    }

    // Verify tenant registration code matches active school tenant
    const schoolCode = (activeSchool.registration_code || activeSchool.join_code || '').toUpperCase();
    if (schoolCode && normalizedCode !== schoolCode) {
      setFormFeedback(`Join code mismatch: Code "${normalizedCode}" does not belong to active tenant "${activeSchool.name}".`);
      return;
    }

    // Wire into tenant database with school_id constraint and PENDING_APPROVAL status
    try {
      registerPendingStudent({
        studentFullName: studentName.trim(),
        studentEmail: studentEmail.trim(),
        isMinor,
        guardianFullName: isMinor ? guardianName.trim() : undefined,
        guardianEmail: isMinor && guardianEmail.trim() ? guardianEmail.trim() : undefined
      });

      setFormFeedback(
        `Join code verified for ${normalizedCode}! Enrolled in ${activeSchool.name}. Status: PENDING_APPROVAL (school_id: ${activeSchool.id.slice(0, 8)}...). Roster and technique reads are locked until coach sign-off.`
      );
      setTimeout(() => {
        setJoinModalOpen(false);
        setFormFeedback(null);
        setInputCode('');
        setStudentName('');
        setStudentEmail('');
        setIsMinor(false);
        setGuardianName('');
        setGuardianEmail('');
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error registering student under tenant.';
      setFormFeedback(message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <TopNav
        onOpenDirectory={() => setDirectoryModalOpen(true)}
        onOpenRegister={() => setRegisterModalOpen(true)}
        onOpenJoin={() => setJoinModalOpen(true)}
      />

      <main className="flex-1">
        <HeroSection />
        <RoleEntryCards
          onOpenRegister={() => setRegisterModalOpen(true)}
          onOpenJoin={() => setJoinModalOpen(true)}
        />
        <PreviewDashboard />
      </main>

      {/* FOOTER */}
      <footer className="border-t border-outline-variant bg-surface-container-lowest py-8 px-4 text-center font-body text-xs text-surface-on-variant">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-extrabold uppercase tracking-tight text-primary">
              BeltTrack
            </span>
            <span>• Private Martial Arts Management OS</span>
          </div>
          <p>
            Strict Multi-Tenancy • Zero Monetization Core • Self-Contained Source of Truth
          </p>
        </div>
      </footer>

      {/* MODAL 1: REGISTER DOJO SCHOOL */}
      {isRegisterModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="title-register-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface bg-opacity-60 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg p-6 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-hard-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-label text-xs font-bold text-tertiary uppercase">Tenant Creation</span>
                <h3 id="title-register-modal" className="font-headline text-xl font-bold text-primary">Register Martial Arts School</h3>
              </div>
              <button
                type="button"
                onClick={() => setRegisterModalOpen(false)}
                className="text-surface-on-variant hover:text-surface-foreground"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSchool} className="space-y-4">
              <div>
                <label className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                  School / Academy Name
                </label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-surface-container-low border border-outline-variant font-body text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                    Discipline
                  </label>
                  <select
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value as DisciplineType)}
                    className="w-full px-3 py-2 rounded-md bg-surface-container-low border border-outline-variant font-body text-sm"
                  >
                    <option value="brazilian_jiu_jitsu">Brazilian Jiu-Jitsu</option>
                    <option value="judo">Judo</option>
                    <option value="karate">Karate</option>
                    <option value="taekwondo">Taekwondo</option>
                    <option value="muay_thai">Muay Thai</option>
                    <option value="krav_maga">Krav Maga</option>
                  </select>
                </div>

                <div>
                  <label className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                    Unique School Code
                  </label>
                  <input
                    type="text"
                    required
                    value={generatedCode}
                    onChange={(e) => setGeneratedCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-md bg-surface-container-low border border-outline-variant font-label text-sm uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-surface-container-low border border-outline-variant font-body text-sm"
                  />
                </div>
                <div>
                  <label className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                    Operating Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-surface-container-low border border-outline-variant font-body text-sm"
                  >
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="America/New_York">America/New York (EST/EDT)</option>
                    <option value="America/Los_Angeles">America/Los Angeles (PST/PDT)</option>
                    <option value="America/Sao_Paulo">America/Sao Paulo (BRT)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    <option value="Asia/Bangkok">Asia/Bangkok (ICT)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                    Head Coach Name
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-surface-container-low border border-outline-variant font-body text-sm"
                  />
                </div>
                <div>
                  <label className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                    Owner Email
                  </label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-surface-container-low border border-outline-variant font-body text-sm"
                  />
                </div>
              </div>

              {formFeedback && (
                <div className="p-2 rounded bg-tertiary-container text-tertiary-on-container font-body text-xs font-medium">
                  {formFeedback}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="flex-1 py-2 px-4 rounded-md border border-outline-variant font-title text-xs font-semibold hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 rounded-md bg-primary text-primary-foreground font-title text-xs font-semibold hover:bg-tertiary transition-colors"
                >
                  Create Dojo Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: JOIN WITH REGISTRATION CODE */}
      {isJoinModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="title-join-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface bg-opacity-60 backdrop-blur-sm"
        >
          <div className="w-full max-w-md p-6 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-hard-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-label text-xs font-bold text-tertiary uppercase">Member Onboarding</span>
                <h3 id="title-join-modal" className="font-headline text-xl font-bold text-primary">Join Dojo with School Code</h3>
              </div>
              <button
                type="button"
                onClick={() => setJoinModalOpen(false)}
                className="text-surface-on-variant hover:text-surface-foreground"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinSchool} className="space-y-4">
              <div>
                <label className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                  School Registration Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KAIZEN-2026"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-md bg-surface-container-low border border-outline-variant font-label text-sm uppercase"
                />
                <span className="font-body text-xs text-surface-on-variant mt-1 block">
                  Ask your head coach or academy front desk for this code.
                </span>
              </div>

              <div>
                <label className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                  Student Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lucas Silva"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-surface-container-low border border-outline-variant font-body text-sm"
                />
              </div>

              <div>
                <label className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. lucas@example.com"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-surface-container-low border border-outline-variant font-body text-sm"
                />
              </div>

              {/* MINOR STUDENT TOGGLE */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="checkbox-is-minor"
                    checked={isMinor}
                    onChange={(e) => setIsMinor(e.target.checked)}
                    className="h-4 w-4 rounded border-outline-variant bg-surface-container-low text-primary accent-primary"
                  />
                  <span className="font-title text-xs font-semibold text-surface-foreground">
                    Student is under 18 years old (Minor enrollment)
                  </span>
                </label>
              </div>

              {/* GUARDIAN FIELDS (CONDITIONALLY SHOWN FOR MINORS) */}
              {isMinor && (
                <div className="space-y-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                  <div>
                    <span className="font-label text-xs font-bold text-tertiary uppercase block">
                      Parent / Guardian Information
                    </span>
                    <span className="font-body text-xs text-surface-on-variant block">
                      Required for linking guardian read-only progress views.
                    </span>
                  </div>

                  <div>
                    <label className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                      Guardian Full Name *
                    </label>
                    <input
                      type="text"
                      required={isMinor}
                      placeholder="e.g. Roberto Silva"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-surface-container-lowest border border-outline-variant font-body text-sm"
                    />
                  </div>

                  <div>
                    <label className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                      Guardian Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. roberto@example.com"
                      value={guardianEmail}
                      onChange={(e) => setGuardianEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-surface-container-lowest border border-outline-variant font-body text-sm"
                    />
                  </div>
                </div>
              )}

              {formFeedback && (
                <div className="p-2 rounded bg-tertiary-container text-tertiary-on-container font-body text-xs font-medium">
                  {formFeedback}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setJoinModalOpen(false)}
                  className="flex-1 py-2 px-4 rounded-md border border-outline-variant font-title text-xs font-semibold hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 rounded-md bg-primary text-primary-foreground font-title text-xs font-semibold hover:bg-tertiary transition-colors"
                >
                  Verify & Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PUBLIC SCHOOL DIRECTORY (CROSS-TENANT ISOLATION DEMO) */}
      {isDirectoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="title-directory-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface bg-opacity-60 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg p-6 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-hard-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-label text-xs font-bold text-tertiary uppercase">Public Directory</span>
                <h3 id="title-directory-modal" className="font-headline text-xl font-bold text-primary">Accredited Martial Arts Dojos</h3>
              </div>
              <button
                type="button"
                onClick={() => setDirectoryModalOpen(false)}
                className="text-surface-on-variant hover:text-surface-foreground"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <p className="font-body text-xs text-surface-on-variant mb-4">
              Global directory queries only expose public school metadata. Internal student rosters, attendances, and ledgers are strictly blocked by RLS.
            </p>

            <div className="space-y-2 mb-4 font-body text-xs">
              <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant flex justify-between items-center">
                <div>
                  <span className="font-title font-semibold text-primary block">Kaizen BJJ Academy</span>
                  <span className="text-surface-on-variant">London, United Kingdom • Brazilian Jiu-Jitsu</span>
                </div>
                <span className="font-label text-xs font-bold text-primary bg-primary-container px-2 py-0.5 rounded">
                  KAIZEN-2026
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant flex justify-between items-center">
                <div>
                  <span className="font-title font-semibold text-primary block">Kodokan Judo Institute Hub</span>
                  <span className="text-surface-on-variant">Tokyo, Japan • Traditional Judo</span>
                </div>
                <span className="font-label text-xs font-bold text-primary bg-primary-container px-2 py-0.5 rounded">
                  KODOKAN-77
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant flex justify-between items-center">
                <div>
                  <span className="font-title font-semibold text-primary block">Apex Taekwondo Academy</span>
                  <span className="text-surface-on-variant">Seoul, South Korea • WT Taekwondo</span>
                </div>
                <span className="font-label text-xs font-bold text-primary bg-primary-container px-2 py-0.5 rounded">
                  APEX-TKD
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDirectoryModalOpen(false)}
              className="w-full py-2 px-4 rounded-md bg-surface-container font-title text-xs font-semibold hover:bg-surface-container-high transition-colors"
            >
              Close Directory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
