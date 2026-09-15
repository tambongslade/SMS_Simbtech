'use client';

import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { Tabs } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import { useLanguage } from '@/components/context/LanguageContext';
import {
  FinanceRequestsPanel,
  FinanceRequestDeepLink,
  requesterTabs,
} from '@/components/finance-requests';
import type { FinanceRequest } from '@/lib/financeRequestsApi';

export default function SecretaryFinanceRequestsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  // After a bank verification is marked complete, remind the team to record the
  // payment normally via the standard payment flow.
  const bankFollowUp = (req: FinanceRequest) =>
    req.type === 'BANK_VERIFICATION' && req.status === 'COMPLETED' ? (
      <div className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 mt-1.5 inline-block">
        {t('Verified — the Bursar can now record this payment normally.')}
      </div>
    ) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <Link
          href="/dashboard/secretary"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-1.5 sm:hidden"
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" />
          {t('Menu')}
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('Finance Requests')}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {t('Ask the Bursar for money you need, and check the bank for parent-claimed deposits.')}
        </p>
      </div>

      <Tabs
        tabs={[
          ...(user?.id ? requesterTabs(user.id) : []),
          {
            id: 'pending',
            label: t('Pending'),
            content: (
              <FinanceRequestsPanel
                title={t('Pending Verifications')}
                description={t('Mark verified once you find the deposit, or reject if the bank has no record.')}
                baseFilters={{ type: 'BANK_VERIFICATION', status: 'PENDING' }}
                emptyMessage={t('No bank verifications are pending.')}
                followUpHint={bankFollowUp}
              />
            ),
          },
          {
            id: 'all',
            label: t('All Verifications'),
            content: (
              <FinanceRequestsPanel
                title={t('All Bank Verifications')}
                description={t('Full history of bank verification requests.')}
                baseFilters={{ type: 'BANK_VERIFICATION' }}
                showStatusFilter
                emptyMessage={t('No bank verifications found.')}
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
