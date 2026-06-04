'use client';

import { ExpendituresWorkspace } from '@/components/expenditures';

export default function PrincipalExpendituresPage() {
  return (
    <ExpendituresWorkspace
      heading="Expenditure Oversight"
      subheading="Monitor school spending. You can edit or delete any expenditure at any time."
      panelDescription="Latest entries across the school. Click a summary category to drill in."
    />
  );
}
