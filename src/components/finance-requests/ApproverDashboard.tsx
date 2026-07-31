'use client';

import { useAuth } from '@/components/context/AuthContext';
import { Tabs } from '@/components/ui';
import { FinanceRequestsPanel } from './FinanceRequestsPanel';
import type { FinanceRequest } from '@/lib/financeRequestsApi';

// Reminder shown on an approved fee reduction — the side-effect is manual.
const feeReductionFollowUp = (req: FinanceRequest) =>
  req.type === 'FEE_REDUCTION' && req.status === 'APPROVED' ? (
    <div className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1.5 inline-block">
      Reduction approved — the Bursar must now reduce the fee on file.
    </div>
  ) : null;

/**
 * Shared finance-requests workspace for Principal+ roles (Principal, Manager,
 * Super Manager). They can approve/reject fee reductions, confirm money they
 * personally receive, create requests, and view everything.
 */
export function ApproverDashboard({ heading }: { heading: string }) {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">{heading}</h1>
        <p className="text-gray-600 mt-1">
          Approve fee reductions, confirm disbursements addressed to you, and review all finance activity.
        </p>
      </div>

      {user?.id ? (
        <Tabs
          tabs={[
            {
              id: 'approvals',
              label: 'Pending Approvals',
              content: (
                <FinanceRequestsPanel
                  title="Fee Reduction Approvals"
                  description="Pending fee-reduction requests awaiting your decision."
                  baseFilters={{ type: 'FEE_REDUCTION', status: 'PENDING' }}
                  emptyMessage="No pending fee-reduction requests."
                  followUpHint={feeReductionFollowUp}
                />
              ),
            },
            {
              id: 'receiving',
              label: "Money I'm Receiving",
              content: (
                <FinanceRequestsPanel
                  title="Disbursements Addressed to Me"
                  description="Confirm receipt of money assigned to you, or reject if incorrect."
                  baseFilters={{
                    type: 'PERSONNEL_DISBURSEMENT',
                    recipientUserId: user.id,
                    status: 'PENDING',
                  }}
                  emptyMessage="No disbursements are awaiting your confirmation."
                />
              ),
            },
            {
              id: 'all',
              label: 'All Requests',
              content: (
                <FinanceRequestsPanel
                  title="All Expense Requisitions"
                  description="Every request across the school."
                  showCreate
                  showTypeFilter
                  showStatusFilter
                  followUpHint={feeReductionFollowUp}
                />
              ),
            },
          ]}
        />
      ) : (
        <div className="text-center text-gray-500 py-12">Loading…</div>
      )}
    </div>
  );
}
