'use client';

import React, { useState } from 'react';
import { useAccessibleModal } from './use-accessible-modal';

interface ManualLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordCreated?: (record: {
    title: string;
    amount: string;
    subtext: string;
    slug: string;
  }) => void;
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
  onRecordCreated
}: ManualLedgerModalProps) {
  const modalRef = useAccessibleModal(isOpen, onClose, '#btn-open-manual-ledger');

  const [studentName, setStudentName] = useState('');
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

    if (fieldId === 'studentName') {
      const words = trimmed.split(/\s+/).filter(Boolean);
      if (trimmed.length < 3 || words.length < 2) {
        return 'structure error';
      }
    }

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    const errName = validateField('studentName', studentName);
    if (errName) errors['studentName'] = errName;

    const errAmount = validateField('amount', amount);
    if (errAmount) errors['amount'] = errAmount;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstKey = Object.keys(errors)[0];
      const targetId = firstKey === 'studentName' ? 'ledger-payer-name' : 'ledger-amount';
      document.getElementById(targetId)?.focus();
      return;
    }

    setIsSubmitting(true);
    setFeedback('Recording immutable non-custodial receipt...');

    const categoryLabels: Record<string, string> = {
      tuition: 'Monthly Tuition (Cash Settlement)',
      promotion_fee: 'Belt Testing & Promotion Fee',
      merchandise: 'Dojo Gi & Mat Equipment',
      drop_in: 'Mat Drop-In Fee'
    };

    const randomInc = String(Math.floor(Math.random() * 900) + 100);
    const newSlug = `REC-2026-BJJ-${randomInc}`;

    setTimeout(() => {
      onRecordCreated?.({
        title: categoryLabels[category] || 'Manual Tuition Record',
        amount: `$${parseFloat(amount).toFixed(2)}`,
        subtext: `Student: ${studentName.trim()}`,
        slug: newSlug
      });

      setFeedback(`Recorded! Receipt ${newSlug} logged to immutable offline ledger.`);
      setTimeout(() => {
        setFeedback(null);
        setIsSubmitting(false);
        onClose();
      }, 1000);
    }, 600);
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
          <div>
            <span className="font-label text-xs font-bold text-tertiary uppercase">Bookkeeping</span>
            <h3 id="title-manual-ledger-modal" className="font-headline text-xl font-bold text-primary">
              Manual Payment Entry
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
              Student / Member Full Name <span aria-hidden="true" className="text-tertiary font-bold">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="ledger-payer-name"
              name="studentName"
              type="text"
              required
              aria-required="true"
              aria-invalid={!!fieldErrors['studentName']}
              aria-describedby={fieldErrors['studentName'] ? 'err-ledger-payer-name' : undefined}
              value={studentName}
              placeholder="e.g. Mateo Diaz"
              onChange={(e) => {
                setStudentName(e.target.value);
                if (fieldErrors['studentName']) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next['studentName'];
                    return next;
                  });
                }
              }}
              onBlur={() => handleBlur('studentName', studentName)}
              className={`w-full px-3 py-2 rounded-[10px] bg-surface-container-low border font-body text-sm ${
                fieldErrors['studentName'] ? 'border-error' : 'border-outline-variant'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest`}
            />
            {fieldErrors['studentName'] && (
              <InlineFieldError id="err-ledger-payer-name" message={fieldErrors['studentName']} />
            )}
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

