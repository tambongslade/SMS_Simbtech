'use client';

import { ExpendituresWorkspace } from '@/components/expenditures';
import { useLanguage } from '@/components/context/LanguageContext';

export default function PrincipalExpendituresPage() {
  const { t } = useLanguage();
  return (
    <ExpendituresWorkspace
      heading={t('Expenditure Oversight')}
      subheading={t('Monitor school spending. You can edit or delete any expenditure at any time.')}
      panelDescription={t('Latest entries across the school. Click a summary category to drill in.')}
    />
  );
}
