'use client';

import { ExpendituresWorkspace } from '@/components/expenditures';

export default function SecretaryExpendituresPage() {
  return (
    <ExpendituresWorkspace
      heading="Expenditures"
      subheading="Review school spending and the monthly category breakdown."
      panelDescription="Read-only ledger. Use the filters or export to Excel."
    />
  );
}
