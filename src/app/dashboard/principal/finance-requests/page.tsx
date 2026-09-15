'use client';

import { ApproverDashboard } from '@/components/finance-requests';
import { useLanguage } from '@/components/context/LanguageContext';

export default function PrincipalFinanceRequestsPage() {
  const { t } = useLanguage();
  return <ApproverDashboard heading={t('Expense Requisition')} />;
}
