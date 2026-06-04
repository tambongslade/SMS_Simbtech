'use client';

import type { ExpenditureCategory } from '@/lib/expendituresApi';
import { CATEGORY_LABELS } from '@/lib/expendituresApi';

const STYLES: Record<ExpenditureCategory, string> = {
  SALARY: 'bg-indigo-100 text-indigo-800',
  SUPPLIES: 'bg-blue-100 text-blue-800',
  MAINTENANCE: 'bg-amber-100 text-amber-800',
  EVENT: 'bg-pink-100 text-pink-800',
  UTILITY: 'bg-cyan-100 text-cyan-800',
  TRANSPORT: 'bg-emerald-100 text-emerald-800',
  OTHER: 'bg-gray-100 text-gray-700',
};

export function CategoryBadge({ category }: { category: ExpenditureCategory }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STYLES[category]}`}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}

export const CATEGORY_BAR_COLOR: Record<ExpenditureCategory, string> = {
  SALARY: 'bg-indigo-500',
  SUPPLIES: 'bg-blue-500',
  MAINTENANCE: 'bg-amber-500',
  EVENT: 'bg-pink-500',
  UTILITY: 'bg-cyan-500',
  TRANSPORT: 'bg-emerald-500',
  OTHER: 'bg-gray-400',
};
