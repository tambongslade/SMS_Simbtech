'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ReceiptRefundIcon,
  ExclamationCircleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/components/context/LanguageContext';
import { getAuthToken } from '@/lib/auth';
import {
  listFinanceRequests,
  fmtDateTime,
  payloadSummary,
  type FinanceRequest,
} from '@/lib/financeRequestsApi';
import { FinanceRequestDeepLink } from '@/components/finance-requests';
import { useParentDashboard } from '../hooks/useParentDashboard';
import { PaymentClaimModal } from '../components/PaymentClaimModal';
import { formatMoney } from '@/lib/parentPortalApi';

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

const STATUS_META: Record<string, { label: (t: (s: string) => string) => string; ring: string; text: string; bg: string; Icon: any }> = {
  PENDING:   { label: (t) => t('Pending'),   ring: 'ring-amber-100',   text: 'text-amber-700',   bg: 'bg-amber-50',   Icon: ClockIcon },
  APPROVED:  { label: (t) => t('Approved'),  ring: 'ring-emerald-100', text: 'text-emerald-700', bg: 'bg-emerald-50', Icon: CheckCircleIcon },
  COMPLETED: { label: (t) => t('Approved'),  ring: 'ring-emerald-100', text: 'text-emerald-700', bg: 'bg-emerald-50', Icon: CheckCircleIcon },
  REJECTED:  { label: (t) => t('Rejected'),  ring: 'ring-rose-100',    text: 'text-rose-700',    bg: 'bg-rose-50',    Icon: XCircleIcon },
};

