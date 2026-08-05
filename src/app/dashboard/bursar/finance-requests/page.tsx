'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/components/context/AuthContext';
import { Tabs } from '@/components/ui';
import { FinanceRequestsPanel, FinanceRequestDeepLink } from '@/components/finance-requests';
import type { FinanceRequest } from '@/lib/financeRequestsApi';

// The backend settles these two on approval — the Bursar must not re-enter them.
const settledFollowUp = (req: FinanceRequest) => {
  if (req.status !== 'APPROVED') return null;
  if (req.type === 'PAYMENT_CLAIM') {
    return (
      <div className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1 mt-1.5 inline-block">
        Payment recorded automatically — do not record it again.
      </div>
    );
  }
  if (req.type === 'REFUND') {
    return (
      <div className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1 mt-1.5 inline-block">
        Approved by a Super Manager — disburse the money to the parent.
      </div>
    );
  }
  return null;
};

export default function BursarFinanceRequestsPage() {
  const { user } = useAuth();

  const [refreshKey, setRefreshKey] = useState(0);
  const handleActed = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Expense Requisition</h1>
        <p className="text-gray-600 mt-1">
          Validate parent payment claims, raise refunds for Super Manager approval, and track fee
          reductions, personnel disbursements and bank verifications.
        </p>
      </div>

      {user?.id ? (
        <Tabs
          tabs={[
            {
              id: 'claims',
              label: 'Payment Claims',
              content: (
                <FinanceRequestsPanel
                  key={`claims-${refreshKey}`}
                  title="Payment Claims to Validate"
                  description="Proof of payment submitted by parents. Approving records the payment against the student's fees — no separate entry is needed."
                  baseFilters={{ type: 'PAYMENT_CLAIM', status: 'PENDING' }}
                  emptyMessage="No payment claims are awaiting validation."
                  followUpHint={settledFollowUp}
                />
              ),
            },
            {
              id: 'claims-history',
              label: 'Claim History',
              content: (
                <FinanceRequestsPanel
                  key={`claims-history-${refreshKey}`}
                  title="All Payment Claims"
                  description="Every claim submitted, whatever its outcome."
                  baseFilters={{ type: 'PAYMENT_CLAIM' }}
                  showStatusFilter
                  emptyMessage="No payment claims yet."
                  followUpHint={settledFollowUp}
                />
              ),
            },
            {
              id: 'refunds',
              label: 'Refund Requests',
              content: (
                <FinanceRequestsPanel
                  key={`refunds-${refreshKey}`}
                  title="Refund Requests"
                  description="Refunds you have raised against overpayments, awaiting Super Manager approval."
                  baseFilters={{ type: 'REFUND' }}
                  showStatusFilter
                  emptyMessage="No refund requests yet. Raise one from Overpayments & Refunds."
                  followUpHint={settledFollowUp}
                />
              ),
            },
            {
              id: 'mine',
              label: 'My Requests',
              content: (
                <FinanceRequestsPanel
                  key={`mine-${refreshKey}`}
                  title="My Requests"
                  description="Requests you have created, newest first."
                  baseFilters={{ requestedById: user.id }}
                  showCreate
                  showStatusFilter
                  emptyMessage="You haven't created any requests yet."
                  followUpHint={settledFollowUp}
                />
              ),
            },
            {
              id: 'all',
              label: 'All Requests',
              content: (
                <FinanceRequestsPanel
                  key={`all-${refreshKey}`}
                  title="All Expense Requisitions"
                  description="Every request across the school."
                  showTypeFilter
                  showStatusFilter
                  followUpHint={settledFollowUp}
                />
              ),
            },
          ]}
        />
      ) : (
        <div className="text-center text-gray-500 py-12">Loading…</div>
      )}

      <FinanceRequestDeepLink onActed={handleActed} />
    </div>
  );
}
