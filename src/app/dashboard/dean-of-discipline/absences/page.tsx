'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/components/context/AuthContext';
import { useLanguage } from '@/components/context/LanguageContext';
import { apiService } from '@/lib/apiService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

type Range = 'today' | 'week' | 'month' | 'all';

interface AbsenceRow {
  id: number;
  absenceType: 'CLASS_ABSENCE' | 'MORNING_LATENESS' | string;
  isExcused: boolean;
  excuseReason: string | null;
  excusedAt: string | null;
  makeupStatus: string;
  createdAt: string;
  student: { id: number; name: string; matricule: string | null } | null;
  subClass: { id: number; name: string; class: { id: number; name: string } } | null;
  assignedBy: { id: number; name: string } | null;
  excusedBy: { id: number; name: string } | null;
  teacherPeriod: {
    id: number;
    subject: { id: number; name: string } | null;
    period: { id: number; name: string; startTime: string | null; endTime: string | null } | null;
  } | null;
}

interface ListResponse {
  success: boolean;
  data: AbsenceRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function rangeToDates(range: Range): { from?: string; to?: string } {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  if (range === 'today') return { from: toISO(now), to: toISO(now) };
  if (range === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return { from: toISO(start), to: toISO(now) };
  }
  if (range === 'month') {
    const start = new Date(now);
    start.setDate(now.getDate() - 29);
    return { from: toISO(start), to: toISO(now) };
  }
  const yearStart = new Date(now.getFullYear() - 1, 8, 1);
  return { from: toISO(yearStart), to: toISO(now) };
}

const PAGE_SIZE = 50;

function ClassAbsencesPageInner() {
  const { selectedAcademicYear } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Derive "Back to Overview" URL from the current role prefix (e.g.
  // "/dashboard/discipline-master/absences" -> "/dashboard/discipline-master/overview").
  // Falls back to the dean-of-discipline overview for role prefixes that don't ship one.
  const overviewHref = useMemo(() => {
    const withOverview = (pathname ?? '').replace(/\/absences\/?$/, '/overview');
    if (!withOverview || withOverview === pathname) return '/dashboard/dean-of-discipline/overview';
    if (
      withOverview.startsWith('/dashboard/senior-discipline-master') ||
      withOverview.startsWith('/dashboard/discipline-coordinator')
    ) {
      return '/dashboard/dean-of-discipline/overview';
    }
    return withOverview;
  }, [pathname]);

  const initialRange = (searchParams.get('range') as Range) || 'today';
  const initialFrom = searchParams.get('from') || rangeToDates(initialRange).from || '';
  const initialTo = searchParams.get('to') || rangeToDates(initialRange).to || '';
  const initialExcused = searchParams.get('is_excused') || 'all';

  const [range, setRange] = useState<Range>(initialRange);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [excusedFilter, setExcusedFilter] = useState<string>(initialExcused);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AbsenceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('absence_type', 'CLASS_ABSENCE');
    if (selectedAcademicYear?.id) params.set('academic_year_id', String(selectedAcademicYear.id));
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (excusedFilter !== 'all') params.set('is_excused', excusedFilter);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));

    apiService
      .get(`/discipline/absences?${params.toString()}`)
      .then((res: any) => {
        if (cancelled) return;
        const resp = (res as ListResponse) ?? { data: [], meta: { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 } };
        setRows(resp.data ?? []);
        setTotal(resp.meta?.total ?? 0);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.message ?? 'Failed to load absences');
        setRows([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAcademicYear?.id, from, to, excusedFilter, page]);

  const setRangePreset = (r: Range) => {
    const dates = rangeToDates(r);
    setRange(r);
    setFrom(dates.from ?? '');
    setTo(dates.to ?? '');
    setPage(1);
  };

  const onDateChange = (field: 'from' | 'to', value: string) => {
    if (field === 'from') setFrom(value);
    else setTo(value);
    setPage(1);
  };

  const rangeLabel: Record<Range, string> = {
    today: t('Today'),
    week: t('Last 7 days'),
    month: t('Last 30 days'),
    all: t('Academic year'),
  };

  const fmtDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(overviewHref)}
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              {t('Back to Overview')}
            </button>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            {t('Class Absences')}
          </h1>
          <p className="text-sm text-gray-600 mt-0.5">
            {t('All CLASS_ABSENCE records in the selected date range.')}
            {from && to ? ` · ${from} → ${to}` : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['today', 'week', 'month', 'all'] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRangePreset(r)}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                range === r
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {rangeLabel[r]}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('From')}</label>
            <input
              type="date"
              value={from}
              onChange={(e) => onDateChange('from', e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('To')}</label>
            <input
              type="date"
              value={to}
              onChange={(e) => onDateChange('to', e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('Status')}</label>
            <select
              value={excusedFilter}
              onChange={(e) => {
                setExcusedFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            >
              <option value="all">{t('All')}</option>
              <option value="false">{t('Unexcused')}</option>
              <option value="true">{t('Excused')}</option>
            </select>
          </div>
          <div className="ml-auto text-sm text-gray-600 self-end">
            {loading ? t('Loading…') : `${total} ${t('records')}`}
          </div>
        </div>
      </Card>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200 text-red-800 text-sm">{error}</Card>
      )}

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-gray-500 bg-gray-50 border-b">
              <tr>
                <th className="text-left py-2 px-3">{t('Date')}</th>
                <th className="text-left py-2 px-3">{t('Student')}</th>
                <th className="text-left py-2 px-3">{t('Matricule')}</th>
                <th className="text-left py-2 px-3">{t('Class')}</th>
                <th className="text-left py-2 px-3">{t('Subject')}</th>
                <th className="text-left py-2 px-3">{t('Recorded By')}</th>
                <th className="text-left py-2 px-3">{t('Excused')}</th>
                <th className="text-left py-2 px-3">{t('Makeup')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-6 px-3 text-center text-gray-500" colSpan={8}>
                    {t('Loading…')}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="py-6 px-3 text-center text-gray-500" colSpan={8}>
                    {t('No absences found for the selected range.')}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-none hover:bg-gray-50">
                    <td className="py-2 px-3 whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                    <td className="py-2 px-3">{r.student?.name ?? '—'}</td>
                    <td className="py-2 px-3 text-gray-500">{r.student?.matricule ?? '—'}</td>
                    <td className="py-2 px-3">
                      {r.subClass ? `${r.subClass.class.name} · ${r.subClass.name}` : '—'}
                    </td>
                    <td className="py-2 px-3">{r.teacherPeriod?.subject?.name ?? '—'}</td>
                    <td className="py-2 px-3 text-gray-600">{r.assignedBy?.name ?? '—'}</td>
                    <td className="py-2 px-3">
                      {r.isExcused ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700"
                          title={r.excuseReason ?? undefined}
                        >
                          {t('Yes')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">
                          {t('No')}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-gray-600">{r.makeupStatus}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t bg-gray-50">
            <div className="text-xs text-gray-600">
              {t('Page')} {page} / {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                leftIcon={ChevronLeftIcon}
              >
                {t('Previous')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                rightIcon={ChevronRightIcon}
              >
                {t('Next')}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ClassAbsencesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <ClassAbsencesPageInner />
    </Suspense>
  );
}