function StatTile({ label, value, tone, icon: Icon }: { label: string; value: string | number; tone: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate'; icon: any }) {
  const map: Record<string, string> = {
    blue:    'from-blue-50 text-blue-900',
    emerald: 'from-emerald-50 text-emerald-900',
    amber:   'from-amber-50 text-amber-900',
    rose:    'from-rose-50 text-rose-900',
    slate:   'from-slate-50 text-slate-900',
  };
  return (
    <div className={`rounded-2xl border border-slate-100 shadow-sm bg-gradient-to-br ${map[tone]} to-white p-5`}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-slate-500">
        <Icon className="w-4 h-4" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function StatusPill({ status, t }: { status: string; t: (s: string) => string }) {
  const meta = STATUS_META[status] || STATUS_META.PENDING;
  const { Icon } = meta;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ring-1 ${meta.bg} ${meta.text} ${meta.ring} px-2.5 py-1 text-xs font-medium`}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label(t)}
    </span>
  );
}

function ClaimCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 sm:p-5 animate-pulse space-y-3">
      <div className="flex justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 bg-slate-100 rounded" />
          <div className="h-3 w-1/2 bg-slate-100 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 bg-slate-100 rounded ml-auto" />
          <div className="h-5 w-16 bg-slate-100 rounded-full ml-auto" />
        </div>
      </div>
      <div className="h-3 w-full bg-slate-100 rounded" />
      <div className="h-3 w-40 bg-slate-100 rounded" />
    </div>
  );
}

export default function ParentPaymentsPage() {
  const { t } = useLanguage();
  const { data } = useParentDashboard();
  const children = data?.children ?? [];

  const STATUS_NOTE: Record<string, string> = {
    PENDING:   t('Waiting for the Bursar to verify this against the bank record.'),
    APPROVED:  t('Confirmed — this payment is now on your child’s fee statement.'),
    REJECTED:  t('The Bursar could not match this payment. See their note below.'),
    COMPLETED: t('Confirmed — this payment is now on your child’s fee statement.'),
  };

  const [claims, setClaims] = useState<FinanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');

  const [hasToken, setHasToken] = useState(true);
  useEffect(() => { setHasToken(!!getAuthToken()); }, []);

  const load = useCallback(async (background = false) => {
    if (!getAuthToken()) {
      setClaims([]);
      setIsLoading(false);
      return;
    }
    if (background) setRefreshing(true); else setIsLoading(true);
    try {
      const res = await listFinanceRequests({ type: 'PAYMENT_CLAIM', limit: 50 });
      setClaims(res.data);
    } catch {
      setClaims([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const total = claims.length;
    const pending = claims.filter(c => c.status === 'PENDING').length;
    const approved = claims.filter(c => c.status === 'APPROVED' || c.status === 'COMPLETED').length;
    const rejected = claims.filter(c => c.status === 'REJECTED').length;
    const totalApprovedAmount = claims
      .filter(c => c.status === 'APPROVED' || c.status === 'COMPLETED')
      .reduce((s, c) => s + (Number(c.amount) || 0), 0);
    return { total, pending, approved, rejected, totalApprovedAmount };
  }, [claims]);

  const filtered = useMemo(() => {
    return claims.filter(c => {
      const statusOk = statusFilter === 'ALL'
        ? true
        : statusFilter === 'APPROVED'
          ? c.status === 'APPROVED' || c.status === 'COMPLETED'
          : c.status === statusFilter;
      if (!statusOk) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        c.reason?.toLowerCase().includes(q)
        || String(c.amount ?? '').includes(q)
        || (payloadSummary(c) || '').toLowerCase().includes(q)
      );
    });
  }, [claims, statusFilter, search]);

  const filters: Array<{ key: StatusFilter; label: string; count: number }> = [
    { key: 'ALL',      label: t('All'),      count: stats.total },
    { key: 'PENDING',  label: t('Pending'),  count: stats.pending },
    { key: 'APPROVED', label: t('Approved'), count: stats.approved },
    { key: 'REJECTED', label: t('Rejected'), count: stats.rejected },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
        {/* Header */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6 sm:p-8">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">{t('Payments')}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 inline-flex items-center gap-2">
                <ReceiptRefundIcon className="w-7 h-7 text-slate-500" />
                {t('My Payments')}
              </h1>
              <p className="mt-2 text-sm text-slate-500 max-w-xl">
                {t("Tell the school about a payment you made at the bank or an agency, and follow it until it lands on your child's fee statement.")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => load(true)}
                disabled={refreshing || isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition"
              >
                <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {t('Refresh')}
              </button>
              <button
                onClick={() => setCreateOpen(true)}
                disabled={!hasToken}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title={!hasToken ? t('Sign in with your parent account to submit a payment.') : undefined}
              >
                {!hasToken ? <LockClosedIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                {t('Submit Payment')}
              </button>
            </div>
          </div>
        </div>

        {/* Sign-in banner */}
        {!hasToken && (
          <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white border border-amber-100 p-5 flex gap-3">
            <div className="shrink-0 h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-sm text-slate-800">
              <p className="font-semibold text-slate-900">{t('Sign in to submit a payment')}</p>
              <p className="mt-1 text-slate-600">
                {t("You're browsing with a matricule only. Sign in with the parent account the school created for you to submit proof of payment and track it here.")}
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        {hasToken && !isLoading && claims.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatTile label={t('Total Submitted')} value={stats.total} tone="blue" icon={BanknotesIcon} />
            <StatTile label={t('Pending Review')} value={stats.pending} tone="amber" icon={ClockIcon} />
            <StatTile label={t('Approved')} value={stats.approved} tone="emerald" icon={CheckCircleIcon} />
            <StatTile label={t('Approved Total')} value={formatMoney(stats.totalApprovedAmount)} tone="slate" icon={ReceiptRefundIcon} />
          </div>
        )}

        {/* Search + status filter */}
        {hasToken && !isLoading && claims.length > 0 && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('Search by reason, amount, receipt…')}
                className="w-full pl-10 pr-3 py-2.5 rounded-full text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map(f => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition ${
                    statusFilter === f.key
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300'
                  }`}
                >
                  {f.label}
                  <span className={`inline-flex min-w-5 h-5 items-center justify-center rounded-full text-[10px] px-1 ${
                    statusFilter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Claims / states */}
        {isLoading ? (
          <div className="space-y-3">
            <ClaimCardSkeleton />
            <ClaimCardSkeleton />
            <ClaimCardSkeleton />
          </div>
        ) : !hasToken ? (
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-10 text-center">
            <LockClosedIcon className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-base font-semibold text-slate-900">{t('Sign in to view your payments')}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {t('Sign in with your parent account to submit a payment.')}
            </p>
          </div>
        ) : claims.length === 0 ? (
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-10 text-center">
            <BanknotesIcon className="mx-auto h-14 w-14 text-slate-300" />
            <h3 className="mt-3 text-base font-semibold text-slate-900">{t('No payments submitted yet')}</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              {t('When you pay at the bank, submit the receipt here so the school can record it.')}
            </p>
            <button
              onClick={() => setCreateOpen(true)}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition"
            >
              <PlusIcon className="w-4 h-4" />
              {t('Submit your first payment')}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-10 text-center">
            <ExclamationCircleIcon className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-base font-semibold text-slate-900">{t('No matches')}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {t('Try a different search term or clear the status filter.')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((claim) => {
              const summary = payloadSummary(claim);
              return (
                <div
                  key={claim.id}
                  className="group rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all p-4 sm:p-5"
                >
                  {/* Top row */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 break-words">
                        {claim.reason}
                      </p>
                      {summary && (
                        <p className="text-xs text-slate-500 mt-0.5 break-words">{summary}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-base font-semibold text-slate-900 tabular-nums">
                        {formatMoney(Number(claim.amount ?? 0))}
                      </span>
                      <StatusPill status={claim.status} t={t} />
                    </div>
                  </div>

                  {/* Bursar-facing note */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-xs text-slate-600">{STATUS_NOTE[claim.status]}</p>
                    {claim.actedNotes && (
                      <div className="text-xs text-slate-700 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                        <span className="font-medium text-slate-500">{t('Bursar')}:</span>{' '}
                        <span className="italic">&ldquo;{claim.actedNotes}&rdquo;</span>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{t('Submitted')} · {fmtDateTime(claim.createdAt)}</span>
                      {claim.actedAt && (
                        <span>{t('Reviewed')} · {fmtDateTime(claim.actedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PaymentClaimModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => load(true)}
        childrenOptions={children}
      />

      <FinanceRequestDeepLink onActed={() => load(true)} />
    </div>
  );
}
