'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TopNav } from '@/components/layout/top-nav';
import { HeroSection } from '@/components/home/hero-section';
import { RoleEntryCards } from '@/components/home/role-entry-cards';
import { PreviewDashboard } from '@/components/home/preview-dashboard';
import { LoginModal } from '@/components/home/login-modal';
import { StudentJoinModal } from '@/components/home/student-join-modal';
import { useAccessibleModal } from '@/components/home/use-accessible-modal';
import { useTenant } from '@/context/tenant-context';
import { useAuth } from '@/context/auth-context';
import { schoolRegistrationSchema, studentJoinCodeSchema } from '@/lib/validation/schemas';
import { calculatePasswordStrength } from '@/lib/validation/password';
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
  const { login, setSessionUser, isRealSession } = useAuth();
  const [isRegisterModalOpen, setRegisterModalOpen] = useState(false);
  const [isJoinModalOpen, setJoinModalOpen] = useState(false);
  const [isDirectoryModalOpen, setDirectoryModalOpen] = useState(false);
  const [isTermsModalOpen, setTermsModalOpen] = useState(false);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);

  const handleCloseRegister = useCallback(() => setRegisterModalOpen(false), []);
  const handleCloseJoin = useCallback(() => setJoinModalOpen(false), []);
  const handleCloseDirectory = useCallback(() => setDirectoryModalOpen(false), []);
  const handleCloseTerms = useCallback(() => setTermsModalOpen(false), []);
  const handleCloseLogin = useCallback(() => setLoginModalOpen(false), []);

  const registerModalRef = useAccessibleModal(isRegisterModalOpen, handleCloseRegister, '#btn-open-register');
  const directoryModalRef = useAccessibleModal(isDirectoryModalOpen, handleCloseDirectory, '#btn-open-directory');
  const termsModalRef = useAccessibleModal(isTermsModalOpen, handleCloseTerms, '#btn-open-terms');

  // Form states
  const [schoolName, setSchoolName] = useState('Vance Gracie Jiu-Jitsu');
  const [discipline, setDiscipline] = useState<DisciplineType>('brazilian_jiu_jitsu');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('United Kingdom');
  const [timezone, setTimezone] = useState('UTC');
  const [ownerName, setOwnerName] = useState('Marcus Vance');
  const [ownerEmail, setOwnerEmail] = useState('marcus@vancebjj.com');
  const [ownerPassword, setOwnerPassword] = useState('Kaizen#Belt9824$BJJ');
  const [ownerConfirmPassword, setOwnerConfirmPassword] = useState('Kaizen#Belt9824$BJJ');
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [showOwnerConfirmPassword, setShowOwnerConfirmPassword] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('VANCE-BJJ-2026');

  const [regTermsAccepted, setRegTermsAccepted] = useState(false);
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const ownerStrength = calculatePasswordStrength(ownerPassword);

  const isValidEmail = (email: string) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test((email || '').trim());

  const isValidSchoolJoinCode = (code: string) =>
    /^[A-Za-z]{1,6}-[A-Za-z]{1,4}-[0-9]{1,4}$/.test((code || '').trim());

  const isValidPassword = (pw: string) =>
    (pw || '').length >= 15 && (pw || '').length <= 128;

  const emailFields = ['ownerEmail'];

  const isRegisterFormValid = Boolean(
    regTermsAccepted &&
    schoolName.trim().length > 3 &&
    discipline &&
    isValidSchoolJoinCode(generatedCode) &&
    city.trim().length >= 2 &&
    country.trim().length >= 2 &&
    timezone &&
    ownerName.trim().length >= 3 &&
    ownerName.trim().split(/\s+/).filter(Boolean).length >= 2 &&
    isValidEmail(ownerEmail) &&
    isValidPassword(ownerPassword) &&
    ownerConfirmPassword &&
    ownerPassword === ownerConfirmPassword &&
    !fieldErrors['schoolName'] &&
    !fieldErrors['discipline'] &&
    !fieldErrors['generatedCode'] &&
    !fieldErrors['city'] &&
    !fieldErrors['country'] &&
    !fieldErrors['timezone'] &&
    !fieldErrors['ownerName'] &&
    !fieldErrors['ownerEmail'] &&
    !fieldErrors['ownerPassword'] &&
    !fieldErrors['ownerConfirmPassword']
  );

  const validateField = (fieldId: string, val: string): string | null => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return 'empty field error';
    }

    // City field: length should not fall below 2 characters
    if (fieldId === 'city') {
      if (trimmed.length < 2) {
        return 'structure error';
      }
    }

    // Email fields: valid email check
    if (emailFields.includes(fieldId)) {
      if (!isValidEmail(trimmed)) {
        return 'enter a valid email address';
      }
    }

    // Password field: 15-128 characters, spaces and passphrases allowed
    if (fieldId === 'ownerPassword') {
      if (val.length < 15 || val.length > 128) {
        return 'Password must be between 15 and 128 characters';
      }
    }

    if (fieldId === 'ownerConfirmPassword') {
      if (val !== ownerPassword) {
        return 'Passwords do not match';
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
    if (fieldId === 'ownerPassword') {
      if (!val) {
        setFieldErrors((prev) => ({ ...prev, [fieldId]: 'empty field error' }));
      } else if (!isValidPassword(val)) {
        setFieldErrors((prev) => ({ ...prev, [fieldId]: 'Password must be between 15 and 128 characters' }));
      } else {
        setFieldErrors((prev) => {
          if (!prev[fieldId]) return prev;
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
      }
      if (ownerConfirmPassword && val !== ownerConfirmPassword) {
        setFieldErrors((prev) => ({ ...prev, ownerConfirmPassword: 'Passwords do not match' }));
      }
      return;
    }

    if (fieldId === 'ownerConfirmPassword') {
      if (!val) {
        setFieldErrors((prev) => ({ ...prev, [fieldId]: 'empty field error' }));
      } else if (val !== ownerPassword) {
        setFieldErrors((prev) => ({ ...prev, [fieldId]: 'Passwords do not match' }));
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

    // If an error is currently active for this field, clear it as soon as the input satisfies validation
    if (fieldErrors[fieldId]) {
      let isFixed = false;
      if (fieldId === 'ownerPassword') {
        isFixed = isValidPassword(val);
        if (ownerConfirmPassword && fieldErrors['ownerConfirmPassword'] && val === ownerConfirmPassword) {
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next['ownerConfirmPassword'];
            return next;
          });
        }
      } else if (fieldId === 'ownerConfirmPassword') {
        isFixed = val === ownerPassword;
      } else if (['generatedCode', 'inputCode'].includes(fieldId)) {
        isFixed = isValidSchoolJoinCode(val);
      } else if (emailFields.includes(fieldId)) {
        isFixed = isValidEmail(val);
      } else {
        isFixed = !validateField(fieldId, val);
      }

      if (isFixed) {
        setFieldErrors((prev) => {
          if (!prev[fieldId]) return prev;
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
      }
    }
  };

  const handleCodeInputChange = (
    fieldId: 'generatedCode' | 'inputCode',
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void
  ) => {
    const input = e.target;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const val = input.value.toUpperCase();
    setter(val);
    handleInputChange(fieldId, val, () => {});
    if (start !== null && end !== null) {
      requestAnimationFrame(() => {
        if (document.activeElement === input) {
          input.setSelectionRange(start, end);
        }
      });
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

    const eCity = validateField('city', city);
    if (eCity) errors['city'] = eCity;

    const eCountry = validateField('country', country);
    if (eCountry) errors['country'] = eCountry;

    const eOwner = validateField('ownerName', ownerName);
    if (eOwner) errors['ownerName'] = eOwner;

    const eEmail = validateField('ownerEmail', ownerEmail);
    if (eEmail) errors['ownerEmail'] = eEmail;

    const ePassword = validateField('ownerPassword', ownerPassword);
    if (ePassword) errors['ownerPassword'] = ePassword;

    const eConfirm = validateField('ownerConfirmPassword', ownerConfirmPassword);
    if (eConfirm) errors['ownerConfirmPassword'] = eConfirm;

    if (Object.keys(errors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      const fieldIdMap: Record<string, string> = {
        schoolName: 'reg-school-name',
        discipline: 'reg-discipline',
        generatedCode: 'reg-code',
        city: 'reg-city',
        country: 'reg-country',
        timezone: 'reg-timezone',
        ownerName: 'reg-owner-name',
        ownerEmail: 'reg-owner-email',
        ownerPassword: 'reg-owner-password',
        ownerConfirmPassword: 'reg-owner-confirm-password'
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
      password: ownerPassword,
      confirmPassword: ownerConfirmPassword,
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

      const normalizedOwnerEmail = ownerEmail.trim().toLowerCase();

      const response = await fetch('/api/schools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName,
          discipline,
          ownerFullName: ownerName,
          ownerEmail: normalizedOwnerEmail,
          password: ownerPassword,
          confirmPassword: ownerConfirmPassword,
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
      setFormFeedback(`Dojo tenant "${data.school.name}" successfully registered in database! Code: ${data.school.registration_code}. Authenticating session...`);

      // Automatically sign in the registered school owner with unverified email state
      setSessionUser({
        id: data.user?.id || 'usr_' + Date.now(),
        email: normalizedOwnerEmail,
        fullName: ownerName.trim(),
        school_id: data.school.id,
        supabase_uid: data.user?.supabaseUid || undefined,
        isEmailVerified: false
      }, 'owner', false);

      // Attempt automatic sign-in for owner
      try {
        await login(normalizedOwnerEmail, ownerPassword.trim());
      } catch {
        // Fallback: user can sign in via Login modal
      }

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
        {!isRealSession && (
          <RoleEntryCards
            onOpenRegister={() => setRegisterModalOpen(true)}
            onOpenJoin={() => setJoinModalOpen(true)}
          />
        )}
        {isRealSession && <PreviewDashboard />}
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-primary text-primary-foreground flex-shrink-0 flex items-center justify-center shadow-soft" aria-hidden="true">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="6" width="20" height="12" rx="4" />
                    <line x1="8" y1="6" x2="8" y2="18" />
                    <line x1="12" y1="6" x2="12" y2="18" strokeDasharray="2 2" />
                    <path d="M16 10l2 2-2 2" />
                  </svg>
                </div>
                <div>
                  <span className="font-label text-xs font-bold text-tertiary uppercase">Tenant Creation</span>
                  <h3 id="title-register-modal" className="font-headline text-xl font-bold text-primary">Register Martial Arts School</h3>
                </div>
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
                    onChange={(e) => handleCodeInputChange('generatedCode', e, setGeneratedCode)}
                    onBlur={() => handleBlur('generatedCode', generatedCode)}
                    className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-label text-sm uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${fieldErrors['generatedCode'] ? 'border-error' : 'border-outline-variant'}`}
                  />
                  <InlineFieldError id="err-reg-code" message={fieldErrors['generatedCode']} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-city" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                    City <span aria-hidden="true" className="text-error ml-0.5">*</span>
                    <span className="sr-only"> (required)</span>
                  </label>
                  <input
                    type="text"
                    id="reg-city"
                    name="city"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors['city'])}
                    aria-describedby={fieldErrors['city'] ? 'err-reg-city' : undefined}
                    placeholder="e.g. Tokyo, New York, London"
                    value={city}
                    onChange={(e) => handleInputChange('city', e.target.value, setCity)}
                    onBlur={() => handleBlur('city', city)}
                    className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${fieldErrors['city'] ? 'border-error' : 'border-outline-variant'}`}
                  />
                  <InlineFieldError id="err-reg-city" message={fieldErrors['city']} />
                </div>
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
                    placeholder="e.g. Japan, United States, UK"
                    value={country}
                    onChange={(e) => handleInputChange('country', e.target.value, setCountry)}
                    onBlur={() => handleBlur('country', country)}
                    className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${fieldErrors['country'] ? 'border-error' : 'border-outline-variant'}`}
                  />
                  <InlineFieldError id="err-reg-country" message={fieldErrors['country']} />
                </div>
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
                    <optgroup label="North America" className="bg-surface-container-low text-surface-foreground font-semibold">
                      <option value="America/New_York">America/New York (EST/EDT)</option>
                      <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                      <option value="America/Denver">America/Denver (MST/MDT)</option>
                      <option value="America/Phoenix">America/Phoenix (MST)</option>
                      <option value="America/Los_Angeles">America/Los Angeles (PST/PDT)</option>
                      <option value="America/Anchorage">America/Anchorage (AKST/AKDT)</option>
                      <option value="Pacific/Honolulu">Pacific/Honolulu (HST)</option>
                    </optgroup>
                    <optgroup label="Latin America & South America" className="bg-surface-container-low text-surface-foreground font-semibold">
                      <option value="America/Sao_Paulo">America/Sao Paulo (BRT)</option>
                      <option value="America/Buenos_Aires">America/Buenos Aires (ART)</option>
                      <option value="America/Santiago">America/Santiago (CLT/CLST)</option>
                      <option value="America/Bogota">America/Bogota (COT)</option>
                      <option value="America/Mexico_City">America/Mexico City (CST)</option>
                    </optgroup>
                    <optgroup label="Europe" className="bg-surface-container-low text-surface-foreground font-semibold">
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                      <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                      <option value="Europe/Athens">Europe/Athens (EET/EEST)</option>
                      <option value="Europe/Istanbul">Europe/Istanbul (TRT)</option>
                    </optgroup>
                    <optgroup label="Middle East & Africa" className="bg-surface-container-low text-surface-foreground font-semibold">
                      <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                      <option value="Asia/Jerusalem">Asia/Jerusalem (IST/IDT)</option>
                      <option value="Africa/Cairo">Africa/Cairo (EEST)</option>
                      <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                      <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                    </optgroup>
                    <optgroup label="Asia" className="bg-surface-container-low text-surface-foreground font-semibold">
                      <option value="Asia/Bangkok">Asia/Bangkok (ICT)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                      <option value="Asia/Hong_Kong">Asia/Hong Kong (HKT)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                      <option value="Asia/Seoul">Asia/Seoul (KST)</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    </optgroup>
                    <optgroup label="Oceania & Pacific" className="bg-surface-container-low text-surface-foreground font-semibold">
                      <option value="Australia/Perth">Australia/Perth (AWST)</option>
                      <option value="Australia/Adelaide">Australia/Adelaide (ACST/ACDT)</option>
                      <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
                      <option value="Pacific/Auckland">Pacific/Auckland (NZST/NZDT)</option>
                    </optgroup>
                  </select>
                  <InlineFieldError id="err-reg-timezone" message={fieldErrors['timezone']} />
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
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={ownerEmail}
                    onChange={(e) => handleInputChange('ownerEmail', e.target.value, setOwnerEmail)}
                    onBlur={() => handleBlur('ownerEmail', ownerEmail)}
                    className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${fieldErrors['ownerEmail'] ? 'border-error' : 'border-outline-variant'}`}
                  />
                  <InlineFieldError id="err-reg-owner-email" message={fieldErrors['ownerEmail']} />
                </div>
              </div>

              <div>
                <label htmlFor="reg-owner-password" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                  Owner Password <span aria-hidden="true" className="text-error ml-0.5">*</span>
                  <span className="sr-only"> (required)</span>
                </label>
                <div className="relative">
                  <input
                    type={showOwnerPassword ? 'text' : 'password'}
                    id="reg-owner-password"
                    name="ownerPassword"
                    required
                    maxLength={128}
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors['ownerPassword'])}
                    aria-describedby={`desc-reg-owner-password${fieldErrors['ownerPassword'] ? ' err-reg-owner-password' : ''}`}
                    value={ownerPassword}
                    onChange={(e) => handleInputChange('ownerPassword', e.target.value, setOwnerPassword)}
                    onBlur={() => handleBlur('ownerPassword', ownerPassword)}
                    className={`w-full px-3 py-2 pr-10 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${fieldErrors['ownerPassword'] ? 'border-error' : 'border-outline-variant'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                    aria-label={showOwnerPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showOwnerPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-surface-on-variant hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded"
                  >
                    {showOwnerPassword ? (
                      <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <InlineFieldError id="err-reg-owner-password" message={fieldErrors['ownerPassword']} />
                
                {/* Password Strength Meter */}
                {ownerPassword.length > 0 && (
                  <div className="mt-2 space-y-1" aria-live="polite">
                    <div className="flex items-center justify-between">
                      <span className="font-label text-[11px] text-surface-on-variant">Strength:</span>
                      <span className={`font-label text-xs font-bold ${
                        ownerStrength.score === 1 ? 'text-error' : ownerStrength.score === 2 ? 'text-tertiary' : 'text-primary'
                      }`}>
                        {ownerStrength.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`rounded-full transition-colors duration-200 ${
                            step <= ownerStrength.score ? ownerStrength.colorClass : 'bg-surface-container-high'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <p id="desc-reg-owner-password" className="font-body text-[10px] text-surface-on-variant mt-1">
                  15-128 characters. Uppercase, lowercase, numbers, symbols, spaces, and passphrases allowed.
                </p>
              </div>

              <div>
                <label htmlFor="reg-owner-confirm-password" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                  Confirm Password <span aria-hidden="true" className="text-error ml-0.5">*</span>
                  <span className="sr-only"> (required)</span>
                </label>
                <div className="relative">
                  <input
                    type={showOwnerConfirmPassword ? 'text' : 'password'}
                    id="reg-owner-confirm-password"
                    name="ownerConfirmPassword"
                    required
                    maxLength={128}
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors['ownerConfirmPassword'])}
                    aria-describedby={`desc-reg-owner-confirm${fieldErrors['ownerConfirmPassword'] ? ' err-reg-owner-confirm' : ''}`}
                    value={ownerConfirmPassword}
                    onChange={(e) => handleInputChange('ownerConfirmPassword', e.target.value, setOwnerConfirmPassword)}
                    onBlur={() => handleBlur('ownerConfirmPassword', ownerConfirmPassword)}
                    className={`w-full px-3 py-2 pr-10 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${fieldErrors['ownerConfirmPassword'] ? 'border-error' : 'border-outline-variant'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOwnerConfirmPassword(!showOwnerConfirmPassword)}
                    aria-label={showOwnerConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    aria-pressed={showOwnerConfirmPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-surface-on-variant hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded"
                  >
                    {showOwnerConfirmPassword ? (
                      <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <InlineFieldError id="err-reg-owner-confirm" message={fieldErrors['ownerConfirmPassword']} />
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
      <StudentJoinModal
        isOpen={isJoinModalOpen}
        onClose={handleCloseJoin}
        onSwitchToLogin={() => {
          setJoinModalOpen(false);
          setLoginModalOpen(true);
        }}
        onOpenTerms={() => setTermsModalOpen(true)}
        onSuccess={(data) => {
          registerPendingStudent({
            studentFullName: data.studentName,
            studentEmail: data.email,
            isMinor: Boolean(data.isMinor),
            guardianFullName: data.guardianName,
            guardianEmail: data.guardianEmail
          });
          setSessionUser({
            id: 'stud_' + Date.now(),
            email: data.email,
            fullName: data.studentName,
            school_id: activeSchool?.id || null
          }, 'student');
        }}
      />

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
        onClose={handleCloseLogin}
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
