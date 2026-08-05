'use client';

import type { FinanceRequestStatus, FinanceRequestType } from '@/lib/financeRequestsApi';
import { STATUS_LABELS, TYPE_LABELS } from '@/lib/financeRequestsApi';

const STATUS_STYLES: Record<FinanceRequestStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
};

const TYPE_STYLES: Record<FinanceRequestType, string> = {
  FEE_REDUCTION: 'bg-purple-100 text-purple-800',
  PERSONNEL_DISBURSEMENT: 'bg-cyan-100 text-cyan-800',
  BANK_VERIFICATION: 'bg-slate-100 text-slate-800',
  PAYMENT_CLAIM: 'bg-green-100 text-green-800',
  REFUND: 'bg-orange-100 text-orange-800',
};

export function StatusBadge({ status }: { status: FinanceRequestStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function TypeBadge({ type }: { type: FinanceRequestType }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[type]}`}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}
