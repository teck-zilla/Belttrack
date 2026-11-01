'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleBlur = (field: 'email' | 'password', val: string) => {
    if (!val.trim()) {
      setFieldErrors((prev) => ({ ...prev, [field]: 'empty field error' }));
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (fieldErrors['email']) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next['email'];
        return next;
      });
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (fieldErrors['password']) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next['password'];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    const errors: Record<string, string> = {};
    if (!email.trim()) {
      errors['email'] = 'empty field error';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      errors['email'] = 'enter a valid email address';
    }

    if (!password) {
      errors['password'] = 'empty field error';
    } else if (password.length < 6) {
      errors['password'] = 'Password must be at least 6 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await login(email.trim(), password);
      if (!res.success) {
        setFormFeedback(res.error || 'Invalid email or password');
      } else {
        setEmail('');
        setPassword('');
        setFieldErrors({});
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
      <div className="w-full max-w-md p-4 sm:p-6 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-hard-2 max-h-[90vh] overflow-y-auto">
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
            className="text-surface-on-variant hover:text-surface-foreground"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {formFeedback && (
          <div className="mb-4 p-3 rounded-lg bg-error-container text-error-on-container font-body text-xs">
            {formFeedback}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-title text-xs font-semibold text-surface-foreground block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={() => handleBlur('email', email)}
              placeholder="coach@dojo.org"
              className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm ${
                fieldErrors['email'] ? 'border-error' : 'border-outline-variant'
              }`}
            />
            {fieldErrors['email'] && (
              <span className="font-body text-[11px] text-error mt-1 block">
                {fieldErrors['email']}
              </span>
            )}
          </div>

          <div>
            <label className="font-title text-xs font-semibold text-surface-foreground block mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              onBlur={() => handleBlur('password', password)}
              placeholder="••••••••"
              className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm ${
                fieldErrors['password'] ? 'border-error' : 'border-outline-variant'
              }`}
            />
            {fieldErrors['password'] && (
              <span className="font-body text-[11px] text-error mt-1 block">
                {fieldErrors['password']}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-[10px] font-label text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:shadow-soft-2 transition-all disabled:opacity-50 cursor-pointer"
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
                className="font-title text-xs text-tertiary hover:underline"
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
                className="font-title text-xs text-tertiary hover:underline"
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

