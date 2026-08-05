'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui';
import { getAuthToken } from '@/lib/auth';
import {
  listFinanceRequests,
  fmtMoney,
  fmtDateTime,
  payloadSummary,
  type FinanceRequest,
} from '@/lib/financeRequestsApi';
import { StatusBadge, FinanceRequestDeepLink } from '@/components/finance-requests';
import { useParentDashboard } from '../hooks/useParentDashboard';
import { PaymentClaimModal } from '../components/PaymentClaimModal';

// Parent-friendly wording for each outcome of a payment claim.
const STATUS_NOTE: Record<string, string> = {
  PENDING: 'Waiting for the Bursar to verify this against the bank record.',
  APPROVED: 'Confirmed — this payment is now on your child’s fee statement.',
  REJECTED: 'The Bursar could not match this payment. See their note below.',
  COMPLETED: 'Confirmed — this payment is now on your child’s fee statement.',
};

export default function ParentPaymentsPage() {
  const { data } = useParentDashboard();
  const children = data?.children ?? [];

  const [claims, setClaims] = useState<FinanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // The portal's matricule-only session has no token; submitting a claim needs
  // a real parent account.
  const [hasToken, setHasToken] = useState(true);
  useEffect(() => {
    setHasToken(!!getAuthToken());
  }, []);

  const load = useCallback(async () => {
    if (!getAuthToken()) {
      setClaims([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await listFinanceRequests({ type: 'PAYMENT_CLAIM', limit: 50 });
      setClaims(res.data);
    } catch {
      setClaims([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 sm:p-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Payments</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Tell the school about a payment you made at the bank or an agency, and follow it until
            it lands on your child&apos;s fee statement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={ArrowPathIcon} onClick={load} disabled={isLoading}>
            Refresh
          </Button>
          <Button
            color="primary"
            size="sm"
            leftIcon={PlusIcon}
            onClick={() => setCreateOpen(true)}
            disabled={!hasToken}
          >
            Submit Payment
          </Button>
        </div>
      </div>

      {!hasToken && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">Sign in to submit a payment</p>
            <p className="mt-0.5">
              You&apos;re browsing with a matricule only. Sign in with the parent account the school
              created for you to submit proof of payment and track it here.
            </p>
          </div>
        </div>
      )}

      {/* Claims */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-10 text-center text-gray-500">
          Loading your payments…
        </div>
      ) : claims.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-12 text-center">
          <BanknotesIcon className="mx-auto h-10 w-10 text-gray-300" />
          <h3 className="mt-3 text-sm font-medium text-gray-900">No payments submitted yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            {hasToken
              ? 'When you pay at the bank, submit the receipt here so the school can record it.'
              : 'Sign in with your parent account to submit a payment.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 break-words">
                    {claim.reason}
                  </div>
                  <div className="text-xs text-gray-500 break-words">{payloadSummary(claim)}</div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-900">
                    {fmtMoney(claim.amount)}
                  </span>
                  <StatusBadge status={claim.status} />
                </div>
              </div>

              <p className="text-xs text-gray-600">{STATUS_NOTE[claim.status]}</p>

              {claim.actedNotes && (
                <p className="text-xs text-gray-500 italic bg-gray-50 rounded px-2 py-1.5">
                  Bursar: “{claim.actedNotes}”
                </p>
              )}

              <div className="text-xs text-gray-400">
                Submitted {fmtDateTime(claim.createdAt)}
                {claim.actedAt ? ` · Reviewed ${fmtDateTime(claim.actedAt)}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      <PaymentClaimModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => load()}
        childrenOptions={children}
      />

      <FinanceRequestDeepLink onActed={load} />
    </div>
  );
}
