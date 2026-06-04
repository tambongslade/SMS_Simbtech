'use client';

import { FinanceRequestsPanel } from '@/components/finance-requests';

export default function FeeAuditorFinanceRequestsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Finance Requests</h1>
        <p className="text-gray-600 mt-1">
          Review all fee reductions, disbursements and bank verifications across the school.
        </p>
      </div>

      <FinanceRequestsPanel
        title="All Finance Requests"
        description="Read-only audit view. You can also clear bank verifications you have checked."
        showTypeFilter
        showStatusFilter
      />
    </div>
  );
}
