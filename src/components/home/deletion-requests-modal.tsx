'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAccessibleModal } from './use-accessible-modal';

interface DeletionRequestRow {
  id: string;
  target_user_id: string | null;
  target_email: string | null;
  target_name: string | null;
  target_role: string | null;
  target_status: string | null;
  requested_by_name: string | null;
  status: string;
  reason: string | null;
  decision_note: string | null;
  requested_at: string;
  reviewed_at: string | null;
  scheduled_for: string | null;
}

interface DeletionRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;

export function DeletionRequestsModal({ isOpen, onClose }: DeletionRequestsModalProps) {
  const modalRef = useAccessibleModal(isOpen, onClose, '#btn-open-deletion-requests');
  const [requests, setRequests] = useState<DeletionRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/schools/deletion-requests', { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Unable to load deletion requests.');
      }

      setRequests((data.requests as DeletionRequestRow[]) ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load deletion requests.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void loadRequests();
  }, [isOpen, loadRequests]);

  if (!isOpen) return null;

  const review = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    setProcessingId(requestId);
    setError(null);
    setFeedback(null);

    try {
      const res = await fetch('/api/schools/deletion-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Unable to review deletion request.');
      }

      setFeedback(data.message || 'Deletion request updated.');
      await loadRequests();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Unable to review deletion request.');
    } finally {
      setProcessingId(null);
    }
  };

  const pending = requests.filter((request) => request.status === 'pending');
  const approved = requests.filter((request) => request.status === 'approved');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="title-deletion-requests-modal"
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
              Dojo Governance
            </span>
            <h2 id="title-deletion-requests-modal" className="font-headline text-lg sm:text-xl font-bold text-primary">
              Member Deletion Requests
            </h2>
            <p className="font-body text-xs text-surface-on-variant mt-0.5">
              Approve or reject member account deletion requests for your school only.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close deletion requests modal"
            className="p-1 rounded text-surface-on-variant hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 sm:px-6 py-3 bg-surface-container-low border-b border-outline-variant grid grid-cols-2 gap-3">
          <div className="p-3 rounded-[10px] bg-surface-container-lowest border border-outline-variant">
            <span className="font-label text-[11px] text-surface-on-variant block">Pending Review</span>
            <span className="font-headline text-xl font-bold text-warning">{pending.length}</span>
          </div>
          <div className="p-3 rounded-[10px] bg-surface-container-lowest border border-outline-variant">
            <span className="font-label text-[11px] text-surface-on-variant block">In Grace Period</span>
            <span className="font-headline text-xl font-bold text-tertiary">{approved.length}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {isLoading && (
            <div className="p-3 rounded-[10px] bg-surface-container text-surface-on-variant font-body text-xs" role="status">
              Loading deletion requests...
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

          {!isLoading && requests.length === 0 && (
            <div className="text-center py-8 text-surface-on-variant font-body text-xs">
              No member deletion requests are open.
            </div>
          )}

          {requests.map((request) => (
            <div
              key={request.id}
              className="p-3.5 rounded-[10px] bg-surface-container-low border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-title text-sm font-semibold text-primary break-words">
                    {request.target_name || request.target_email || 'Unknown member'}
                  </span>
                  <span
                    className={`font-label text-[10px] font-bold px-2 py-0.5 rounded ${
                      request.status === 'pending'
                        ? 'bg-warning text-surface-foreground'
                        : 'bg-tertiary text-tertiary-foreground'
                    }`}
                  >
                    {request.status.toUpperCase()}
                  </span>
                  {request.target_role && (
                    <span className="font-label text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container text-surface-on-variant">
                      {request.target_role}
                    </span>
                  )}
                </div>

                <div className="font-body text-xs text-surface-on-variant space-y-0.5">
                  <p className="break-all">{request.target_email}</p>
                  <p>
                    Requested {formatDate(request.requested_at)}
                    {request.requested_by_name ? ` by ${request.requested_by_name}` : ''}
                  </p>
                  {request.reason && <p>Reason: {request.reason}</p>}
                  {request.scheduled_for && (
                    <p className="text-warning">Purge scheduled: {formatDate(request.scheduled_for)}</p>
                  )}
                </div>
              </div>

              {request.status === 'pending' && (
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <button
                    type="button"
                    disabled={processingId === request.id}
                    onClick={() => void review(request.id, 'REJECT')}
                    className="py-1.5 px-3 rounded-[10px] text-xs font-label font-medium bg-surface-container border border-outline-variant text-surface-on-variant hover:bg-surface-container-high transition-all disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={processingId === request.id}
                    onClick={() => void review(request.id, 'APPROVE')}
                    className="py-1.5 px-3 rounded-[10px] text-xs font-label font-semibold bg-error-container text-error-on-container hover:shadow-soft transition-all disabled:opacity-50"
                  >
                    {processingId === request.id ? 'Approving...' : 'Approve Deletion'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 sm:p-6 py-3 border-t border-outline-variant bg-surface-container-lowest flex items-center justify-between">
          <span className="font-body text-[11px] text-surface-on-variant">
            Approved accounts are locked for 14 days before purge.
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
