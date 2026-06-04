'use client';

import { ExpendituresWorkspace } from '@/components/expenditures';

export default function BursarExpendituresPage() {
  return (
    <ExpendituresWorkspace
      heading="Expenditures"
      subheading="Log what the school spends and review the monthly sheet. You can edit your own entries within 7 days."
      panelDescription="Filter by date range and category, attach receipts, and export to Excel."
    />
  );
}
