'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui';
import {
  getExpenditureSummary,
  currentMonth,
  fmtMoney,
  CATEGORY_LABELS,
  type ExpenditureSummary,
  type ExpenditureCategory,
} from '@/lib/expendituresApi';
import { CATEGORY_BAR_COLOR } from './CategoryBadge';

interface MonthlySummaryProps {
  // Notified when the user clicks a category (for deep-linking to a filtered list).
  onSelectCategory?: (category: ExpenditureCategory, month: string) => void;
  // Notified whenever the chosen month changes.
  onMonthChange?: (month: string) => void;
}

export function MonthlySummary({ onSelectCategory, onMonthChange }: MonthlySummaryProps) {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<ExpenditureSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getExpenditureSummary(month);
      setSummary(res);
    } catch {
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const maxAmount = summary?.byCategory.reduce((m, r) => Math.max(m, r.amount), 0) || 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Monthly Summary</h2>
          <p className="text-sm text-gray-500">Total spending broken down by category.</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
          <Input
            type="month"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              onMonthChange?.(e.target.value);
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500 py-8">Loading summary…</div>
      ) : !summary || summary.count === 0 ? (
        <div className="text-center text-gray-500 py-8">No expenditures recorded for this month.</div>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <div className="text-3xl font-bold text-gray-900">{fmtMoney(summary.totalAmount)}</div>
              <div className="text-sm text-gray-500">
                {summary.count} expenditure{summary.count === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {summary.byCategory.map((row) => {
              const pct = maxAmount ? Math.round((row.amount / maxAmount) * 100) : 0;
              const sharePct = summary.totalAmount
                ? Math.round((row.amount / summary.totalAmount) * 100)
                : 0;
              const Comp = onSelectCategory ? 'button' : 'div';
              return (
                <Comp
                  key={row.category}
                  type={onSelectCategory ? 'button' : undefined}
                  onClick={onSelectCategory ? () => onSelectCategory(row.category, month) : undefined}
                  className={`w-full text-left ${onSelectCategory ? 'cursor-pointer group' : ''}`}
                >
                  <div className="flex items-center justify-between text-sm mb-0.5">
                    <span className="font-medium text-gray-700 group-hover:text-blue-600">
                      {CATEGORY_LABELS[row.category]}
                    </span>
                    <span className="text-gray-600">
                      {fmtMoney(row.amount)} · {sharePct}% · {row.count}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${CATEGORY_BAR_COLOR[row.category]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Comp>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
