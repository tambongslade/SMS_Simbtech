'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/components/context/AuthContext';
import { Tabs } from '@/components/ui';
import { FinanceRequestsPanel } from './FinanceRequestsPanel';
import { FinanceRequestDeepLink } from './FinanceRequestDeepLink';

export interface FinanceTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

/**
 * The two tabs every member of staff gets: what they've asked the Bursar for,
 * and what's waiting for them to confirm receipt of.
 *
 * Exported so roles that already have an oversight page (Vice Principal, Fee
 * Auditor, Secretary) can append them rather than getting a second page.
 */
export const requesterTabs = (userId: number, refreshKey: number = 0): FinanceTab[] => [
  {
    id: 'my-requests',
    label: 'My Requests',
    content: (
      <FinanceRequestsPanel
        key={`my-requests-${refreshKey}`}
        title="My Money Requests"
        description="What you have asked the Bursar for, and where each request stands."
        baseFilters={{ requestedById: userId }}
        showCreate
        allowedCreateTypes={['PERSONNEL_DISBURSEMENT']}
        showStatusFilter
        emptyMessage="You haven't requested any money yet."
      />
    ),
  },
  {
    id: 'receiving',
    label: "Money I'm Receiving",
    content: (
      <FinanceRequestsPanel
        key={`receiving-${refreshKey}`}
        title="Money Addressed to Me"
        description="Confirm receipt once the money reaches you, or reject if something is wrong."
        baseFilters={{ type: 'PERSONNEL_DISBURSEMENT', recipientUserId: userId }}
        showStatusFilter
        emptyMessage="Nothing is waiting for your confirmation."
      />
    ),
  },
];

/**
 * "Request Money" workspace for staff outside the finance team — Discipline
 * Masters, HODs, teachers, the nurse and so on.
 *
 * They raise a PERSONNEL_DISBURSEMENT naming themselves as the recipient and
 * see only their own requests. The Bursar validates it; once approved, they
 * confirm the cash actually reached them.
 */
export function RequesterDashboard({
  heading = 'Request Money',
  description = 'Ask the Bursar for money you need, and confirm what you receive. The Bursar validates every request.',
}: {
  heading?: string;
  description?: string;
} = {}) {
  const { user } = useAuth();

  const [refreshKey, setRefreshKey] = useState(0);
  const handleActed = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{heading}</h1>
        <p className="text-gray-600 mt-1 text-sm">{description}</p>
      </div>

      {user?.id ? (
        <Tabs tabs={requesterTabs(user.id, refreshKey)} />
      ) : (
        <div className="text-center text-gray-500 py-12">Loading…</div>
      )}

      <FinanceRequestDeepLink onActed={handleActed} />
    </div>
  );
}
