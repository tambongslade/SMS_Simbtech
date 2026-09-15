'use client';

import { useAuth } from '@/components/context/AuthContext';
import { useLanguage } from '@/components/context/LanguageContext';
import { Tabs } from '@/components/ui';
import {
  FinanceRequestsPanel,
  FinanceRequestDeepLink,
  requesterTabs,
} from '@/components/finance-requests';

export default function FeeAuditorFinanceRequestsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('Expense Requisition')}</h1>
        <p className="text-gray-600 mt-1 text-sm">
          {t('Ask the Bursar for money you need, and audit every fee reduction, disbursement and bank verification across the school.')}
        </p>
      </div>

      <Tabs
        tabs={[
          ...(user?.id ? requesterTabs(user.id) : []),
          {
            id: 'all',
            label: t('All Requests'),
            content: (
              <FinanceRequestsPanel
                title={t('All Expense Requisitions')}
                description={t('Read-only audit view. You can also clear bank verifications you have checked.')}
                showTypeFilter
                showStatusFilter
              />
            ),
          },
        ]}
      />

      <FinanceRequestDeepLink />
    </div>
  );
}
