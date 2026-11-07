'use client';

import React, { useState } from 'react';
import { useAccessibleModal } from './use-accessible-modal';
import { useTenant } from '@/context/tenant-context';

interface MemberApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MemberApprovalModal({ isOpen, onClose }: MemberApprovalModalProps) {
  const modalRef = useAccessibleModal(isOpen, onClose, '#btn-open-approvals');
  const { activeSchool, pendingMembers, approvedMembers, approveMember, rejectMember } = useTenant();

  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApprove = async (memberId: string, memberName: string) => {
    try {
      setProcessingId(memberId);
      await approveMember(memberId);
      setFeedback(`Approved ${memberName}. Account status is now ACTIVE.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback(`Error approving ${memberName}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (memberId: string, memberName: string) => {
    try {
      setProcessingId(memberId);
      await rejectMember(memberId);
      setFeedback(`Declined sign-up request for ${memberName}.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback(`Error declining request for ${memberName}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="title-approvals-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-inverse-surface bg-opacity-60 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-surface-container-lowest border border-outline-variant shadow-hard-2 focus:outline-none"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 pb-4 border-b border-outline-variant flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-label text-xs font-bold uppercase tracking-wider text-tertiary">
                Dojo Governance
              </span>
              <span className="font-label text-[10px] font-bold px-2 py-0.5 rounded bg-primary-container text-primary-on-container">
                Strict Tenant Isolation
              </span>
            </div>
            <h2 id="title-approvals-modal" className="font-headline text-lg sm:text-xl font-bold text-primary">
              Member Sign-Up Approvals
            </h2>
            <p className="font-body text-xs text-surface-on-variant mt-0.5">
              Review and authorize pending student registrations for {activeSchool?.name || 'your dojo'}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close approvals modal"
            className="p-1 rounded text-surface-on-variant hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
          >
            ✕
          </button>
        </div>

        {/* Summary Metrics */}
        <div className="p-4 sm:p-6 py-4 bg-surface-container-low border-b border-outline-variant grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-[10px] bg-surface-container-lowest border border-outline-variant">
            <span className="font-label text-[11px] text-surface-on-variant block">Pending Review</span>
            <span className="font-headline text-xl sm:text-2xl font-bold text-warning">
              {pendingMembers.length}
            </span>
            <span className="font-body text-[10px] text-surface-on-variant block mt-0.5">
              Awaiting coach sign-off
            </span>
          </div>

          <div className="p-3 rounded-[10px] bg-surface-container-lowest border border-outline-variant">
            <span className="font-label text-[11px] text-surface-on-variant block">Active Members</span>
            <span className="font-headline text-xl sm:text-2xl font-bold text-tertiary">
              {approvedMembers.length}
            </span>
            <span className="font-body text-[10px] text-surface-on-variant block mt-0.5">
              Verified active roster
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3 rounded-[10px] bg-surface-container-lowest border border-outline-variant">
            <span className="font-label text-[11px] text-surface-on-variant block">Active Join Code</span>
            <span className="font-label text-sm sm:text-base font-bold text-primary block truncate">
              {activeSchool?.registration_code || 'N/A'}
            </span>
            <span className="font-body text-[10px] text-surface-on-variant block mt-0.5">
              Tenant isolated
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="px-4 sm:px-6 pt-3 flex items-center gap-2 border-b border-outline-variant">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pending'}
            onClick={() => setActiveTab('pending')}
            className={`pb-2 font-label text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'border-primary text-primary'
                : 'border-transparent text-surface-on-variant hover:text-surface-foreground'
            }`}
          >
            <span>Pending Approvals</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'pending'
                  ? 'bg-warning text-surface-foreground'
                  : 'bg-surface-container text-surface-on-variant'
              }`}
            >
              {pendingMembers.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'approved'}
            onClick={() => setActiveTab('approved')}
            className={`pb-2 font-label text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'approved'
                ? 'border-primary text-primary'
                : 'border-transparent text-surface-on-variant hover:text-surface-foreground'
            }`}
          >
            <span>Approved Members</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'approved'
                  ? 'bg-tertiary text-tertiary-foreground'
                  : 'bg-surface-container text-surface-on-variant'
              }`}
            >
              {approvedMembers.length}
            </span>
          </button>
        </div>

        {/* Live Feedback Announcement */}
        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className="mx-4 sm:mx-6 mt-3 p-2.5 rounded-[10px] bg-tertiary-container text-tertiary-on-container font-body text-xs font-medium flex items-center justify-between"
          >
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-tertiary-on-container text-xs ml-2 hover:opacity-80"
            >
              ✕
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {activeTab === 'pending' ? (
            pendingMembers.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-surface-container flex items-center justify-center text-primary">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-title text-sm font-semibold text-primary">All Applications Processed</h3>
                <p className="font-body text-xs text-surface-on-variant max-w-sm mx-auto mt-1">
                  There are currently zero pending sign-ups awaiting coach sign-off. When students submit a join code, they will appear here.
                </p>
              </div>
            ) : (
              pendingMembers.map((member) => (
                <div
                  key={member.id}
                  className="p-3.5 rounded-[10px] bg-surface-container-low border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-title text-sm font-semibold text-primary break-words">
                        {member.full_name}
                      </span>
                      <span className="font-label text-[10px] font-bold px-2 py-0.5 rounded bg-warning text-surface-foreground">
                        PENDING_APPROVAL
                      </span>
                      {member.guardian_name && (
                        <span className="font-label text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container text-surface-on-variant">
                          Minor (Linked Guardian)
                        </span>
                      )}
                    </div>

                    <div className="font-body text-xs text-surface-on-variant space-y-0.5">
                      <p className="break-all">
                        <strong className="font-medium text-surface-foreground">Email:</strong> {member.email}
                      </p>
                      {member.guardian_name && (
                        <p className="break-words">
                          <strong className="font-medium text-surface-foreground">Guardian:</strong>{' '}
                          {member.guardian_name}{' '}
                          {member.guardian_email && <span className="opacity-80">({member.guardian_email})</span>}
                        </p>
                      )}
                      <p className="text-[11px] opacity-75">
                        Applied: {new Date(member.enrolled_at).toLocaleDateString()} • School Code:{' '}
                        {activeSchool?.registration_code}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    <button
                      type="button"
                      disabled={processingId === member.id}
                      onClick={() => handleReject(member.id, member.full_name)}
                      className="py-1.5 px-3 rounded-[10px] text-xs font-label font-medium bg-surface-container border border-outline-variant text-surface-on-variant hover:bg-error-container hover:text-error-on-container transition-all disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={processingId === member.id}
                      onClick={() => handleApprove(member.id, member.full_name)}
                      className="py-1.5 px-3 rounded-[10px] text-xs font-label font-semibold bg-primary text-primary-foreground hover:bg-tertiary hover:shadow-soft transition-all duration-[600ms] disabled:opacity-50"
                    >
                      {processingId === member.id ? 'Approving...' : 'Approve Member'}
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            approvedMembers.length === 0 ? (
              <div className="text-center py-8 text-surface-on-variant font-body text-xs">
                No active approved members recorded yet.
              </div>
            ) : (
              approvedMembers.map((member) => (
                <div
                  key={member.id}
                  className="p-3.5 rounded-[10px] bg-surface-container-low border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-title text-sm font-semibold text-primary break-words">
                        {member.full_name}
                      </span>
                      <span className="font-label text-[10px] font-bold px-2 py-0.5 rounded bg-tertiary text-tertiary-foreground">
                        ACTIVE
                      </span>
                    </div>
                    <div className="font-body text-xs text-surface-on-variant">
                      <p className="break-all">{member.email}</p>
                      <p className="text-[11px] opacity-75 mt-0.5">
                        Classes Attended: {member.total_classes_attended} • Stripes: {member.stripes_count} • Enrolled:{' '}
                        {new Date(member.enrolled_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="font-label text-xs font-medium text-tertiary bg-tertiary-container text-tertiary-on-container px-2.5 py-1 rounded-[10px] self-start sm:self-auto">
                    Full Access Unlocked
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 py-3 border-t border-outline-variant bg-surface-container-lowest flex items-center justify-between">
          <span className="font-body text-[11px] text-surface-on-variant">
            Approving a student unlocks real-time roll-call attendance and technique grading.
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
