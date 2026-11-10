/**
 * BeltTrack Martial Arts Management - Email Verification Banner
 * 
 * Displays an actionable verification banner on the dashboard for newly registered users,
 * allowing inline verification via a 6-digit code or triggering a code resend.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';

export function EmailVerificationBanner() {
  const { user, isRealSession, isEmailVerified, verifyEmailCode, resendVerificationCode } = useAuth();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  // Decrement resend cooldown timer every second
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Only display if user is logged into a real session and email is unverified
  if (!isRealSession || isEmailVerified || isDismissed || !user) {
    return null;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim();

    if (!cleanCode) {
      setFeedback({ type: 'error', message: 'Please enter the 6-digit verification code.' });
      return;
    }

    if (!/^\d{6}$/.test(cleanCode)) {
      setFeedback({ type: 'error', message: 'Verification code must be exactly 6 digits.' });
      return;
    }

    try {
      setIsVerifying(true);
      setFeedback(null);
      const result = await verifyEmailCode(cleanCode);

      if (!result.success) {
        setFeedback({
          type: 'error',
          message: result.error || 'Invalid code. Please check your email and try again.'
        });
        return;
      }

      setFeedback({
        type: 'success',
        message: 'Email address verified successfully! Your account is now fully secured.'
      });

      // Allow the user to see the success message briefly before unmounting
      setTimeout(() => {
        setIsDismissed(true);
      }, 2500);
    } catch {
      setFeedback({
        type: 'error',
        message: 'Network error verifying code. Please try again.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0 || isResending) return;

    try {
      setIsResending(true);
      setFeedback(null);
      const result = await resendVerificationCode();

      if (!result.success) {
        if (result.retryAfter) {
          setCooldownSeconds(result.retryAfter);
        }
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to resend code.'
        });
        return;
      }

      setCooldownSeconds(60); // 60-second cooldown
      setFeedback({
        type: 'info',
        message: `A new 6-digit verification code has been dispatched to ${user.email}.`
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Network error resending verification email.'
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Email verification notice"
      className="mb-6 rounded-xl border border-warning/40 bg-warning-container/20 p-4 sm:p-5 shadow-soft transition-all duration-[400ms]"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Notice and Explanation */}
        <div className="flex items-start gap-3 flex-1">
          <div
            className="w-10 h-10 rounded-[10px] bg-warning-container text-warning-on-container flex-shrink-0 flex items-center justify-center shadow-soft"
            aria-hidden="true"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label text-[10px] font-bold uppercase tracking-wider bg-warning text-surface-foreground px-2 py-0.5 rounded">
                Action Required
              </span>
              <h3 className="font-headline text-sm sm:text-base font-bold text-primary">
                Please verify your email address
              </h3>
            </div>
            <p className="font-body text-xs sm:text-sm text-surface-on-variant mt-1 leading-relaxed">
              We sent a six-digit verification code to <strong className="text-primary">{user.email}</strong>. Enter the code below to complete account verification.
            </p>
          </div>
        </div>

        {/* Right: Code Input Form */}
        <div className="w-full md:w-auto flex-shrink-0">
          <form onSubmit={handleVerify} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
              <input
                type="text"
                id="verification-code-input"
                name="verificationCode"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(val);
                }}
                placeholder="123456"
                aria-label="6-digit email verification code"
                className="w-full sm:w-32 px-3 py-2 rounded-[10px] bg-surface-container-lowest border border-outline-variant font-mono text-center text-sm font-bold tracking-widest text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2"
                disabled={isVerifying}
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying || code.trim().length !== 6}
              className="inline-flex items-center justify-center px-4 py-2 rounded-[10px] bg-primary text-primary-foreground font-label text-xs font-semibold hover:bg-tertiary hover:shadow-soft transition-all duration-[300ms] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? 'Verifying...' : 'Verify Email'}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldownSeconds > 0 || isResending}
              className="inline-flex items-center justify-center px-3 py-2 rounded-[10px] bg-surface-container text-surface-foreground border border-outline-variant font-label text-xs font-medium hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-center"
            >
              {cooldownSeconds > 0 ? `Resend (${cooldownSeconds}s)` : isResending ? 'Sending...' : 'Resend Code'}
            </button>
          </form>
        </div>
      </div>

      {/* Feedback Alerts */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-3 p-2.5 rounded-[10px] font-body text-xs flex items-center gap-2 ${
            feedback.type === 'error'
              ? 'bg-error-container text-error-on-container border border-error/30'
              : feedback.type === 'success'
              ? 'bg-tertiary-container text-tertiary-on-container border border-tertiary/40'
              : 'bg-surface-container text-surface-foreground border border-outline-variant'
          }`}
        >
          {feedback.type === 'error' && (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {feedback.type === 'success' && (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Dev helper note */}
      <div className="mt-2 text-[11px] font-body text-surface-on-variant/80">
        Tip: In development, your 6-digit code is dispatched to the server terminal console.
      </div>
    </div>
  );
}

