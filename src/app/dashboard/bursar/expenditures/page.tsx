'use client';

import { ExpendituresWorkspace } from '@/components/expenditures';
import { useLanguage } from '@/components/context/LanguageContext';

export default function BursarExpendituresPage() {
  const { t } = useLanguage();
  return (
    <ExpendituresWorkspace
      heading={t('Expenditures')}
      subheading={t('Log what the school spends (cash only) and review the monthly sheet. You can edit your own entries within 7 days.')}
      panelDescription={t('Filter by date range and category, attach receipts, and export to Excel.')}
      onlyCashMethod
    />
  );
}
