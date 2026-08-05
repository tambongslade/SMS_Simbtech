'use client';

import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { Tabs } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import {
  FinanceRequestsPanel,
  FinanceRequestDeepLink,
  requesterTabs,
} from '@/components/finance-requests';
import type { FinanceRequest } from '@/lib/financeRequestsApi';

// After a bank verification is marked complete, remind the team to record the
// payment normally via the standard payment flow.
const bankFollowUp = (req: FinanceRequest) =>
  req.type === 'BANK_VERIFICATION' && req.status === 'COMPLETED' ? (
    <div className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 mt-1.5 inline-block">
      Verified — the Bursar can now record this payment normally.
    </div>
  ) : null;

export default function SecretaryFinanceRequestsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <Link
          href="/dashboard/secretary"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-1.5 sm:hidden"
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" />
          Menu
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Finance Requests</h1>
        <p className="text-sm text-gray-600 mt-1">
          Ask the Bursar for money you need, and check the bank for parent-claimed deposits.
        </p>
      </div>

      <Tabs
        tabs={[
          ...(user?.id ? requesterTabs(user.id) : []),
          {
            id: 'pending',
            label: 'Pending',
            content: (
              <FinanceRequestsPanel
                title="Pending Verifications"
                description="Mark verified once you find the deposit, or reject if the bank has no record."
                baseFilters={{ type: 'BANK_VERIFICATION', status: 'PENDING' }}
                emptyMessage="No bank verifications are pending."
                followUpHint={bankFollowUp}
              />
            ),
          },
          {
            id: 'all',
            label: 'All Verifications',
            content: (
              <FinanceRequestsPanel
                title="All Bank Verifications"
                description="Full history of bank verification requests."
                baseFilters={{ type: 'BANK_VERIFICATION' }}
                showStatusFilter
                emptyMessage="No bank verifications found."
                followUpHint={bankFollowUp}
              />
            ),
          },
        ]}
      />

      <FinanceRequestDeepLink />
    </div>
  );
}
