'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/components/context/AuthContext';
import { Tabs } from '@/components/ui';
import { FinanceRequestsPanel } from './FinanceRequestsPanel';
import { FinanceRequestDeepLink } from './FinanceRequestDeepLink';
import type { FinanceRequest } from '@/lib/financeRequestsApi';

// Reminder shown on an approved fee reduction — the side-effect is manual.
const feeReductionFollowUp = (req: FinanceRequest) =>
  req.type === 'FEE_REDUCTION' && req.status === 'APPROVED' ? (
    <div className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1.5 inline-block">
      Reduction approved — the Bursar must now reduce the fee on file.
    </div>
  ) : null;

// Payment claims and refunds are settled by the backend on approval, so the
// approver never needs to record the money a second time.
const settledFollowUp = (req: FinanceRequest) => {
  if (req.status === 'APPROVED' && req.type === 'PAYMENT_CLAIM') {
    return (
      <div className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1 mt-1.5 inline-block">
        Payment recorded automatically — no manual entry needed.
      </div>
    );
  }
  if (req.status === 'APPROVED' && req.type === 'REFUND') {
    return (
      <div className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1 mt-1.5 inline-block">
        Refund issued and fees adjusted automatically.
      </div>
    );
  }
  return feeReductionFollowUp(req);
};

/**
 * Shared finance-requests workspace for Principal+ roles (Principal, Manager,
 * Super Manager). They can approve/reject fee reductions and payment claims,
 * confirm money they personally receive, and — for Super Managers only —
 * approve refunds. Creating a request is available here too.
 */
export function ApproverDashboard({ heading }: { heading: string }) {
  const { user, selectedRole } = useAuth();
  const isSuperManager = selectedRole === 'SUPER_MANAGER';

  // Bumped after a deep-linked action so the visible panels re-fetch.
  const [refreshKey, setRefreshKey] = useState(0);
  const handleActed = useCallback(() => setRefreshKey((k) => k + 1), []);

  const tabs = [
    {
      id: 'approvals',
      label: 'Pending Approvals',
      content: (
        <FinanceRequestsPanel
          key={`approvals-${refreshKey}`}
          title="Fee Reduction Approvals"
          description="Pending fee-reduction requests awaiting your decision."
          baseFilters={{ type: 'FEE_REDUCTION' as const, status: 'PENDING' as const }}
          emptyMessage="No pending fee-reduction requests."
          followUpHint={feeReductionFollowUp}
        />
      ),
    },
    {
      id: 'claims',
      label: 'Payment Claims',
      content: (
        <FinanceRequestsPanel
          key={`claims-${refreshKey}`}
          title="Payment Claims"
          description="Proof of payment submitted by parents. Approving records the payment against the student's fees."
          baseFilters={{ type: 'PAYMENT_CLAIM' as const, status: 'PENDING' as const }}
          emptyMessage="No payment claims awaiting validation."
          followUpHint={settledFollowUp}
        />
      ),
    },
  ];

  if (isSuperManager) {
    tabs.push({
      id: 'refunds',
      label: 'Refund Approvals',
      content: (
        <FinanceRequestsPanel
          key={`refunds-${refreshKey}`}
          title="Refund Approvals"
          description="Refunds raised against overpayments. Approving issues the refund and reduces the amount paid on file."
          baseFilters={{ type: 'REFUND' as const, status: 'PENDING' as const }}
          emptyMessage="No refund requests awaiting approval."
          followUpHint={settledFollowUp}
        />
      ),
    });
  }

  if (user?.id) {
    tabs.push({
      id: 'receiving',
      label: "Money I'm Receiving",
      content: (
        <FinanceRequestsPanel
          key={`receiving-${refreshKey}`}
          title="Disbursements Addressed to Me"
          description="Confirm receipt of money assigned to you, or reject if incorrect."
          baseFilters={{
            type: 'PERSONNEL_DISBURSEMENT' as const,
            recipientUserId: user.id,
            status: 'PENDING' as const,
          }}
          emptyMessage="No disbursements are awaiting your confirmation."
        />
      ),
    });
  }

  tabs.push({
    id: 'all',
    label: 'All Requests',
    content: (
      <FinanceRequestsPanel
        key={`all-${refreshKey}`}
        title="All Expense Requisitions"
        description="Every request across the school."
        showCreate
        showTypeFilter
        showStatusFilter
        followUpHint={settledFollowUp}
      />
    ),
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">{heading}</h1>
        <p className="text-gray-600 mt-1">
          Approve fee reductions and parent payment claims
          {isSuperManager ? ', sign off refunds' : ''}, confirm disbursements addressed to you, and
          review all finance activity.
        </p>
      </div>

      {user?.id ? (
        <Tabs tabs={tabs} />
      ) : (
        <div className="text-center text-gray-500 py-12">Loading…</div>
      )}

      <FinanceRequestDeepLink onActed={handleActed} />
    </div>
  );
}
