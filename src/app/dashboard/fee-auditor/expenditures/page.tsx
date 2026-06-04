'use client';

import { ExpendituresWorkspace } from '@/components/expenditures';

export default function FeeAuditorExpendituresPage() {
  return (
    <ExpendituresWorkspace
      heading="Expenditure Audit"
      subheading="Audit school spending and the monthly category breakdown."
      panelDescription="Read-only ledger. Filter by date range and category, or export to Excel."
    />
  );
}
