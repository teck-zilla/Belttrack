'use client';

import React, { useState } from 'react';
import { useAccessibleModal } from './use-accessible-modal';

interface ManualLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  members?: Array<{
    profileId: string;
    userId: string;
    fullName: string;
  }>;
  onRecordCreated?: () => void;
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

export function ManualLedgerModal({
  isOpen,
  onClose,
  members = [],
  onRecordCreated
}: ManualLedgerModalProps) {
  const modalRef = useAccessibleModal(isOpen, onClose, '#btn-open-manual-ledger');

  const [memberUserId, setMemberUserId] = useState('');
  const [category, setCategory] = useState<'tuition' | 'promotion_fee' | 'merchandise' | 'drop_in'>('tuition');
  const [amount, setAmount] = useState('120.00');
  const [notes, setNotes] = useState('Offline cash settlement verified on mat.');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validateField = (fieldId: string, val: string): string | null => {
    const trimmed = (val || '').trim();
    if (!trimmed) return 'empty field error';

    if (fieldId === 'amount') {
      const num = parseFloat(trimmed);
      if (isNaN(num) || num <= 0) {
        return 'Amount must be greater than zero';
      }
    }

    return null;
  };

  const handleBlur = (fieldId: string, val: string) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};

    const errAmount = validateField('amount', amount);
    if (errAmount) errors['amount'] = errAmount;

    if (!memberUserId) {
      setFeedback('Select a student or member before recording a settlement.');
      return;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      document.getElementById('ledger-amount')?.focus();
      return;
    }

    setIsSubmitting(true);
    setFeedback('Recording immutable non-custodial receipt...');

    const transactionType =
      category === 'promotion_fee'
        ? 'TESTING_FEE'
        : category === 'merchandise'
          ? 'UNIFORM_EQUIPMENT'
          : 'TUITION';

    try {
      const res = await fetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberUserId,
          amountCents: Math.round(parseFloat(amount) * 100),
          currency: 'USD',
          transactionType,
          paymentMethod: 'CASH',
          note: notes.trim() || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback(data.error || 'Unable to record the ledger entry.');
        setIsSubmitting(false);
        return;
      }

      setFeedback(`Recorded! Receipt ${data.entry.receiptSlug} logged to immutable offline ledger.`);
      onRecordCreated?.();

      setTimeout(() => {
        setFeedback(null);
        setIsSubmitting(false);
        onClose();
      }, 1000);
    } catch {
      setFeedback('Network error while recording the ledger entry. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="title-manual-ledger-modal"
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
              <span className="font-label text-xs font-bold text-tertiary uppercase">Bookkeeping</span>
              <h3 id="title-manual-ledger-modal" className="font-headline text-xl font-bold text-primary">
                Manual Payment Entry
              </h3>
            </div>
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

        {feedback && (
          <div className="mb-4 p-3 rounded-lg bg-tertiary-container text-tertiary-on-container font-body text-xs font-medium" role="status">
            {feedback}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="ledger-payer-name"
              className="font-title text-xs font-semibold text-surface-foreground block mb-1"
            >
              Student / Member <span aria-hidden="true" className="text-tertiary font-bold">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <select
              id="ledger-payer-name"
              name="memberUserId"
              required
              aria-required="true"
              value={memberUserId}
              onChange={(e) => setMemberUserId(e.target.value)}
              disabled={members.length === 0}
              className="w-full px-3 py-2 rounded-[10px] bg-surface-container-low border border-outline-variant font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest disabled:opacity-60"
            >
              <option value="">{members.length === 0 ? 'No active student profiles' : 'Select a student'}</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="ledger-category"
                className="font-title text-xs font-semibold text-surface-foreground block mb-1"
              >
                Payment Category <span aria-hidden="true" className="text-tertiary font-bold">*</span>
                <span className="sr-only">(required)</span>
              </label>
              <select
                id="ledger-category"
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-[10px] bg-surface-container-low border border-outline-variant font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
              >
                <option value="tuition">Monthly Tuition</option>
                <option value="promotion_fee">Belt Promotion Fee</option>
                <option value="merchandise">Gi / Merchandise</option>
                <option value="drop_in">Drop-In Mat Fee</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="ledger-amount"
                className="font-title text-xs font-semibold text-surface-foreground block mb-1"
              >
                Amount ($ USD) <span aria-hidden="true" className="text-tertiary font-bold">*</span>
                <span className="sr-only">(required)</span>
              </label>
              <input
                id="ledger-amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                aria-required="true"
                aria-invalid={!!fieldErrors['amount']}
                aria-describedby={fieldErrors['amount'] ? 'err-ledger-amount' : undefined}
                value={amount}
                placeholder="120.00"
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (fieldErrors['amount']) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next['amount'];
                      return next;
                    });
                  }
                }}
                onBlur={() => handleBlur('amount', amount)}
                className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm ${
                  fieldErrors['amount'] ? 'border-error' : 'border-outline-variant'
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest`}
              />
              {fieldErrors['amount'] && (
                <InlineFieldError id="err-ledger-amount" message={fieldErrors['amount']} />
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="ledger-notes"
              className="font-title text-xs font-semibold text-surface-foreground block mb-1"
            >
              Settlement Notes / Memo
            </label>
            <input
              id="ledger-notes"
              name="notes"
              type="text"
              value={notes}
              placeholder="e.g. Paid in cash directly to front desk"
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-[10px] bg-surface-container-low border border-outline-variant font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-[10px] border border-outline-variant font-label text-xs font-medium hover:bg-surface-container hover:shadow-soft transition-all duration-[600ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 px-4 rounded-[10px] bg-primary text-primary-foreground font-label text-xs font-medium hover:bg-tertiary hover:shadow-soft transition-all duration-[600ms] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
            >
              {isSubmitting ? 'Logging Settlement...' : 'Record Manual Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

