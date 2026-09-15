'use client';

import { useLanguage } from '@/components/context/LanguageContext';
import { ExpendituresWorkspace } from '@/components/expenditures';

export default function SecretaryExpendituresPage() {
  const { t } = useLanguage();
  return (
    <ExpendituresWorkspace
      heading={t('Expenditures')}
      subheading={t('Review school spending and the monthly category breakdown.')}
      panelDescription={t('Read-only ledger. Use the filters or export to Excel.')}
    />
  );
}
