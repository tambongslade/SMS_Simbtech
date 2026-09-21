'use client';

import { useLanguage } from '@/components/context/LanguageContext';
import { ExpendituresWorkspace } from '@/components/expenditures';

export default function FeeAuditorExpendituresPage() {
  const { t } = useLanguage();
  return (
    <ExpendituresWorkspace
      heading={t('Expenditure Audit')}
      subheading={t('Audit school spending and the monthly category breakdown.')}
      panelDescription={t('Read-only ledger. Filter by date range and category, or export to Excel.')}
    />
  );
}
