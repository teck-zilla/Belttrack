'use client';

import React, { useState, useEffect } from 'react';
import { TopNav } from '@/components/layout/top-nav';
import { HeroSection } from '@/components/home/hero-section';
import { RoleEntryCards } from '@/components/home/role-entry-cards';
import { PreviewDashboard } from '@/components/home/preview-dashboard';
import { LoginModal } from '@/components/home/login-modal';
import { useAccessibleModal } from '@/components/home/use-accessible-modal';
import { useTenant } from '@/context/tenant-context';
import { schoolRegistrationSchema, studentJoinCodeSchema } from '@/lib/validation/schemas';
import type { DisciplineType } from '@/types/domain';

interface DirectorySchool {
  id: string;
  name: string;
  slug: string;
  city: string;
  discipline: string;
  joinCode: string;
}

function InlineFieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span
      id={id}
      role="alert"
      aria-live="polite"
      className="font-body text-[11px] text-error mt-1 flex items-center gap-1.5"
    >
      <svg
        className="w-3.5 h-3.5 flex-shrink-0 text-error"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span>{message}</span>
    </span>
  );
}

export default function HomePage() {
  const { activeSchool, setActiveSchool, registerPendingStudent } = useTenant();
  const [isRegisterModalOpen, setRegisterModalOpen] = useState(false);
  const [isJoinModalOpen, setJoinModalOpen] = useState(false);
  const [isDirectoryModalOpen, setDirectoryModalOpen] = useState(false);
  const [isTermsModalOpen, setTermsModalOpen] = useState(false);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const registerModalRef = useAccessibleModal(isRegisterModalOpen, () => setRegisterModalOpen(false));
  const joinModalRef = useAccessibleModal(isJoinModalOpen, () => setJoinModalOpen(false));
  const directoryModalRef = useAccessibleModal(isDirectoryModalOpen, () => setDirectoryModalOpen(false));
  const termsModalRef = useAccessibleModal(isTermsModalOpen, () => setTermsModalOpen(false));

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
  const [studentPassword, setStudentPassword] = useState('');
  const [showJoinPassword, setShowJoinPassword] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [regTermsAccepted, setRegTermsAccepted] = useState(false);
  const [joinTermsAccepted, setJoinTermsAccepted] = useState(false);
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isValidEmail = (email: string) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test((email || '').trim());

  const isValidSchoolJoinCode = (code: string) =>
    /^[A-Za-z]{1,6}-[A-Za-z]{1,4}-[0-9]{1,4}$/.test((code || '').trim());

  const isValidPassword = (pw: string) =>
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,11}$/.test((pw || '').trim());

  const emailFields = ['ownerEmail', 'studentEmail', 'guardianEmail'];

  const isRegisterFormValid = Boolean(
    regTermsAccepted &&
    schoolName.trim().length > 3 &&
    discipline &&
    isValidSchoolJoinCode(generatedCode) &&
    country.trim().length >= 2 &&
    timezone &&
    ownerName.trim().length >= 3 &&
    ownerName.trim().split(/\s+/).filter(Boolean).length >= 2 &&
    isValidEmail(ownerEmail) &&
    !fieldErrors['schoolName'] &&
    !fieldErrors['discipline'] &&
    !fieldErrors['generatedCode'] &&
    !fieldErrors['country'] &&
    !fieldErrors['timezone'] &&
    !fieldErrors['ownerName'] &&
    !fieldErrors['ownerEmail']
  );

  const isJoinFormValid = Boolean(
    joinTermsAccepted &&
    isValidSchoolJoinCode(inputCode) &&
    studentName.trim().length >= 3 &&
    studentName.trim().split(/\s+/).filter(Boolean).length >= 2 &&
    isValidEmail(studentEmail) &&
    isValidPassword(studentPassword) &&
    (!isMinor || (
      guardianName.trim().length >= 3 &&
      guardianName.trim().split(/\s+/).filter(Boolean).length >= 2 &&
      (!guardianEmail.trim() || isValidEmail(guardianEmail))
    )) &&
    !fieldErrors['inputCode'] &&
    !fieldErrors['studentName'] &&
    !fieldErrors['studentEmail'] &&
    !fieldErrors['studentPassword'] &&
    (!isMinor || (!fieldErrors['guardianName'] && !fieldErrors['guardianEmail']))
  );

  const validateField = (fieldId: string, val: string): string | null => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return 'empty field error';
    }

    // Email fields: valid email check
    if (emailFields.includes(fieldId)) {
      if (!isValidEmail(trimmed)) {
        return 'enter a valid email address';
      }
    }

    // Password field: 6-11 characters, combination of letters, numbers, and at least 1 special character
    if (fieldId === 'studentPassword') {
      if (!isValidPassword(trimmed)) {
        return 'wrong details';
      }
    }

    // School / Academy Name field: length should be above 3 characters
    if (fieldId === 'schoolName') {
      if (trimmed.length <= 3) {
        return 'structure error';
      }
    }

    // Country field: length should not fall below 2 characters
    if (fieldId === 'country') {
      if (trimmed.length < 2) {
        return 'structure error';
      }
    }

    // School Join Code field: format must always be string-string-number with max lengths 6-4-4
    if (['generatedCode', 'inputCode'].includes(fieldId)) {
      if (!isValidSchoolJoinCode(trimmed)) {
        return 'wrong details';
      }
    }

    // Name field: length should be at least 3 characters and must have 2 words or names separated by an empty string
    if (['ownerName', 'studentName', 'guardianName'].includes(fieldId)) {
      const words = trimmed.split(/\s+/).filter(Boolean);
      if (trimmed.length < 3 || words.length < 2) {
        return 'structure error';
      }
    }

    return null;
  };

  const handleBlur = (fieldId: string, val: string) => {
    if (fieldId === 'studentPassword') {
      if (!val || !val.trim()) {
        setFieldErrors((prev) => ({ ...prev, [fieldId]: 'empty field error' }));
      } else if (!isValidPassword(val)) {
        setFieldErrors((prev) => ({ ...prev, [fieldId]: 'wrong details' }));
      } else {
        setFieldErrors((prev) => {
          if (!prev[fieldId]) return prev;
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
      }
      return;
    }

    if (['generatedCode', 'inputCode'].includes(fieldId)) {
      if (!val || !val.trim()) {
        setFieldErrors((prev) => ({ ...prev, [fieldId]: 'empty field error' }));
      } else if (!isValidSchoolJoinCode(val)) {
        setFieldErrors((prev) => ({ ...prev, [fieldId]: 'wrong details' }));
      } else {
        setFieldErrors((prev) => {
          if (!prev[fieldId]) return prev;
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
      }
      return;
    }

    if (fieldId === 'guardianEmail' && (!isMinor || !val.trim()) && !fieldErrors['guardianEmail']) {
      return;
    }

    if (emailFields.includes(fieldId)) {
      if (!val || !val.trim()) {
        const existing = fieldErrors[fieldId];
        const msg = existing === 'enter a valid email address' ? 'enter a valid email address' : 'empty field error';
        setFieldErrors((prev) => ({ ...prev, [fieldId]: msg }));
      } else if (!isValidEmail(val)) {
        setFieldErrors((prev) => ({ ...prev, [fieldId]: 'enter a valid email address' }));
      } else {
        setFieldErrors((prev) => {
          if (!prev[fieldId]) return prev;
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
      }
      return;
    }

    const err = validateField(fieldId, val);
    if (err) {
      setFieldErrors((prev) => ({ ...prev, [fieldId]: err }));
    } else {
      setFieldErrors((prev) => {
        if (!prev[fieldId]) return prev;
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleInputChange = (fieldId: string, val: string, setter: (v: string) => void) => {
    setter(val);

    // Real-time password validation: 6-11 characters, combination of letters, numbers, and at least 1 special char
    if (fieldId === 'studentPassword') {
      if (val.trim() && !isValidPassword(val)) {
        setFieldErrors((prev) => ({ ...prev, [fieldId]: 'wrong details' }));
      } else {
        setFieldErrors((prev) => {
          if (!prev[fieldId]) return prev;
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
      }
      return;
    }

    // Real-time School Join Code validation: string-string-number (max lengths 6-4-4)
    if (['generatedCode', 'inputCode'].includes(fieldId)) {
      if (val.trim() && !isValidSchoolJoinCode(val)) {
        setFieldErrors((prev) => ({ ...prev, [fieldId]: 'wrong details' }));
      } else {
        setFieldErrors((prev) => {
          if (!prev[fieldId]) return prev;
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
      }
      return;
    }

    // Real-time email validation: persists until user enters a valid email address
    if (emailFields.includes(fieldId)) {
      if (fieldId === 'guardianEmail' && !isMinor && !val.trim()) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
        return;
      }

      if (!isValidEmail(val)) {
        setFieldErrors((prev) => ({ ...prev, [fieldId]: 'enter a valid email address' }));
      } else {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
      }
      return;
    }

    if (fieldErrors[fieldId]) {
      const err = validateField(fieldId, val);
      if (!err) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
      } else {
        setFieldErrors((prev) => ({ ...prev, [fieldId]: err }));
      }
    }
  };

  // Directory state
  const [directorySchools, setDirectorySchools] = useState<DirectorySchool[]>([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);

  // Fetch accredited schools when opening directory modal
  useEffect(() => {
    if (isDirectoryModalOpen) {
      setIsLoadingDirectory(true);
      fetch('/api/schools/directory')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.schools)) {
            setDirectorySchools(data.schools);
          }
        })
        .catch(() => {
          // Graceful fallback to static demo list
        })
        .finally(() => {
          setIsLoadingDirectory(false);
        });
    }
  }, [isDirectoryModalOpen]);

  // Handle Dojo Registration (Persists to Database via API)
  const handleRegisterSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const eSchool = validateField('schoolName', schoolName);
    if (eSchool) errors['schoolName'] = eSchool;

    const eCode = validateField('generatedCode', generatedCode);
    if (eCode) errors['generatedCode'] = eCode;

    const eCountry = validateField('country', country);
    if (eCountry) errors['country'] = eCountry;

    const eOwner = validateField('ownerName', ownerName);
    if (eOwner) errors['ownerName'] = eOwner;

    const eEmail = validateField('ownerEmail', ownerEmail);
    if (eEmail) errors['ownerEmail'] = eEmail;

    if (Object.keys(errors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      const fieldIdMap: Record<string, string> = {
        schoolName: 'reg-school-name',
        discipline: 'reg-discipline',
        generatedCode: 'reg-code',
        country: 'reg-country',
        timezone: 'reg-timezone',
        ownerName: 'reg-owner-name',
        ownerEmail: 'reg-owner-email'
      };
      const firstError = Object.keys(errors)[0];
      const targetId = fieldIdMap[firstError];
      if (targetId) setTimeout(() => document.getElementById(targetId)?.focus(), 50);
      return;
    }

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

    try {
      setIsSubmitting(true);
      setFormFeedback('Persisting school tenant to database...');

      const response = await fetch('/api/schools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName,
          discipline,
          ownerFullName: ownerName,
          ownerEmail,
          city,
          country,
          timezone,
          customCode: generatedCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register school tenant');
      }

      // Update active tenant state with verified DB record
      setActiveSchool(data.school);
      setFormFeedback(`Dojo tenant "${data.school.name}" successfully registered in database! Code: ${data.school.registration_code}`);

      setTimeout(() => {
        setRegisterModalOpen(false);
        setFormFeedback(null);
        setRegTermsAccepted(false);
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Database error registering school tenant';
      setFormFeedback(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Student Join with Code (Persists to Database via API)
  const handleJoinSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const eCode = validateField('inputCode', inputCode);
    if (eCode) errors['inputCode'] = eCode;

    const eStudent = validateField('studentName', studentName);
    if (eStudent) errors['studentName'] = eStudent;

    const eEmail = validateField('studentEmail', studentEmail);
    if (eEmail) errors['studentEmail'] = eEmail;

    const ePassword = validateField('studentPassword', studentPassword);
    if (ePassword) errors['studentPassword'] = ePassword;

    if (isMinor) {
      const eGuardian = validateField('guardianName', guardianName);
      if (eGuardian) errors['guardianName'] = eGuardian;

      if (guardianEmail.trim()) {
        const eGuardEmail = validateField('guardianEmail', guardianEmail);
        if (eGuardEmail) errors['guardianEmail'] = eGuardEmail;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      const fieldIdMap: Record<string, string> = {
        inputCode: 'join-code',
        studentName: 'join-student-name',
        studentEmail: 'join-student-email',
        studentPassword: 'join-password',
        guardianName: 'join-guardian-name',
        guardianEmail: 'join-guardian-email'
      };
      const firstError = Object.keys(errors)[0];
      const targetId = fieldIdMap[firstError];
      if (targetId) setTimeout(() => document.getElementById(targetId)?.focus(), 50);
      return;
    }

    const normalizedCode = inputCode.trim().toUpperCase();

    const result = studentJoinCodeSchema.safeParse({
      registrationCode: normalizedCode,
      studentFullName: studentName.trim(),
      studentEmail: studentEmail.trim(),
      password: studentPassword.trim(),
      isMinor,
      guardianFullName: isMinor ? guardianName.trim() : undefined,
      guardianEmail: isMinor && guardianEmail.trim() ? guardianEmail.trim() : undefined
    });

    if (!result.success) {
      setFormFeedback(result.error.issues[0]?.message || 'Invalid join parameters');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormFeedback('Verifying registration code in database...');

      const response = await fetch('/api/students/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationCode: normalizedCode,
          studentFullName: studentName.trim(),
          studentEmail: studentEmail.trim(),
          password: studentPassword.trim(),
          isMinor,
          guardianFullName: isMinor ? guardianName.trim() : undefined,
          guardianEmail: isMinor && guardianEmail.trim() ? guardianEmail.trim() : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit join request');
      }

      // Sync with tenant context
      registerPendingStudent({
        studentFullName: studentName.trim(),
        studentEmail: studentEmail.trim(),
        isMinor,
        guardianFullName: isMinor ? guardianName.trim() : undefined,
        guardianEmail: isMinor && guardianEmail.trim() ? guardianEmail.trim() : undefined
      });

      setFormFeedback(
        `Registration code verified! Enrolled in "${data.schoolName}". Status: PENDING_APPROVAL. Roster and technique reads are locked until coach sign-off.`
      );

      setTimeout(() => {
        setJoinModalOpen(false);
        setFormFeedback(null);
        setInputCode('');
        setStudentName('');
        setStudentEmail('');
        setStudentPassword('');
        setShowJoinPassword(false);
        setIsMinor(false);
        setGuardianName('');
        setGuardianEmail('');
        setJoinTermsAccepted(false);
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Database error processing join request';
      setFormFeedback(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <head>
        <title>Dashboard</title>
        <link rel="canonical" href="https://belttrack.app" />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <meta name="keywords" content="martial arts management, dojo software, bjj belt tracker, roll call attendance, private dojo tenant" />
      </head>

      <TopNav
        onOpenDirectory={() => setDirectoryModalOpen(true)}
        onOpenRegister={() => setRegisterModalOpen(true)}
        onOpenJoin={() => setJoinModalOpen(true)}
        onOpenLogin={() => setLoginModalOpen(true)}
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
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setTermsModalOpen(true)}
              className="text-tertiary underline underline-offset-2 hover:text-primary transition-colors cursor-pointer"
            >
              Terms &amp; Conditions
            </button>
            <p>
              Strict Multi-Tenancy • Zero Monetization Core • Self-Contained Source of Truth
            </p>
          </div>
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
          <div ref={registerModalRef} className="w-full max-w-lg p-4 sm:p-6 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-hard-2 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-label text-xs font-bold text-tertiary uppercase">Tenant Creation</span>
                <h3 id="title-register-modal" className="font-headline text-xl font-bold text-primary">Register Martial Arts School</h3>
              </div>
              <button
                type="button"
                onClick={() => { setRegisterModalOpen(false); setRegTermsAccepted(false); }}
                className="text-surface-on-variant hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded p-1"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSchool} className="space-y-4">
              <div>
                <label htmlFor="reg-school-name" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                  School / Academy Name <span aria-hidden="true" className="text-error ml-0.5">*</span>
                  <span className="sr-only"> (required)</span>
                </label>
                <input
                  type="text"
                  id="reg-school-name"
                  name="schoolName"
                  required
                  aria-required="true"
                  aria-invalid={Boolean(fieldErrors['schoolName'])}
                  aria-describedby={fieldErrors['schoolName'] ? 'err-reg-school-name' : undefined}
                  value={schoolName}
                  onChange={(e) => handleInputChange('schoolName', e.target.value, setSchoolName)}
                  onBlur={() => handleBlur('schoolName', schoolName)}
                  className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${fieldErrors['schoolName'] ? 'border-error' : 'border-outline-variant'}`}
                />
                <InlineFieldError id="err-reg-school-name" message={fieldErrors['schoolName']} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-discipline" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                    Discipline <span aria-hidden="true" className="text-error ml-0.5">*</span>
                    <span className="sr-only"> (required)</span>
                  </label>
                  <select
                    id="reg-discipline"
                    name="discipline"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors['discipline'])}
                    aria-describedby={fieldErrors['discipline'] ? 'err-reg-discipline' : undefined}
                    value={discipline}
                    onChange={(e) => {
                      setDiscipline(e.target.value as DisciplineType);
                      if (fieldErrors['discipline']) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next['discipline'];
                          return next;
                        });
                      }
                    }}
                    onBlur={() => handleBlur('discipline', discipline)}
                    className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${fieldErrors['discipline'] ? 'border-error' : 'border-outline-variant'}`}
                  >
                    <option value="brazilian_jiu_jitsu">Brazilian Jiu-Jitsu</option>
                    <option value="judo">Judo</option>
                    <option value="karate">Karate</option>
                    <option value="taekwondo">Taekwondo</option>
                    <option value="muay_thai">Muay Thai</option>
                    <option value="krav_maga">Krav Maga</option>
                  </select>
                  <InlineFieldError id="err-reg-discipline" message={fieldErrors['discipline']} />
                </div>

                <div>
                  <label htmlFor="reg-code" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                    School Join Code <span aria-hidden="true" className="text-error ml-0.5">*</span>
                    <span className="sr-only"> (required)</span>
                  </label>
                  <input
                    type="text"
                    id="reg-code"
                    name="generatedCode"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors['generatedCode'])}
                    aria-describedby={fieldErrors['generatedCode'] ? 'err-reg-code' : undefined}
                    value={generatedCode}
                    onChange={(e) => handleInputChange('generatedCode', e.target.value.toUpperCase(), setGeneratedCode)}
                    onBlur={() => handleBlur('generatedCode', generatedCode)}
                    className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-label text-sm uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${fieldErrors['generatedCode'] ? 'border-error' : 'border-outline-variant'}`}
                  />
                  <InlineFieldError id="err-reg-code" message={fieldErrors['generatedCode']} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-country" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                    Country <span aria-hidden="true" className="text-error ml-0.5">*</span>
                    <span className="sr-only"> (required)</span>
                  </label>
                  <input
                    type="text"
                    id="reg-country"
                    name="country"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors['country'])}
                    aria-describedby={fieldErrors['country'] ? 'err-reg-country' : undefined}
                    value={country}
                    onChange={(e) => handleInputChange('country', e.target.value, setCountry)}
                    onBlur={() => handleBlur('country', country)}
                    className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${fieldErrors['country'] ? 'border-error' : 'border-outline-variant'}`}
                  />
                  <InlineFieldError id="err-reg-country" message={fieldErrors['country']} />
                </div>
                <div>
                  <label htmlFor="reg-timezone" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                    Operating Timezone <span aria-hidden="true" className="text-error ml-0.5">*</span>
                    <span className="sr-only"> (required)</span>
                  </label>
                  <select
                    id="reg-timezone"
                    name="timezone"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors['timezone'])}
                    aria-describedby={fieldErrors['timezone'] ? 'err-reg-timezone' : undefined}
                    value={timezone}
                    onChange={(e) => {
                      setTimezone(e.target.value);
                      if (fieldErrors['timezone']) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next['timezone'];
                          return next;
                        });
                      }
                    }}
                    onBlur={() => handleBlur('timezone', timezone)}
                    className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${fieldErrors['timezone'] ? 'border-error' : 'border-outline-variant'}`}
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
                  <InlineFieldError id="err-reg-timezone" message={fieldErrors['timezone']} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-owner-name" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                    Head Coach Name <span aria-hidden="true" className="text-error ml-0.5">*</span>
                    <span className="sr-only"> (required)</span>
                  </label>
                  <input
                    type="text"
                    id="reg-owner-name"
                    name="ownerName"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors['ownerName'])}
                    aria-describedby={fieldErrors['ownerName'] ? 'err-reg-owner-name' : undefined}
                    value={ownerName}
                    onChange={(e) => handleInputChange('ownerName', e.target.value, setOwnerName)}
                    onBlur={() => handleBlur('ownerName', ownerName)}
                    className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${fieldErrors['ownerName'] ? 'border-error' : 'border-outline-variant'}`}
                  />
                  <InlineFieldError id="err-reg-owner-name" message={fieldErrors['ownerName']} />
                </div>
                <div>
                  <label htmlFor="reg-owner-email" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                    Owner Email <span aria-hidden="true" className="text-error ml-0.5">*</span>
                    <span className="sr-only"> (required)</span>
                  </label>
                  <input
                    type="email"
                    id="reg-owner-email"
                    name="ownerEmail"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors['ownerEmail'])}
                    aria-describedby={fieldErrors['ownerEmail'] ? 'err-reg-owner-email' : undefined}
                    value={ownerEmail}
                    onChange={(e) => handleInputChange('ownerEmail', e.target.value, setOwnerEmail)}
                    onBlur={() => handleBlur('ownerEmail', ownerEmail)}
                    className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${fieldErrors['ownerEmail'] ? 'border-error' : 'border-outline-variant'}`}
                  />
                  <InlineFieldError id="err-reg-owner-email" message={fieldErrors['ownerEmail']} />
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="reg-terms-check"
                  name="terms"
                  checked={regTermsAccepted}
                  onChange={(e) => setRegTermsAccepted(e.target.checked)}
                  required
                  aria-required="true"
                  className="mt-1 rounded border-outline-variant text-primary focus:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary cursor-pointer"
                />
                <label htmlFor="reg-terms-check" className="font-body text-xs text-surface-on-variant cursor-pointer">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setTermsModalOpen(true)}
                    className="text-tertiary underline underline-offset-2 hover:text-primary transition-colors cursor-pointer"
                  >
                    Terms &amp; Conditions
                  </button>{' '}
                  and acknowledge BeltTrack is an offline, non-custodial single source of truth with strict tenant isolation.
                </label>
              </div>

              {formFeedback && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-2 rounded-[10px] bg-tertiary-container text-tertiary-on-container font-body text-xs font-medium"
                >
                  {formFeedback}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !isRegisterFormValid}
                  className="w-full py-2 px-4 rounded-[10px] bg-primary text-primary-foreground font-label text-xs font-medium hover:bg-tertiary hover:shadow-soft transition-all duration-[600ms] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
                >
                  {isSubmitting ? 'Registering...' : 'Create Dojo Tenant'}
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
          <div ref={joinModalRef} className="w-full max-w-md p-4 sm:p-6 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-hard-2 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-label text-xs font-bold text-tertiary uppercase">Member Onboarding</span>
                <h3 id="title-join-modal" className="font-headline text-xl font-bold text-primary">Join Dojo with School Join Code</h3>
              </div>
              <button
                type="button"
                onClick={() => { setJoinModalOpen(false); setShowJoinPassword(false); setJoinTermsAccepted(false); }}
                className="text-surface-on-variant hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded p-1"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinSchool} className="space-y-4">
              <div>
                <label htmlFor="join-code" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                  School Join Code <span aria-hidden="true" className="text-error ml-0.5">*</span>
                  <span className="sr-only"> (required)</span>
                </label>
                <input
                  type="text"
                  id="join-code"
                  name="inputCode"
                  required
                  aria-required="true"
                  aria-invalid={Boolean(fieldErrors['inputCode'])}
                  aria-describedby={fieldErrors['inputCode'] ? 'err-join-code desc-join-code' : 'desc-join-code'}
                  placeholder="e.g. KAIZEN-BJJ-2026"
                  value={inputCode}
                  onChange={(e) => handleInputChange('inputCode', e.target.value.toUpperCase(), setInputCode)}
                  onBlur={() => handleBlur('inputCode', inputCode)}
                  className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-label text-sm uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${fieldErrors['inputCode'] ? 'border-error' : 'border-outline-variant'}`}
                />
                <InlineFieldError id="err-join-code" message={fieldErrors['inputCode']} />
                <span id="desc-join-code" className="font-body text-xs text-surface-on-variant mt-1 block">
                  Ask your head coach or academy front desk for this code.
                </span>
              </div>

              <div>
                <label htmlFor="join-student-name" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                  Student Full Name <span aria-hidden="true" className="text-error ml-0.5">*</span>
                  <span className="sr-only"> (required)</span>
                </label>
                <input
                  type="text"
                  id="join-student-name"
                  name="studentName"
                  required
                  aria-required="true"
                  aria-invalid={Boolean(fieldErrors['studentName'])}
                  aria-describedby={fieldErrors['studentName'] ? 'err-join-student-name' : undefined}
                  placeholder="e.g. Lucas Silva"
                  value={studentName}
                  onChange={(e) => handleInputChange('studentName', e.target.value, setStudentName)}
                  onBlur={() => handleBlur('studentName', studentName)}
                  className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${fieldErrors['studentName'] ? 'border-error' : 'border-outline-variant'}`}
                />
                <InlineFieldError id="err-join-student-name" message={fieldErrors['studentName']} />
              </div>

              <div>
                <label htmlFor="join-student-email" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                  Email Address <span aria-hidden="true" className="text-error ml-0.5">*</span>
                  <span className="sr-only"> (required)</span>
                </label>
                <input
                  type="email"
                  id="join-student-email"
                  name="studentEmail"
                  required
                  aria-required="true"
                  aria-invalid={Boolean(fieldErrors['studentEmail'])}
                  aria-describedby={fieldErrors['studentEmail'] ? 'err-join-student-email' : undefined}
                  placeholder="e.g. lucas@example.com"
                  value={studentEmail}
                  onChange={(e) => handleInputChange('studentEmail', e.target.value, setStudentEmail)}
                  onBlur={() => handleBlur('studentEmail', studentEmail)}
                  className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${fieldErrors['studentEmail'] ? 'border-error' : 'border-outline-variant'}`}
                />
                <InlineFieldError id="err-join-student-email" message={fieldErrors['studentEmail']} />
              </div>

              <div>
                <label htmlFor="join-password" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                  Password <span aria-hidden="true" className="text-error ml-0.5">*</span>
                  <span className="sr-only"> (required)</span>
                </label>
                <div className="relative">
                  <input
                    type={showJoinPassword ? 'text' : 'password'}
                    id="join-password"
                    name="studentPassword"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors['studentPassword'])}
                    aria-describedby={
                      [
                        fieldErrors['studentPassword'] ? 'err-join-password' : null,
                        studentPassword.length > 0 ? 'desc-join-password' : null
                      ].filter(Boolean).join(' ') || undefined
                    }
                    placeholder="e.g. Pass123!"
                    value={studentPassword}
                    onChange={(e) => handleInputChange('studentPassword', e.target.value, setStudentPassword)}
                    onBlur={() => handleBlur('studentPassword', studentPassword)}
                    className={`w-full pl-3 pr-10 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${fieldErrors['studentPassword'] ? 'border-error' : 'border-outline-variant'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowJoinPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-on-variant hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded p-1 transition-colors"
                    aria-label={showJoinPassword ? 'Hide password' : 'Show password'}
                    title={showJoinPassword ? 'Hide password' : 'Show password'}
                  >
                    {showJoinPassword ? (
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <InlineFieldError id="err-join-password" message={fieldErrors['studentPassword']} />
                {studentPassword.length > 0 && (
                  <span id="desc-join-password" className="font-body text-xs text-surface-on-variant mt-1 block">
                    6-11 characters, combination of letters, numbers, and at least 1 special character.
                  </span>
                )}
              </div>

              {/* MINOR STUDENT TOGGLE */}
              <div className="pt-1">
                <div className="flex items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    id="checkbox-is-minor"
                    name="isMinor"
                    checked={isMinor}
                    onChange={(e) => {
                      setIsMinor(e.target.checked);
                      if (!e.target.checked) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next['guardianName'];
                          delete next['guardianEmail'];
                          return next;
                        });
                      }
                    }}
                    className="h-4 w-4 rounded border-outline-variant bg-surface-container-low text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
                  />
                  <label htmlFor="checkbox-is-minor" className="font-title text-xs font-semibold text-surface-foreground cursor-pointer">
                    Student is under 18 years old (Minor enrollment)
                  </label>
                </div>
              </div>

              {/* GUARDIAN FIELDS (CONDITIONALLY SHOWN FOR MINORS) */}
              {isMinor && (
                <div className="space-y-3 p-3 rounded-[10px] bg-surface-container-low border border-outline-variant">
                  <div>
                    <span className="font-label text-xs font-bold text-tertiary uppercase block">
                      Parent / Guardian Information
                    </span>
                    <span className="font-body text-xs text-surface-on-variant block">
                      Required for linking guardian read-only progress views.
                    </span>
                  </div>

                  <div>
                    <label htmlFor="join-guardian-name" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                      Guardian Full Name <span aria-hidden="true" className="text-error ml-0.5">*</span>
                      <span className="sr-only"> (required)</span>
                    </label>
                    <input
                      type="text"
                      id="join-guardian-name"
                      name="guardianName"
                      required={isMinor}
                      aria-required={isMinor ? 'true' : undefined}
                      aria-invalid={Boolean(fieldErrors['guardianName'])}
                      aria-describedby={fieldErrors['guardianName'] ? 'err-join-guardian-name' : undefined}
                      placeholder="e.g. Roberto Silva"
                      value={guardianName}
                      onChange={(e) => handleInputChange('guardianName', e.target.value, setGuardianName)}
                      onBlur={() => handleBlur('guardianName', guardianName)}
                      className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-lowest border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest ${fieldErrors['guardianName'] ? 'border-error' : 'border-outline-variant'}`}
                    />
                    <InlineFieldError id="err-join-guardian-name" message={fieldErrors['guardianName']} />
                  </div>

                  <div>
                    <label htmlFor="join-guardian-email" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                      Guardian Email Address
                    </label>
                    <input
                      type="email"
                      id="join-guardian-email"
                      name="guardianEmail"
                      aria-invalid={Boolean(fieldErrors['guardianEmail'])}
                      aria-describedby={fieldErrors['guardianEmail'] ? 'err-join-guardian-email' : undefined}
                      placeholder="e.g. roberto@example.com"
                      value={guardianEmail}
                      onChange={(e) => handleInputChange('guardianEmail', e.target.value, setGuardianEmail)}
                      onBlur={() => handleBlur('guardianEmail', guardianEmail)}
                      className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-lowest border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest ${fieldErrors['guardianEmail'] ? 'border-error' : 'border-outline-variant'}`}
                    />
                    <InlineFieldError id="err-join-guardian-email" message={fieldErrors['guardianEmail']} />
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="join-terms-check"
                  name="terms"
                  checked={joinTermsAccepted}
                  onChange={(e) => setJoinTermsAccepted(e.target.checked)}
                  required
                  aria-required="true"
                  className="mt-1 rounded border-outline-variant text-primary focus:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary cursor-pointer"
                />
                <label htmlFor="join-terms-check" className="font-body text-xs text-surface-on-variant cursor-pointer">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setTermsModalOpen(true)}
                    className="text-tertiary underline underline-offset-2 hover:text-primary transition-colors cursor-pointer"
                  >
                    Terms &amp; Conditions
                  </button>{' '}
                  and acknowledge that physical martial arts carries inherent risks and membership requires coach sign-off.
                </label>
              </div>

              {formFeedback && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-2 rounded-[10px] bg-tertiary-container text-tertiary-on-container font-body text-xs font-medium"
                >
                  {formFeedback}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !isJoinFormValid}
                  className="w-full py-2 px-4 rounded-[10px] bg-primary text-primary-foreground font-label text-xs font-medium hover:bg-tertiary hover:shadow-soft transition-all duration-[600ms] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
                >
                  {isSubmitting ? 'Verifying...' : 'Verify & Join'}
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
          <div ref={directoryModalRef} className="w-full max-w-lg p-4 sm:p-6 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-hard-2 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-label text-xs font-bold text-tertiary uppercase">Public Directory</span>
                <h3 id="title-directory-modal" className="font-headline text-xl font-bold text-primary">Accredited Martial Arts Dojos</h3>
              </div>
              <button
                type="button"
                onClick={() => setDirectoryModalOpen(false)}
                className="text-surface-on-variant hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded p-1"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <p className="font-body text-xs text-surface-on-variant mb-4">
              Verified martial arts schools. Private student rosters and attendance records remain strictly isolated.
            </p>

            <div className="space-y-2 mb-4 font-body text-xs max-h-72 overflow-y-auto">
              {isLoadingDirectory ? (
                <div className="p-4 text-center text-surface-on-variant font-medium">
                  Loading verified schools from database...
                </div>
              ) : directorySchools.length > 0 ? (
                directorySchools.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-[10px] bg-surface-container-low border border-outline-variant flex flex-wrap justify-between items-center gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-title font-semibold text-primary block break-words">{s.name}</span>
                      <span className="text-surface-on-variant capitalize break-words">
                        {s.city} • {s.discipline.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="font-label text-xs font-bold text-primary bg-primary-container px-2 py-0.5 rounded flex-shrink-0">
                      {s.joinCode}
                    </span>
                  </div>
                ))
              ) : (
                <>
                  <div className="p-3 rounded-[10px] bg-surface-container-low border border-outline-variant flex flex-wrap justify-between items-center gap-2">
                    <div className="min-w-0">
                      <span className="font-title font-semibold text-primary block break-words">Kaizen BJJ Academy</span>
                      <span className="text-surface-on-variant break-words">London, United Kingdom • Brazilian Jiu-Jitsu</span>
                    </div>
                    <span className="font-label text-xs font-bold text-primary bg-primary-container px-2 py-0.5 rounded flex-shrink-0">
                      KAIZEN-2026
                    </span>
                  </div>

                  <div className="p-3 rounded-[10px] bg-surface-container-low border border-outline-variant flex flex-wrap justify-between items-center gap-2">
                    <div className="min-w-0">
                      <span className="font-title font-semibold text-primary block break-words">Kodokan Judo Institute Hub</span>
                      <span className="text-surface-on-variant break-words">Tokyo, Japan • Traditional Judo</span>
                    </div>
                    <span className="font-label text-xs font-bold text-primary bg-primary-container px-2 py-0.5 rounded flex-shrink-0">
                      KODOKAN-77
                    </span>
                  </div>

                  <div className="p-3 rounded-[10px] bg-surface-container-low border border-outline-variant flex flex-wrap justify-between items-center gap-2">
                    <div className="min-w-0">
                      <span className="font-title font-semibold text-primary block break-words">Apex Taekwondo Academy</span>
                      <span className="text-surface-on-variant break-words">Seoul, South Korea • WT Taekwondo</span>
                    </div>
                    <span className="font-label text-xs font-bold text-primary bg-primary-container px-2 py-0.5 rounded flex-shrink-0">
                      APEX-TKD
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: LOGIN */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSwitchToRegister={() => setRegisterModalOpen(true)}
        onSwitchToJoin={() => setJoinModalOpen(true)}
      />

      {/* MODAL 4: TERMS & CONDITIONS */}
      {isTermsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="title-terms-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface bg-opacity-60 backdrop-blur-sm"
        >
          <div ref={termsModalRef} className="w-full max-w-lg p-4 sm:p-6 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-hard-2 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <div>
                <span className="font-label text-xs font-bold text-tertiary uppercase tracking-wider">Legal &amp; Platform Governance</span>
                <h3 id="title-terms-modal" className="font-headline text-xl font-bold text-primary">Terms &amp; Conditions</h3>
              </div>
              <button
                type="button"
                onClick={() => setTermsModalOpen(false)}
                className="text-surface-on-variant hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded p-1"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto my-4 pr-2 space-y-4 font-body text-xs text-surface-on-variant">
              <section className="space-y-1">
                <h4 className="font-title text-xs font-bold text-primary">1. Single Source of Truth &amp; Platform Purpose</h4>
                <p>
                  BeltTrack operates as a closed, private single source of truth for martial arts school curriculum, belt promotion eligibility, mat attendance, and immutable internal ledger records. The software facilitates administrative recording and provides progress transparency between dojo operators, instructors, adult students, and guardians.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="font-title text-xs font-bold text-primary">2. Zero-Monetization &amp; Offline Settlement Disclaimer</h4>
                <p>
                  BeltTrack maintains a zero-monetization architecture. The platform does not process payments, integrate payment gateways, hold customer funds, or charge subscription cuts. All tuition, membership dues, and belt testing fees are settled offline directly with your martial arts academy. Receipts generated within the application serve strictly as non-custodial administrative accounting ledger records.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="font-title text-xs font-bold text-primary">3. Strict Multi-Tenant Data Isolation</h4>
                <p>
                  Every academy operates within an isolated tenant partition identified by a unique school code. Member rosters, attendance logs, and curriculum progress are strictly inaccessible to cross-tenant entities, public users, or unauthenticated parties. The public directory publishes only verified academy name, slug, city, and discipline.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="font-title text-xs font-bold text-primary">4. Martial Arts Physical Activity Liability Release</h4>
                <p>
                  Martial arts disciplines (including Brazilian Jiu-Jitsu, Judo, Muay Thai, Karate, and Taekwondo) involve physical contact, strenuous exertion, and inherent risks of bodily injury. BeltTrack is solely an administrative tool and does not provide athletic or medical guidance. Students and guardians assume all physical risks associated with participation at their respective academies.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="font-title text-xs font-bold text-primary">5. Minor Dependent Supervision &amp; Guardian Consent</h4>
                <p>
                  Accounts for student practitioners under the age of 18 must be linked to a responsible parent or legal guardian. Guardians retain read-only visibility over dependent attendance, promotion criteria, and tuition records. BeltTrack does not market directly to minors or collect unsolicited personal information from children.
                </p>
              </section>
            </div>

            <div className="pt-3 border-t border-outline-variant flex justify-end">
              <button
                type="button"
                onClick={() => setTermsModalOpen(false)}
                className="py-2 px-6 rounded-[10px] bg-primary text-primary-foreground font-label text-xs font-medium hover:bg-tertiary hover:shadow-soft transition-all duration-[600ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
              >
                I Understand &amp; Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
