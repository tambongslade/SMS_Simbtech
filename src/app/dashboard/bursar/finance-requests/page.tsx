'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/components/context/AuthContext';
import { useLanguage } from '@/components/context/LanguageContext';
import { Tabs } from '@/components/ui';
import { FinanceRequestsPanel, FinanceRequestDeepLink } from '@/components/finance-requests';
import type { FinanceRequest } from '@/lib/financeRequestsApi';

export default function BursarFinanceRequestsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [refreshKey, setRefreshKey] = useState(0);
  const handleActed = useCallback(() => setRefreshKey((k) => k + 1), []);

  // The backend settles these two on approval — the Bursar must not re-enter them.
  const settledFollowUp = (req: FinanceRequest) => {
    if (req.status !== 'APPROVED') return null;
    if (req.type === 'PAYMENT_CLAIM') {
      return (
        <div className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1 mt-1.5 inline-block">
          {t('Payment recorded automatically — do not record it again.')}
        </div>
      );
    }
    if (req.type === 'REFUND') {
      return (
        <div className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1 mt-1.5 inline-block">
          {t('Approved by a Super Manager — disburse the money to the parent.')}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('Expense Requisition')}</h1>
        <p className="text-gray-600 mt-1">
          {t('Validate parent payment claims, raise refunds for Super Manager approval, and track staff money requests, fee reductions and bank verifications.')}
        </p>
      </div>

      {user?.id ? (
        <Tabs
          tabs={[
            {
              id: 'claims',
              label: t('Payment Claims'),
              content: (
                <FinanceRequestsPanel
                  key={`claims-${refreshKey}`}
                  title={t('Payment Claims to Validate')}
                  description={t("Proof of payment submitted by parents. Approving records the payment against the student's fees — no separate entry is needed.")}
                  baseFilters={{ type: 'PAYMENT_CLAIM', status: 'PENDING' }}
                  emptyMessage={t('No payment claims are awaiting validation.')}
                  followUpHint={settledFollowUp}
                />
              ),
            },
            {
              id: 'claims-history',
              label: t('Claim History'),
              content: (
                <FinanceRequestsPanel
                  key={`claims-history-${refreshKey}`}
                  title={t('All Payment Claims')}
                  description={t('Every claim submitted, whatever its outcome.')}
                  baseFilters={{ type: 'PAYMENT_CLAIM' }}
                  showStatusFilter
                  emptyMessage={t('No payment claims yet.')}
                  followUpHint={settledFollowUp}
                />
              ),
            },
            {
              id: 'money-requests',
              label: t('Staff Money Requests'),
              content: (
                <FinanceRequestsPanel
                  key={`money-requests-${refreshKey}`}
                  title={t('Money Requested by Staff')}
                  description={t('Requests from teachers, HODs, discipline masters and other personnel — what to disburse. Only the recipient or Principal+ can settle a request, so there are no action buttons here.')}
                  baseFilters={{ type: 'PERSONNEL_DISBURSEMENT' }}
                  showStatusFilter
                  emptyMessage={t('No staff money requests yet.')}
                />
              ),
            },
            {
              id: 'refunds',
              label: t('Refund Requests'),
              content: (
                <FinanceRequestsPanel
                  key={`refunds-${refreshKey}`}
                  title={t('Refund Requests')}
                  description={t('Refunds you have raised against overpayments, awaiting Super Manager approval.')}
                  baseFilters={{ type: 'REFUND' }}
                  showStatusFilter
                  emptyMessage={t('No refund requests yet. Raise one from Overpayments & Refunds.')}
                  followUpHint={settledFollowUp}
                />
              ),
            },
            {
              id: 'mine',
              label: t('My Requests'),
              content: (
                <FinanceRequestsPanel
                  key={`mine-${refreshKey}`}
                  title={t('My Requests')}
                  description={t('Requests you have created, newest first.')}
                  baseFilters={{ requestedById: user.id }}
                  showCreate
                  showStatusFilter
                  emptyMessage={t("You haven't created any requests yet.")}
                  followUpHint={settledFollowUp}
                />
              ),
            },
            {
              id: 'all',
              label: t('All Requests'),
              content: (
                <FinanceRequestsPanel
                  key={`all-${refreshKey}`}
                  title={t('All Expense Requisitions')}
                  description={t('Every request across the school.')}
                  showTypeFilter
                  showStatusFilter
                  followUpHint={settledFollowUp}
                />
              ),
            },
          ]}
        />
      ) : (
        <div className="text-center text-gray-500 py-12">{t('Loading…')}</div>
      )}

      <FinanceRequestDeepLink onActed={handleActed} />
    </div>
  );
}
