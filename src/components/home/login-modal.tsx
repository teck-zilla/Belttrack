'use client';

import React, { useState } from 'react';
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
  const modalRef = useAccessibleModal(isOpen, onClose, '#btn-open-login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setFormFeedback('Please enter both email and password.');
      if (!trimmedEmail) document.getElementById('login-email')?.focus();
      else document.getElementById('login-password')?.focus();
      return;
    }

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
      setFormFeedback('Please enter a valid email address.');
      document.getElementById('login-email')?.focus();
      return;
    }

    if (password.length < 6) {
      setFormFeedback('Password must be at least 6 characters.');
      document.getElementById('login-password')?.focus();
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await login(trimmedEmail, password);
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
          <div>
            <span className="font-label text-xs font-bold text-tertiary uppercase">Authentication</span>
            <h3 id="title-login-modal" className="font-headline text-xl font-bold text-primary">
              Sign In to BeltTrack
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-surface-on-variant hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded p-1"
            aria-label="Close modal"
          >
            ✕
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
              placeholder="coach@dojo.org"
              required
              aria-required="true"
              className="w-full px-3 py-2 rounded-[10px] bg-surface-container-low border border-outline-variant font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="font-title text-xs font-semibold text-surface-foreground block mb-1"
            >
              Password <span aria-hidden="true" className="text-tertiary font-bold">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              aria-required="true"
              className="w-full px-3 py-2 rounded-[10px] bg-surface-container-low border border-outline-variant font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-[10px] font-label text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:shadow-soft-2 transition-all disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
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
                className="font-title text-xs text-tertiary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded"
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
                className="font-title text-xs text-tertiary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded"
              >
                Join with Code
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
