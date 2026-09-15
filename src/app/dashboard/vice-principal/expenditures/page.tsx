'use client';

import { ExpendituresWorkspace } from '@/components/expenditures';
import { useLanguage } from '@/components/context/LanguageContext';

export default function VicePrincipalExpendituresPage() {
  const { t } = useLanguage();
  return (
    <ExpendituresWorkspace
      heading={t('Expenditures')}
      subheading={t('Review school spending and the monthly category breakdown.')}
      panelDescription={t('Read-only ledger. Use the filters or export to Excel.')}
    />
  );
}
