'use client';

import { useAuth } from '@/components/context/AuthContext';
import { Tabs } from '@/components/ui';
import { FinanceRequestsPanel } from '@/components/finance-requests';

export default function BursarFinanceRequestsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Expense Requisition</h1>
        <p className="text-gray-600 mt-1">
          Raise fee reductions, personnel disbursements and bank verifications, and track their status.
        </p>
      </div>

      {user?.id ? (
        <Tabs
          tabs={[
            {
              id: 'mine',
              label: 'My Requests',
              content: (
                <FinanceRequestsPanel
                  title="My Requests"
                  description="Requests you have created, newest first."
                  baseFilters={{ requestedById: user.id }}
                  showCreate
                  showStatusFilter
                  emptyMessage="You haven't created any requests yet."
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
                  showTypeFilter
                  showStatusFilter
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
