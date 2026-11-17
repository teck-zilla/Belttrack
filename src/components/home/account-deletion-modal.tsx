'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAccessibleModal } from './use-accessible-modal';
import { useAuth } from '@/context/auth-context';

interface DeletionRequestSummary {
  id: string;
  status: string;
  reason: string | null;
  decision_note: string | null;
  requested_at: string;
  reviewed_at: string | null;
  scheduled_for: string | null;
  completed_at: string | null;
}

interface AccountDeletionResponse {
  account: {
    status: string;
    deletion_scheduled_for: string | null;
  };
  request: DeletionRequestSummary | null;
}

interface SchoolDeletionResponse {
  school: {
    deletion_scheduled_for: string | null;
    deletion_requested_at: string | null;
    deleted_at: string | null;
  };
  request: DeletionRequestSummary | null;
}

interface AccountDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;

export function AccountDeletionModal({ isOpen, onClose }: AccountDeletionModalProps) {
  const modalRef = useAccessibleModal(isOpen, onClose, '#btn-open-account-deletion');
  const { activeRole } = useAuth();
  const isOwner = activeRole === 'owner';

  const [account, setAccount] = useState<AccountDeletionResponse | null>(null);
  const [school, setSchool] = useState<SchoolDeletionResponse | null>(null);
  const [reason, setReason] = useState('');
  const [schoolReason, setSchoolReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const accountRes = await fetch('/api/account/deletion', { cache: 'no-store' });
      const accountData = await accountRes.json();

      if (!accountRes.ok) {
        throw new Error(accountData.error || 'Unable to load account deletion status.');
      }

      setAccount(accountData as AccountDeletionResponse);

      if (isOwner) {
        const schoolRes = await fetch('/api/schools/deletion', { cache: 'no-store' });
        const schoolData = await schoolRes.json();

        if (!schoolRes.ok) {
          throw new Error(schoolData.error || 'Unable to load school deletion status.');
        }

        setSchool(schoolData as SchoolDeletionResponse);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load deletion status.');
    } finally {
      setIsLoading(false);
    }
  }, [isOwner]);

  useEffect(() => {
    if (!isOpen) return;
    void loadStatus();
  }, [isOpen, loadStatus]);

  if (!isOpen) return null;

  const accountRequest = account?.request ?? null;
  const schoolRequest = school?.request ?? null;
  const userBlocked =
    accountRequest?.status === 'pending' || accountRequest?.status === 'approved';
  const schoolBlocked = Boolean(schoolRequest && schoolRequest.status !== 'cancelled');

  const submit = async (endpoint: string, body: { reason?: string }) => {
    setIsSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Unable to submit deletion request.');
      }

      setFeedback(data.message || 'Deletion request submitted.');
      setReason('');
      setSchoolReason('');
      await loadStatus();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit deletion request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancel = async (endpoint: string, successMessage: string) => {
    setIsSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      const res = await fetch(endpoint, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Unable to cancel deletion.');
      }

      setFeedback(data.message || successMessage);
      await loadStatus();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Unable to cancel deletion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="title-account-deletion-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-inverse-surface bg-opacity-60 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-surface-container-lowest border border-outline-variant shadow-hard-2 focus:outline-none"
      >
        <div className="p-4 sm:p-6 pb-4 border-b border-outline-variant flex items-start justify-between gap-4">
          <div>
            <span className="font-label text-xs font-bold uppercase tracking-wider text-tertiary">
              Account Lifecycle
            </span>
            <h2 id="title-account-deletion-modal" className="font-headline text-lg sm:text-xl font-bold text-primary">
              {isOwner ? 'School Account Deletion' : 'Account Deletion Request'}
            </h2>
            <p className="font-body text-xs text-surface-on-variant mt-0.5">
              {isOwner
                ? 'Closing the school locks all tenant access for 14 days before the purge runs.'
                : 'Your request must be approved by an owner or coach. Approved accounts are locked for 14 days.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account deletion modal"
            className="p-1 rounded text-surface-on-variant hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading && (
            <div className="p-3 rounded-[10px] bg-surface-container text-surface-on-variant font-body text-xs" role="status">
              Loading deletion status...
            </div>
          )}

          {error && (
            <div className="p-3 rounded-[10px] bg-error-container text-error-on-container border border-error font-body text-xs" role="alert">
              {error}
            </div>
          )}

          {feedback && (
            <div className="p-3 rounded-[10px] bg-tertiary-container text-tertiary-on-container font-body text-xs" role="status">
              {feedback}
            </div>
          )}

          {!isOwner && !isLoading && (
            <div className="p-4 rounded-[10px] bg-surface-container-low border border-outline-variant">
              <h3 className="font-title text-sm font-semibold text-primary mb-1">Personal account</h3>

              {accountRequest?.status === 'pending' && (
                <div className="space-y-3">
                  <p className="font-body text-xs text-surface-on-variant">
                    Awaiting owner or coach approval. Requested {formatDate(accountRequest.requested_at)}.
                  </p>
                  {accountRequest.reason && (
                    <p className="font-body text-xs text-surface-on-variant">
                      Reason: {accountRequest.reason}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void cancel('/api/account/deletion', 'Deletion request cancelled.')}
                    className="py-1.5 px-3 rounded-[10px] text-xs font-label font-medium bg-surface-container border border-outline-variant text-surface-on-variant hover:bg-surface-container-high transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Cancelling...' : 'Cancel Request'}
                  </button>
                </div>
              )}

              {accountRequest?.status === 'approved' && (
                <div className="space-y-3">
                  <p className="font-body text-xs text-warning">
                    Scheduled for permanent deletion on {formatDate(accountRequest.scheduled_for)}.
                    Private records are locked now.
                  </p>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void cancel('/api/account/deletion', 'Scheduled deletion cancelled.')}
                    className="py-1.5 px-3 rounded-[10px] text-xs font-label font-medium bg-surface-container border border-outline-variant text-surface-on-variant hover:bg-surface-container-high transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Cancelling...' : 'Cancel Scheduled Deletion'}
                  </button>
                </div>
              )}

              {!userBlocked && (
                <div className="space-y-3">
                  <p className="font-body text-xs text-surface-on-variant">
                    A 14-day grace period starts after staff approval. You can cancel during the grace period.
                  </p>
                  <label htmlFor="account-deletion-reason" className="font-label text-xs font-medium text-surface-foreground block">
                    Reason (optional)
                  </label>
                  <textarea
                    id="account-deletion-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full rounded-[10px] border border-outline-variant bg-surface-container-lowest text-surface-foreground font-body text-xs p-2.5 focus:outline-none focus:ring-2 focus:ring-tertiary"
                    placeholder="Tell the school why you are leaving."
                  />
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void submit('/api/account/deletion', { reason: reason.trim() || undefined })}
                    className="py-1.5 px-3 rounded-[10px] text-xs font-label font-semibold bg-error-container text-error-on-container hover:shadow-soft transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : 'Request Account Deletion'}
                  </button>
                </div>
              )}
            </div>
          )}

          {isOwner && !isLoading && (
            <div className="p-4 rounded-[10px] bg-surface-container-low border border-outline-variant">
              <h3 className="font-title text-sm font-semibold text-primary mb-1">School tenant</h3>

              {schoolRequest?.status === 'approved' && (
                <div className="space-y-3">
                  <p className="font-body text-xs text-warning">
                    School access is locked. Permanent purge is scheduled for{' '}
                    {formatDate(schoolRequest.scheduled_for)}.
                  </p>
                  <p className="font-body text-xs text-surface-on-variant">
                    The immutable ledger is retained; member identities and operational records are purged.
                  </p>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void cancel('/api/schools/deletion', 'School deletion cancelled.')}
                    className="py-1.5 px-3 rounded-[10px] text-xs font-label font-medium bg-surface-container border border-outline-variant text-surface-on-variant hover:bg-surface-container-high transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Cancelling...' : 'Cancel School Deletion'}
                  </button>
                </div>
              )}

              {!schoolBlocked && (
                <div className="space-y-3">
                  <p className="font-body text-xs text-surface-on-variant">
                    This locks all member access immediately. After 14 days, the purge removes school users
                    and operational data while retaining the append-only ledger.
                  </p>
                  <label htmlFor="school-deletion-reason" className="font-label text-xs font-medium text-surface-foreground block">
                    Reason (optional)
                  </label>
                  <textarea
                    id="school-deletion-reason"
                    value={schoolReason}
                    onChange={(event) => setSchoolReason(event.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full rounded-[10px] border border-outline-variant bg-surface-container-lowest text-surface-foreground font-body text-xs p-2.5 focus:outline-none focus:ring-2 focus:ring-tertiary"
                    placeholder="Record why the school is closing."
                  />
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void submit('/api/schools/deletion', { reason: schoolReason.trim() || undefined })}
                    className="py-1.5 px-3 rounded-[10px] text-xs font-label font-semibold bg-error-container text-error-on-container hover:shadow-soft transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Scheduling...' : 'Request School Deletion'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 py-3 border-t border-outline-variant bg-surface-container-lowest flex items-center justify-between">
          <span className="font-body text-[11px] text-surface-on-variant">
            Deletion requests are logged for tenant audit.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-[10px] bg-surface-container text-surface-foreground border border-outline-variant font-label text-xs font-medium hover:bg-surface-container-high transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
