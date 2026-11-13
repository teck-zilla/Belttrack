'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useAccessibleModal } from './use-accessible-modal';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister?: () => void;
  onSwitchToJoin?: () => void;
}

export function LoginModal({
  isOpen,
  onClose,
  onSwitchToRegister,
  onSwitchToJoin
}: LoginModalProps) {
  const { login } = useAuth();
  const handleModalClose = () => {
    setIsResetMode(false);
    setResetStep('request');
    setResetFeedback(null);
    setFormFeedback(null);
    onClose();
  };

  const modalRef = useAccessibleModal(isOpen, handleModalClose, '#btn-open-login');

  const [loginRole, setLoginRole] = useState<'owner' | 'student'>('owner');
  const [schoolCode, setSchoolCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password Reset State
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const openResetMode = () => {
    setIsResetMode(true);
    setResetStep('request');
    setResetFeedback(null);
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    if (loginRole === 'owner' && schoolCode) {
      setResetIdentifier(schoolCode);
    } else if (email) {
      setResetIdentifier(email);
    }
  };

  const backToSignIn = () => {
    setIsResetMode(false);
    setResetStep('request');
    setResetFeedback(null);
    setFormFeedback(null);
  };

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetFeedback(null);

    const identifier = resetIdentifier.trim();
    if (!identifier) {
      setResetFeedback({ type: 'error', message: 'Please enter your account email or school join code.' });
      return;
    }

    const isCode = /^[A-Za-z]{1,6}-[A-Za-z]{1,4}-[0-9]{1,4}$/.test(identifier);

    try {
      setIsResetSubmitting(true);
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          ...(isCode ? { schoolCode: identifier } : { email: identifier })
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setResetFeedback({ type: 'error', message: data.error || 'Failed to dispatch reset code.' });
        return;
      }

      setMaskedEmail(data.maskedEmail || identifier);
      setResolvedEmail(data.targetEmail || identifier);
      setResetStep('confirm');
      setResetFeedback({ type: 'success', message: 'A 6-digit confirmation code has been dispatched.' });
      setResendCooldown(60);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error sending reset code.';
      setResetFeedback({ type: 'error', message });
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetFeedback(null);

    const code = resetCode.trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setResetFeedback({ type: 'error', message: 'Please enter the valid 6-digit numeric confirmation code.' });
      return;
    }

    if (newPassword.length < 6) {
      setResetFeedback({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetFeedback({ type: 'error', message: 'Passwords do not match. Please verify.' });
      return;
    }

    try {
      setIsResetSubmitting(true);
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          email: resolvedEmail,
          code,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setResetFeedback({ type: 'error', message: data.error || 'Failed to update password.' });
        return;
      }

      setResetFeedback({ type: 'success', message: 'Password updated successfully! Signing you in...' });

      // Automatically sign in with updated password
      const loginRes = await login({ email: resolvedEmail, password: newPassword });
      if (loginRes.success) {
        onClose();
      } else {
        backToSignIn();
        setFormFeedback('Password updated successfully. Please sign in with your new password.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error updating password.';
      setResetFeedback({ type: 'error', message });
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    try {
      setIsResetSubmitting(true);
      setResetFeedback(null);
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend',
          email: resolvedEmail
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setResetFeedback({ type: 'error', message: data.error || 'Failed to resend code.' });
        return;
      }

      setResetFeedback({ type: 'success', message: 'A new 6-digit confirmation code has been dispatched.' });
      setResendCooldown(60);
    } catch {
      setResetFeedback({ type: 'error', message: 'Network error resending code.' });
    } finally {
      setIsResetSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    if (password.length < 6) {
      setFormFeedback('Password must be at least 6 characters.');
      document.getElementById('login-password')?.focus();
      return;
    }

    if (loginRole === 'owner') {
      const trimmedCode = schoolCode.trim().toUpperCase();
      if (!trimmedCode) {
        setFormFeedback('Please enter your school join code.');
        document.getElementById('login-school-code')?.focus();
        return;
      }

      if (!/^[A-Za-z]{1,6}-[A-Za-z]{1,4}-[0-9]{1,4}$/.test(trimmedCode)) {
        setFormFeedback('School code must follow the 6-4-4 format (e.g. KAIZEN-2026).');
        document.getElementById('login-school-code')?.focus();
        return;
      }

      try {
        setIsSubmitting(true);
        const res = await login({ schoolCode: trimmedCode, password });
        if (!res.success) {
          setFormFeedback(res.error || 'Invalid school code or password');
        } else {
          setSchoolCode('');
          setPassword('');
          setFormFeedback(null);
          onClose();
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Network error during sign in';
        setFormFeedback(message);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) {
        setFormFeedback('Please enter your email address.');
        document.getElementById('login-email')?.focus();
        return;
      }

      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
        setFormFeedback('Please enter a valid email address.');
        document.getElementById('login-email')?.focus();
        return;
      }

      try {
        setIsSubmitting(true);
        const res = await login({ email: trimmedEmail, password });
        if (!res.success) {
          setFormFeedback(res.error || 'Invalid email or password');
        } else {
          setEmail('');
          setPassword('');
          setFormFeedback(null);
          onClose();
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Network error during sign in';
        setFormFeedback(message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="title-login-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface bg-opacity-60 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md p-4 sm:p-6 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-hard-2 max-h-[90vh] overflow-y-auto"
      >
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
              <span className="font-label text-xs font-bold text-tertiary uppercase">
                {isResetMode ? 'Account Recovery' : 'Authentication'}
              </span>
              <h3 id="title-login-modal" className="font-headline text-xl font-bold text-primary">
                {isResetMode ? 'Reset Password' : 'Sign In to BeltTrack'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            className="text-surface-on-variant hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded p-1 cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Mode-Dependent Body: Sign In vs Password Reset */}
        {!isResetMode ? (
          <>
            {/* Role Toggle Selector */}
            <div
              role="tablist"
              aria-label="Login Role Selection"
              className="mb-4 flex items-center gap-1 rounded-[10px] bg-surface-container border border-outline-variant p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={loginRole === 'owner'}
                onClick={() => {
                  setLoginRole('owner');
                  setFormFeedback(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-[8px] text-xs font-label font-semibold transition-all text-center cursor-pointer ${
                  loginRole === 'owner'
                    ? 'bg-primary text-primary-foreground shadow-soft'
                    : 'text-surface-on-variant hover:text-surface-foreground'
                }`}
              >
                School Owner
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={loginRole === 'student'}
                onClick={() => {
                  setLoginRole('student');
                  setFormFeedback(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-[8px] text-xs font-label font-semibold transition-all text-center cursor-pointer ${
                  loginRole === 'student'
                    ? 'bg-primary text-primary-foreground shadow-soft'
                    : 'text-surface-on-variant hover:text-surface-foreground'
                }`}
              >
                Student / Member
              </button>
            </div>

            {formFeedback && (
              <div
                role="status"
                className="mb-4 p-3 rounded-lg bg-error-container text-error-on-container font-body text-xs"
              >
                {formFeedback}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {loginRole === 'owner' ? (
                <div>
                  <label
                    htmlFor="login-school-code"
                    className="font-title text-xs font-semibold text-surface-foreground block mb-1"
                  >
                    School Join Code <span aria-hidden="true" className="text-tertiary font-bold">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <input
                    id="login-school-code"
                    name="schoolCode"
                    type="text"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                    placeholder="e.g. KAIZEN-2026"
                    required
                    aria-required="true"
                    autoComplete="organization"
                    className="w-full px-3 py-2 rounded-[10px] bg-surface-container-low border border-outline-variant font-body text-sm uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
                  />
                  <p className="font-body text-[11px] text-surface-on-variant mt-1">
                    Enter your school&apos;s unique join code to authenticate as head coach / owner.
                  </p>
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="login-email"
                    className="font-title text-xs font-semibold text-surface-foreground block mb-1"
                  >
                    Email Address <span aria-hidden="true" className="text-tertiary font-bold">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@dojo.org"
                    required
                    aria-required="true"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full px-3 py-2 rounded-[10px] bg-surface-container-low border border-outline-variant font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="login-password"
                    className="font-title text-xs font-semibold text-surface-foreground block"
                  >
                    {loginRole === 'owner' ? 'Owner Password' : 'Password'}{' '}
                    <span aria-hidden="true" className="text-tertiary font-bold">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <button
                    type="button"
                    onClick={openResetMode}
                    className="font-title text-[11px] text-tertiary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    aria-required="true"
                    autoComplete="current-password"
                    className="w-full px-3 py-2 pr-10 rounded-[10px] bg-surface-container-low border border-outline-variant font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-surface-on-variant hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded"
                  >
                    {showPassword ? (
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
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-[10px] font-label text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-tertiary hover:shadow-soft-2 transition-all disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
              >
                {isSubmitting ? 'Authenticating...' : loginRole === 'owner' ? 'Sign In as Owner' : 'Sign In as Member'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-outline-variant flex flex-col gap-2 text-center">
              <p className="font-body text-xs text-surface-on-variant">
                Need an account?
              </p>
              <div className="flex items-center justify-center gap-3">
                {onSwitchToRegister && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSwitchToRegister();
                    }}
                    className="font-title text-xs text-tertiary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded cursor-pointer"
                  >
                    Register School
                  </button>
                )}
                {onSwitchToRegister && onSwitchToJoin && (
                  <span className="text-surface-on-variant text-xs">•</span>
                )}
                {onSwitchToJoin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSwitchToJoin();
                    }}
                    className="font-title text-xs text-tertiary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded cursor-pointer"
                  >
                    Join with Code
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Password Reset Flow */
          <div>
            {resetFeedback && (
              <div
                role="status"
                className={`mb-4 p-3 rounded-lg font-body text-xs ${
                  resetFeedback.type === 'error'
                    ? 'bg-error-container text-error-on-container'
                    : 'bg-tertiary-container text-tertiary-on-container'
                }`}
              >
                {resetFeedback.message}
              </div>
            )}

            {resetStep === 'request' ? (
              <form onSubmit={handleRequestResetCode} className="space-y-4">
                <p className="font-body text-xs text-surface-on-variant leading-relaxed">
                  Enter your registered account email or your school join code. We will dispatch a single-use 6-digit confirmation code to verify your identity.
                </p>

                <div>
                  <label
                    htmlFor="reset-identifier"
                    className="font-title text-xs font-semibold text-surface-foreground block mb-1"
                  >
                    Email Address or School Join Code <span aria-hidden="true" className="text-tertiary font-bold">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <input
                    id="reset-identifier"
                    name="resetIdentifier"
                    type="text"
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    placeholder="e.g. coach@kaizenbjj.org or KAIZEN-2026"
                    required
                    aria-required="true"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full px-3 py-2 rounded-[10px] bg-surface-container-low border border-outline-variant font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isResetSubmitting}
                  className="w-full py-2.5 rounded-[10px] font-label text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-tertiary hover:shadow-soft-2 transition-all disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
                >
                  {isResetSubmitting ? 'Sending Code...' : 'Send Reset Code'}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={backToSignIn}
                    className="font-title text-xs text-tertiary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmResetPassword} className="space-y-4">
                <div className="p-3 rounded-lg bg-surface-container border border-outline-variant">
                  <p className="font-body text-xs text-surface-on-variant leading-relaxed">
                    A 6-digit confirmation code was sent to{' '}
                    <strong className="text-surface-foreground font-semibold">{maskedEmail}</strong>.
                    Enter the code below and select a new password.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="reset-code"
                    className="font-title text-xs font-semibold text-surface-foreground block mb-1"
                  >
                    6-Digit Verification Code <span aria-hidden="true" className="text-tertiary font-bold">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <input
                    id="reset-code"
                    name="resetCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    required
                    aria-required="true"
                    autoComplete="one-time-code"
                    className="w-full px-3 py-2 rounded-[10px] bg-surface-container-low border border-outline-variant font-mono text-center text-lg tracking-[0.5em] font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reset-new-password"
                    className="font-title text-xs font-semibold text-surface-foreground block mb-1"
                  >
                    New Password <span aria-hidden="true" className="text-tertiary font-bold">*</span>
                    <span className="sr-only">(required, minimum 6 characters)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reset-new-password"
                      name="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      aria-required="true"
                      autoComplete="new-password"
                      className="w-full px-3 py-2 pr-10 rounded-[10px] bg-surface-container-low border border-outline-variant font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showNewPassword}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-surface-on-variant hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded cursor-pointer"
                    >
                      {showNewPassword ? (
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
                </div>

                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="font-title text-xs font-semibold text-surface-foreground block mb-1"
                  >
                    Confirm New Password <span aria-hidden="true" className="text-tertiary font-bold">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <input
                    id="reset-confirm-password"
                    name="confirmPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    aria-required="true"
                    autoComplete="new-password"
                    className="w-full px-3 py-2 rounded-[10px] bg-surface-container-low border border-outline-variant font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isResetSubmitting}
                  className="w-full py-2.5 rounded-[10px] font-label text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-tertiary hover:shadow-soft-2 transition-all disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
                >
                  {isResetSubmitting ? 'Updating Password...' : 'Reset Password & Sign In'}
                </button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={backToSignIn}
                    className="font-title text-xs text-tertiary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded"
                  >
                    ← Back to Sign In
                  </button>

                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isResetSubmitting || resendCooldown > 0}
                    className="font-title text-xs text-tertiary hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
