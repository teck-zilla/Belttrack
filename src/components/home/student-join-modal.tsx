'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useAccessibleModal } from './use-accessible-modal';
import { studentJoinCodeSchema } from '@/lib/validation/schemas';
import { calculatePasswordStrength } from '@/lib/validation/password';

interface StudentJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
  onOpenTerms?: () => void;
  onSuccess?: (data: {
    schoolName: string;
    studentName: string;
    email: string;
    isMinor: boolean;
    guardianName?: string;
    guardianEmail?: string;
  }) => void;
}

export function StudentJoinModal({
  isOpen,
  onClose,
  onSwitchToLogin,
  onOpenTerms,
  onSuccess
}: StudentJoinModalProps) {
  const { login } = useAuth();
  const modalRef = useAccessibleModal(isOpen, onClose, '#btn-open-join');

  const [inputCode, setInputCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinSuccessData, setJoinSuccessData] = useState<{
    schoolName: string;
    studentName: string;
    status: string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyFeedback, setVerifyFeedback] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isEmailVerifiedOnSite, setIsEmailVerifiedOnSite] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const studentStrength = calculatePasswordStrength(studentPassword);

  // Strict 6-4-4 Join Code Validation Pattern
  const isValidSchoolJoinCode = (code: string) =>
    /^[A-Za-z]{1,6}-[A-Za-z]{1,4}-[0-9]{1,4}$/.test(code.trim());

  const isValidDateOfBirth = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date <= new Date();
  };

  const calculateIsMinor = (value: string) => {
    if (!isValidDateOfBirth(value)) return false;
    const dob = new Date(`${value}T00:00:00.000Z`);
    const now = new Date();
    let age = now.getUTCFullYear() - dob.getUTCFullYear();
    const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) {
      age -= 1;
    }
    return age < 18;
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const parts = raw.split('-');

    if (parts.length > 3) {
      raw = parts.slice(0, 3).join('-');
    } else {
      if (parts[0] && parts[0].length > 6) parts[0] = parts[0].slice(0, 6);
      if (parts[1] && parts[1].length > 4) parts[1] = parts[1].slice(0, 4);
      if (parts[2] && parts[2].length > 4) parts[2] = parts[2].slice(0, 4);
      raw = parts.join('-');
    }

    setInputCode(raw);

    if (fieldErrors['inputCode']) {
      if (isValidSchoolJoinCode(raw)) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next['inputCode'];
          return next;
        });
      }
    }
  };

  const handleBlur = (field: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setFieldErrors((prev) => ({ ...prev, [field]: 'This field cannot be left blank' }));
      return;
    }

    if (field === 'inputCode' && !isValidSchoolJoinCode(trimmed)) {
      setFieldErrors((prev) => ({
        ...prev,
        inputCode: 'School Join Code must strictly follow the format: 1-6 chars, 1-4 chars, 1-4 numbers (e.g. KAIZEN-BJJ-2026)'
      }));
      return;
    }

    if (field === 'studentName') {
      const words = trimmed.split(/\s+/).filter(Boolean);
      if (trimmed.length < 3 || words.length < 2) {
        setFieldErrors((prev) => ({
          ...prev,
          studentName: 'Student name must have at least 2 words or names'
        }));
        return;
      }
    }

    if (field === 'studentEmail') {
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
        setFieldErrors((prev) => ({ ...prev, studentEmail: 'enter a valid email address' }));
        return;
      }
    }

    if (field === 'dateOfBirth') {
      if (!isValidDateOfBirth(trimmed)) {
        setFieldErrors((prev) => ({ ...prev, dateOfBirth: 'Enter a valid date of birth' }));
        return;
      }
    }

    if (field === 'studentPassword') {
      if (trimmed.length < 15 || trimmed.length > 128) {
        setFieldErrors((prev) => ({
          ...prev,
          studentPassword: 'Password must be between 15 and 128 characters'
        }));
        return;
      }
      if (confirmPassword && trimmed !== confirmPassword) {
        setFieldErrors((prev) => ({
          ...prev,
          confirmPassword: 'Passwords do not match'
        }));
      }
    }

    if (field === 'confirmPassword') {
      if (value !== studentPassword) {
        setFieldErrors((prev) => ({
          ...prev,
          confirmPassword: 'Passwords do not match'
        }));
        return;
      }
    }

    if (field === 'guardianName' && isMinor) {
      const words = trimmed.split(/\s+/).filter(Boolean);
      if (trimmed.length < 3 || words.length < 2) {
        setFieldErrors((prev) => ({
          ...prev,
          guardianName: 'Guardian name must have at least 2 words or names'
        }));
        return;
      }
    }

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const isFormValid = Boolean(
    isValidSchoolJoinCode(inputCode) &&
    studentName.trim().length >= 3 &&
    studentName.trim().split(/\s+/).filter(Boolean).length >= 2 &&
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(studentEmail.trim()) &&
    isValidDateOfBirth(dateOfBirth) &&
    isMinor === calculateIsMinor(dateOfBirth) &&
    studentPassword.length >= 15 &&
    studentPassword.length <= 128 &&
    confirmPassword &&
    studentPassword === confirmPassword &&
    (!isMinor || (guardianName.trim().length >= 3 && guardianName.trim().split(/\s+/).filter(Boolean).length >= 2)) &&
    termsAccepted
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    const normalizedStudentEmail = studentEmail.trim().toLowerCase();
    const normalizedGuardianEmail = isMinor && guardianEmail.trim() ? guardianEmail.trim().toLowerCase() : undefined;

    const parseResult = studentJoinCodeSchema.safeParse({
      registrationCode: inputCode.trim(),
      studentFullName: studentName.trim(),
      studentEmail: normalizedStudentEmail,
      password: studentPassword,
      confirmPassword,
      dateOfBirth,
      isMinor,
      guardianFullName: isMinor ? guardianName.trim() : undefined,
      guardianEmail: normalizedGuardianEmail
    });

    if (!parseResult.success) {
      setFormFeedback(parseResult.error.issues[0]?.message || 'Please check your join code and details.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/students/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parseResult.data)
      });

      const data = await res.json();

      if (!res.ok) {
        setFormFeedback(data.error || 'Failed to join school. Please verify your join code.');
        setIsSubmitting(false);
        return;
      }

      setJoinSuccessData({
        schoolName: data.school?.name || 'Academy',
        studentName: studentName.trim(),
        status: data.user?.status || 'PENDING_APPROVAL'
      });

      if (onSuccess) {
        onSuccess({
          schoolName: data.school?.name || 'Academy',
          studentName: studentName.trim(),
          email: normalizedStudentEmail,
          isMinor,
          guardianName: isMinor ? guardianName.trim() : undefined,
          guardianEmail: normalizedGuardianEmail
        });
      }

      const loginResult = await login(normalizedStudentEmail, studentPassword);
      if (!loginResult.success) {
        setFormFeedback(loginResult.error || 'Account created. Please sign in manually.');
      }
    } catch {
      setFormFeedback('Network error while joining school. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setInputCode('');
    setStudentName('');
    setStudentEmail('');
    setDateOfBirth('');
    setStudentPassword('');
    setShowPassword(false);
    setIsMinor(false);
    setGuardianName('');
    setGuardianEmail('');
    setTermsAccepted(false);
    setFieldErrors({});
    setFormFeedback(null);
    setJoinSuccessData(null);
    setVerificationCode('');
    setVerifyFeedback(null);
    setIsVerifyingCode(false);
    setIsResendingCode(false);
    setResendCooldown(0);
    setIsEmailVerifiedOnSite(false);
    onClose();
  };

  const handleVerifyJoinedEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = verificationCode.trim();
    const normalizedEmail = studentEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setVerifyFeedback({ type: 'error', message: 'Email address is missing. Please sign in to verify.' });
      return;
    }
    if (!/^\d{6}$/.test(cleanCode)) {
      setVerifyFeedback({ type: 'error', message: 'Verification code must be exactly 6 digits.' });
      return;
    }

    try {
      setIsVerifyingCode(true);
      setVerifyFeedback(null);
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, code: cleanCode })
      });
      const data = await res.json();

      if (!res.ok) {
        setVerifyFeedback({ type: 'error', message: data.error || 'Verification failed. Please check the code.' });
        return;
      }

      setIsEmailVerifiedOnSite(true);
      setVerifyFeedback({ type: 'success', message: 'Email address verified successfully.' });
    } catch {
      setVerifyFeedback({ type: 'error', message: 'Network error verifying code. Please try again.' });
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleResendJoinedCode = async () => {
    if (resendCooldown > 0 || isResendingCode) return;
    const normalizedEmail = studentEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setVerifyFeedback({ type: 'error', message: 'Email address is missing. Please sign in to resend.' });
      return;
    }

    try {
      setIsResendingCode(true);
      setVerifyFeedback(null);
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail })
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.retryAfter) setResendCooldown(Number(data.retryAfter) || 60);
        setVerifyFeedback({ type: 'error', message: data.error || 'Failed to resend verification code.' });
        return;
      }

      setResendCooldown(60);
      setVerifyFeedback({ type: 'info', message: `A new verification code was sent to ${normalizedEmail}.` });
    } catch {
      setVerifyFeedback({ type: 'error', message: 'Network error resending verification code.' });
    } finally {
      setIsResendingCode(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="title-join-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface bg-opacity-60 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md p-4 sm:p-6 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-hard-2 max-h-[90vh] overflow-y-auto"
      >
        {/* SUCCESS CONFIRMATION STATE */}
        {joinSuccessData ? (
          <div className="space-y-4 py-2">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-tertiary-container text-tertiary-on-container flex items-center justify-center shadow-soft">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div>
                <span className="font-label text-xs font-bold text-tertiary uppercase tracking-wider block">
                  Enrollment Submitted
                </span>
                <h3 className="font-headline text-xl font-bold text-primary mt-1">
                  Welcome to {joinSuccessData.schoolName}!
                </h3>
              </div>
            </div>

            <div className="p-3 rounded-[10px] bg-surface-container-low border border-outline-variant text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-surface-on-variant font-body">Account Status:</span>
                <span className="font-label font-bold text-tertiary bg-tertiary-container px-2 py-0.5 rounded">
                  {joinSuccessData.status}
                </span>
              </div>
              <p className="font-body text-xs text-surface-on-variant leading-relaxed">
                Your profile has been created under <strong>PENDING_APPROVAL</strong>. Once your head coach approves your registration during class roll-call, full rank progress and technique logs will be unlocked.
              </p>
            </div>

            <div className="p-3 rounded-[10px] border border-outline-variant bg-surface-container-lowest space-y-3 text-left">
              <div>
                <span className="font-label text-[10px] font-bold uppercase tracking-wider text-tertiary block">
                  Verify Email Address
                </span>
                <p className="font-body text-xs text-surface-on-variant mt-1">
                  We sent a 6-digit verification code to <strong className="text-primary">{studentEmail.trim().toLowerCase()}</strong>. Enter it below to complete verification.
                </p>
              </div>

              {!isEmailVerifiedOnSite ? (
                <form onSubmit={handleVerifyJoinedEmail} className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      aria-label="6-digit email verification code"
                      className="w-full sm:w-32 px-3 py-2 rounded-[10px] bg-surface-container-low border border-outline-variant font-mono text-center text-sm font-bold tracking-widest text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2"
                      disabled={isVerifyingCode}
                    />
                    <button
                      type="submit"
                      disabled={isVerifyingCode || verificationCode.trim().length !== 6}
                      className="px-4 py-2 rounded-[10px] bg-primary text-primary-foreground font-label text-xs font-semibold hover:bg-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isVerifyingCode ? 'Verifying...' : 'Verify Email'}
                    </button>
                    <button
                      type="button"
                      onClick={handleResendJoinedCode}
                      disabled={isResendingCode || resendCooldown > 0}
                      className="px-3 py-2 rounded-[10px] bg-surface-container text-surface-foreground border border-outline-variant font-label text-xs font-medium hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : isResendingCode ? 'Sending...' : 'Resend Code'}
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  role="status"
                  className="p-2.5 rounded-[10px] bg-tertiary-container text-tertiary-on-container border border-tertiary/40 font-body text-xs"
                >
                  Email verified. You can continue to sign in when your coach approves your account.
                </div>
              )}

              {verifyFeedback && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`p-2.5 rounded-[10px] font-body text-xs border ${
                    verifyFeedback.type === 'error'
                      ? 'bg-error-container text-error-on-container border-error/30'
                      : verifyFeedback.type === 'success'
                      ? 'bg-tertiary-container text-tertiary-on-container border-tertiary/40'
                      : 'bg-surface-container text-surface-foreground border-outline-variant'
                  }`}
                >
                  {verifyFeedback.message}
                </div>
              )}

              <span className="font-body text-[11px] text-surface-on-variant block">
                In development, the 6-digit code is printed to the server terminal.
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="w-full py-2 px-4 rounded-[10px] bg-primary text-primary-foreground font-label text-xs font-medium hover:bg-tertiary transition-colors"
            >
              {isEmailVerifiedOnSite ? 'Done' : 'Continue'}
            </button>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-[10px] bg-primary text-primary-foreground flex-shrink-0 flex items-center justify-center shadow-soft"
                  aria-hidden="true"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="6" width="20" height="12" rx="4" />
                    <line x1="8" y1="6" x2="8" y2="18" />
                    <line x1="12" y1="6" x2="12" y2="18" strokeDasharray="2 2" />
                    <path d="M16 10l2 2-2 2" />
                  </svg>
                </div>
                <div>
                  <span className="font-label text-xs font-bold text-tertiary uppercase">Member Onboarding</span>
                  <h3 id="title-join-modal" className="font-headline text-xl font-bold text-primary">
                    Join Dojo with School Code
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="text-surface-on-variant hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded p-1"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* JOIN CODE */}
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
                  onChange={handleCodeChange}
                  onBlur={() => handleBlur('inputCode', inputCode)}
                  className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-label text-sm uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${
                    fieldErrors['inputCode'] ? 'border-error' : 'border-outline-variant'
                  }`}
                />
                {fieldErrors['inputCode'] && (
                  <p id="err-join-code" role="alert" className="font-body text-xs text-error mt-1">
                    {fieldErrors['inputCode']}
                  </p>
                )}
                <span id="desc-join-code" className="font-body text-xs text-surface-on-variant mt-1 block">
                  Provided by your head coach or dojo administration (format: 6-4-4).
                </span>
              </div>

              {/* STUDENT FULL NAME */}
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
                  placeholder="e.g. Lucas Silva"
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value);
                    if (fieldErrors['studentName'] && e.target.value.trim().length >= 3) {
                      setFieldErrors((prev) => {
                        const n = { ...prev };
                        delete n['studentName'];
                        return n;
                      });
                    }
                  }}
                  onBlur={() => handleBlur('studentName', studentName)}
                  className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${
                    fieldErrors['studentName'] ? 'border-error' : 'border-outline-variant'
                  }`}
                />
                {fieldErrors['studentName'] && (
                  <p role="alert" className="font-body text-xs text-error mt-1">
                    {fieldErrors['studentName']}
                  </p>
                )}
              </div>

              {/* DATE OF BIRTH */}
              <div>
                <label htmlFor="join-date-of-birth" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                  Date of Birth <span aria-hidden="true" className="text-error ml-0.5">*</span>
                  <span className="sr-only"> (required)</span>
                </label>
                <input
                  type="date"
                  id="join-date-of-birth"
                  name="dateOfBirth"
                  required
                  aria-required="true"
                  aria-invalid={Boolean(fieldErrors['dateOfBirth'])}
                  max={new Date().toISOString().split('T')[0]}
                  value={dateOfBirth}
                  onChange={(e) => {
                    const value = e.target.value;
                    const minor = calculateIsMinor(value);
                    setDateOfBirth(value);
                    setIsMinor(minor);
                    if (!minor) {
                      setGuardianName('');
                      setGuardianEmail('');
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next['guardianName'];
                        delete next['guardianEmail'];
                        return next;
                      });
                    }
                    if (fieldErrors['dateOfBirth'] && isValidDateOfBirth(value)) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next['dateOfBirth'];
                        return next;
                      });
                    }
                  }}
                  onBlur={() => handleBlur('dateOfBirth', dateOfBirth)}
                  className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${
                    fieldErrors['dateOfBirth'] ? 'border-error' : 'border-outline-variant'
                  }`}
                />
                {fieldErrors['dateOfBirth'] && (
                  <p role="alert" className="font-body text-xs text-error mt-1">
                    {fieldErrors['dateOfBirth']}
                  </p>
                )}
                <span className="font-body text-xs text-surface-on-variant mt-1 block">
                  Used to enforce minor and guardian enrollment rules.
                </span>
              </div>

              {/* STUDENT EMAIL */}
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
                  placeholder="e.g. lucas@example.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={studentEmail}
                  onChange={(e) => {
                    setStudentEmail(e.target.value);
                    if (fieldErrors['studentEmail']) {
                      setFieldErrors((prev) => {
                        const n = { ...prev };
                        delete n['studentEmail'];
                        return n;
                      });
                    }
                  }}
                  onBlur={() => handleBlur('studentEmail', studentEmail)}
                  className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${
                    fieldErrors['studentEmail'] ? 'border-error' : 'border-outline-variant'
                  }`}
                />
                {fieldErrors['studentEmail'] && (
                  <p role="alert" className="font-body text-xs text-error mt-1">
                    {fieldErrors['studentEmail']}
                  </p>
                )}
              </div>

              {/* PASSWORD */}
              <div>
                <label htmlFor="join-password" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                  Password <span aria-hidden="true" className="text-error ml-0.5">*</span>
                  <span className="sr-only"> (required)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="join-password"
                    name="studentPassword"
                    required
                    maxLength={128}
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors['studentPassword'])}
                    placeholder="Enter at least 15 characters"
                    value={studentPassword}
                    onChange={(e) => {
                      setStudentPassword(e.target.value);
                      if (fieldErrors['studentPassword']) {
                        setFieldErrors((prev) => {
                          const n = { ...prev };
                          delete n['studentPassword'];
                          return n;
                        });
                      }
                    }}
                    onBlur={() => handleBlur('studentPassword', studentPassword)}
                    className={`w-full pl-3 pr-10 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${
                      fieldErrors['studentPassword'] ? 'border-error' : 'border-outline-variant'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-on-variant hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded p-1 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors['studentPassword'] && (
                  <p role="alert" className="font-body text-xs text-error mt-1">
                    {fieldErrors['studentPassword']}
                  </p>
                )}

                {/* Password Strength Indicator */}
                {studentPassword.length > 0 && (
                  <div className="mt-2 space-y-1" aria-live="polite">
                    <div className="flex items-center justify-between">
                      <span className="font-label text-[11px] text-surface-on-variant">Strength:</span>
                      <span className={`font-label text-xs font-bold ${
                        studentStrength.score === 1 ? 'text-error' : studentStrength.score === 2 ? 'text-tertiary' : 'text-primary'
                      }`}>
                        {studentStrength.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`rounded-full transition-colors duration-200 ${
                            step <= studentStrength.score ? studentStrength.colorClass : 'bg-surface-container-high'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <span className="font-body text-xs text-surface-on-variant mt-1 block">
                  15-128 characters. Uppercase, lowercase, numbers, symbols, spaces, and passphrases allowed.
                </span>
              </div>

              {/* CONFIRM PASSWORD */}
              <div>
                <label htmlFor="join-confirm-password" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                  Confirm Password <span aria-hidden="true" className="text-error ml-0.5">*</span>
                  <span className="sr-only"> (required)</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="join-confirm-password"
                    name="confirmPassword"
                    required
                    maxLength={128}
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors['confirmPassword'])}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors['confirmPassword']) {
                        setFieldErrors((prev) => {
                          const n = { ...prev };
                          delete n['confirmPassword'];
                          return n;
                        });
                      }
                    }}
                    onBlur={() => handleBlur('confirmPassword', confirmPassword)}
                    className={`w-full pl-3 pr-10 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${
                      fieldErrors['confirmPassword'] ? 'border-error' : 'border-outline-variant'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-on-variant hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded p-1 transition-colors"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? (
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors['confirmPassword'] && (
                  <p role="alert" className="font-body text-xs text-error mt-1">
                    {fieldErrors['confirmPassword']}
                  </p>
                )}
              </div>

              {/* MINOR ENROLLMENT CHECKBOX */}
              <div className="pt-1">
                <div className="flex items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    id="checkbox-is-minor"
                    name="isMinor"
                    checked={isMinor}
                    disabled={!isValidDateOfBirth(dateOfBirth)}
                    readOnly
                    className="h-4 w-4 rounded border-outline-variant bg-surface-container-low text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary disabled:opacity-60"
                  />
                  <label htmlFor="checkbox-is-minor" className="font-title text-xs font-semibold text-surface-foreground cursor-default">
                    Student is under 18 years old (Minor enrollment)
                    {!isValidDateOfBirth(dateOfBirth) && (
                      <span className="font-body font-normal text-surface-on-variant block">
                        Enter date of birth to determine minor status.
                      </span>
                    )}
                  </label>
                </div>
              </div>

              {/* GUARDIAN FIELDS */}
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
                      placeholder="e.g. Roberto Silva"
                      value={guardianName}
                      onChange={(e) => {
                        setGuardianName(e.target.value);
                        if (fieldErrors['guardianName']) {
                          setFieldErrors((prev) => {
                            const n = { ...prev };
                            delete n['guardianName'];
                            return n;
                          });
                        }
                      }}
                      onBlur={() => handleBlur('guardianName', guardianName)}
                      className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-lowest border font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest ${
                        fieldErrors['guardianName'] ? 'border-error' : 'border-outline-variant'
                      }`}
                    />
                    {fieldErrors['guardianName'] && (
                      <p role="alert" className="font-body text-xs text-error mt-1">
                        {fieldErrors['guardianName']}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="join-guardian-email" className="font-title text-xs font-semibold text-surface-foreground block mb-1">
                      Guardian Email Address
                    </label>
                    <input
                      type="email"
                      id="join-guardian-email"
                      name="guardianEmail"
                      placeholder="e.g. roberto@example.com"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={guardianEmail}
                      onChange={(e) => setGuardianEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-[10px] bg-surface-container-lowest border border-outline-variant font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
                    />
                  </div>
                </div>
              )}

              {/* TERMS & CONDITIONS */}
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="join-terms-check"
                  name="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  required
                  aria-required="true"
                  className="mt-1 rounded border-outline-variant text-primary focus:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary cursor-pointer"
                />
                <label htmlFor="join-terms-check" className="font-body text-xs text-surface-on-variant cursor-pointer">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={onOpenTerms}
                    className="text-tertiary underline underline-offset-2 hover:text-primary transition-colors cursor-pointer"
                  >
                    Terms &amp; Conditions
                  </button>{' '}
                  and acknowledge that physical martial arts carries inherent risks and membership requires coach sign-off.
                </label>
              </div>

              {/* ERROR / FEEDBACK */}
              {formFeedback && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-2 rounded-[10px] bg-tertiary-container text-tertiary-on-container font-body text-xs font-medium"
                >
                  {formFeedback}
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !isFormValid}
                  className="w-full py-2 px-4 rounded-[10px] bg-primary text-primary-foreground font-label text-xs font-medium hover:bg-tertiary hover:shadow-soft transition-all duration-[600ms] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
                >
                  {isSubmitting ? 'Verifying...' : 'Verify & Join Dojo'}
                </button>
              </div>

              {/* SWITCH TO LOGIN */}
              {onSwitchToLogin && (
                <div className="text-center pt-2 border-t border-outline-variant">
                  <p className="font-body text-xs text-surface-on-variant">
                    Already enrolled?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        handleResetAndClose();
                        onSwitchToLogin();
                      }}
                      className="text-tertiary font-semibold hover:underline cursor-pointer"
                    >
                      Sign In to Account
                    </button>
                  </p>
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
