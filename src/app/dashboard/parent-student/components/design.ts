// Small design tokens + helpers shared across the parent portal pages.
// Kept flat + tree-shakeable so pages can import just what they use.

export const CURRENCY = 'FCFA';

export const formatMoney = (n: number | null | undefined): string => {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return `${v.toLocaleString('en-US')} ${CURRENCY}`;
};

export const formatPercent = (n: number | string | null | undefined, digits = 1): string => {
  const v = typeof n === 'number' ? n : parseFloat(String(n ?? 0));
  if (!Number.isFinite(v)) return '0%';
  return `${v.toFixed(digits)}%`;
};

// Colour band for attendance / grade — one place so pill colours stay in sync.
export const attendanceBand = (rate: number): { label: string; className: string } => {
  if (rate >= 95) return { label: 'Excellent', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' };
  if (rate >= 90) return { label: 'Good',      className: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' };
  if (rate >= 80) return { label: 'Fair',      className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' };
  return { label: 'Needs attention', className: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' };
};

export const gradeBand = (avg: number, scale = 20): { label: string; className: string } => {
  const pct = (avg / scale) * 100;
  if (pct >= 85) return { label: 'A · Excellent', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' };
  if (pct >= 70) return { label: 'B · Very good', className: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' };
  if (pct >= 60) return { label: 'C · Good',      className: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' };
  if (pct >= 50) return { label: 'D · Fair',      className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' };
  return { label: 'F · Needs work', className: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' };
};
