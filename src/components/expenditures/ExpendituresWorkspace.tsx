'use client';

import { useState } from 'react';
import { MonthlySummary } from './MonthlySummary';
import { ExpendituresPanel } from './ExpendituresPanel';
import { monthBounds, type ExpenditureCategory } from '@/lib/expendituresApi';

interface ExpendituresWorkspaceProps {
  heading: string;
  subheading?: string;
  // Hide the monthly summary widget (e.g. for a pure list view).
  showSummary?: boolean;
  panelTitle?: string;
  panelDescription?: string;
}

/**
 * Full expenditures workspace: a monthly summary widget on top whose category
 * bars deep-link into the filtered ledger below. Shared by every role that can
 * see expenditures; row-level create/edit/delete is gated inside the panel.
 */
export function ExpendituresWorkspace({
  heading,
  subheading,
  showSummary = true,
  panelTitle = 'Expenditure Ledger',
  panelDescription,
}: ExpendituresWorkspaceProps) {
  const [externalFilter, setExternalFilter] = useState<{
    from?: string;
    to?: string;
    category?: ExpenditureCategory | '';
  }>();
  const [nonce, setNonce] = useState(0);

  const handleSelectCategory = (category: ExpenditureCategory, month: string) => {
    const { from, to } = monthBounds(month);
    setExternalFilter({ from, to, category });
    setNonce((n) => n + 1);
  };

  const handleMonthChange = (month: string) => {
    const { from, to } = monthBounds(month);
    setExternalFilter({ from, to });
    setNonce((n) => n + 1);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">{heading}</h1>
        {subheading && <p className="text-gray-600 mt-1">{subheading}</p>}
      </div>

      {showSummary && (
        <MonthlySummary onSelectCategory={handleSelectCategory} onMonthChange={handleMonthChange} />
      )}

      <ExpendituresPanel
        title={panelTitle}
        description={panelDescription}
        externalFilter={externalFilter}
        filterNonce={nonce}
      />
    </div>
  );
}
