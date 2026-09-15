'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/context/AuthContext';
import { useLanguage } from '@/components/context/LanguageContext';
import { apiService } from '@/lib/apiService';
import { Card } from '@/components/ui/Card';
import { StatsCard } from '@/components/ui/StatsCard';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

// Shared Discipline Overview — used by Dean of Discipline and Discipline Coordinator.
// Consumes GET /discipline/daily-overview which now accepts from/to for arbitrary ranges.

type Range = 'today' | 'week' | 'month' | 'all';

type Slot = 'SLOT_2' | 'SLOT_5' | 'SLOT_8';

interface OverviewData {
  from: string | null;
  to: string | null;
  academic_year_id: number | null;
  lateTodayCount: number;
  dailyAbsencesCount: number;
  disciplinaryActionsTodayCount: number;
  personsOfInterest: Array<{
    enrollmentId: number;
    absenceCount: number;
    student: { id: number; name: string; matricule: string | null } | null;
    subClass: { id: number; name: string; class: { id: number; name: string } } | null;
  }>;
  dailyBreakdown: Array<{ date: string; count: number }>;
}

// DM roll call's 3 fixed daily check-in slots -- see disciplineService.ts.
const SLOT_LABEL: Record<Slot, string> = {
  SLOT_2: 'Period 1',
  SLOT_5: 'Period 2',
  SLOT_8: 'Period 3',
};

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
  // 'all' — leave from/to unset; backend defaults to today, so we approximate "all-time" by
  // sending a wide window from the start of the academic year on the server side (falls back to today).
  const yearStart = new Date(now.getFullYear() - 1, 8, 1); // Sept 1 last year
  return { from: toISO(yearStart), to: toISO(now) };
}

export default function DisciplineOverviewPage() {
  const { selectedAcademicYear } = useAuth();
  const { t } = useLanguage();
  const [range, setRange] = useState<Range>('today');
  const [slotFilter, setSlotFilter] = useState<string>('all');
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => rangeToDates(range), [range]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (selectedAcademicYear?.id) params.set('academic_year_id', String(selectedAcademicYear.id));
    if (dates.from) params.set('from', dates.from);
    if (dates.to) params.set('to', dates.to);
    if (slotFilter !== 'all') params.set('slot', slotFilter);
    apiService
      .get(`/discipline/daily-overview?${params.toString()}`)
      .then((res: any) => {
        if (cancelled) return;
        setData(res.data ?? res);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.message ?? 'Failed to load overview');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAcademicYear?.id, dates.from, dates.to, slotFilter]);

  const rangeLabel: Record<Range, string> = {
    today: t('Today'),
    week: t('Last 7 days'),
    month: t('Last 30 days'),
    all: t('Academic year'),
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ChartBarIcon className="w-6 h-6" />
            {t('Discipline Overview')}
          </h1>
          <p className="text-sm text-gray-600 mt-0.5">
            {t('Aggregate discipline metrics for the selected time range.')}
            {data?.from && data?.to ? ` · ${data.from} → ${data.to}` : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {(['today', 'week', 'month', 'all'] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm rounded-md border ${range === r
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
            >
              {rangeLabel[r]}
            </button>
          ))}
          <select
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-700"
          >
            <option value="all">{t('All periods')}</option>
            <option value="SLOT_2">{t(SLOT_LABEL.SLOT_2)}</option>
            <option value="SLOT_5">{t(SLOT_LABEL.SLOT_5)}</option>
            <option value="SLOT_8">{t(SLOT_LABEL.SLOT_8)}</option>
          </select>
        </div>
      </div>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200 text-red-800 text-sm">{error}</Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title={t('Lateness')}
          value={loading ? '—' : String(data?.lateTodayCount ?? 0)}
          icon={ClockIcon}
          color="amber"
        />
        <Link
          href={{
            pathname: '/dashboard/dean-of-discipline/absences',
            query: {
              ...(dates.from ? { from: dates.from } : {}),
              ...(dates.to ? { to: dates.to } : {}),
              ...(slotFilter !== 'all' ? { slot: slotFilter } : {}),
              range,
            },
          }}
          className="block rounded-lg transition hover:shadow-md hover:ring-2 hover:ring-red-200 focus:outline-none focus:ring-2 focus:ring-red-400"
          aria-label={t('View all class absences')}
        >
          <StatsCard
            title={t('Class Absences')}
            value={loading ? '—' : String(data?.dailyAbsencesCount ?? 0)}
            icon={ExclamationTriangleIcon}
            color="red"
          />
        </Link>
        <StatsCard
          title={t('Disciplinary Actions')}
          value={loading ? '—' : String(data?.disciplinaryActionsTodayCount ?? 0)}
          icon={ClipboardDocumentListIcon}
          color="purple"
        />
      </div>

      <Card className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {t('Absences per day')}
        </h2>
        {loading ? (
          <p className="text-sm text-gray-500">{t('Loading...')}</p>
        ) : (data?.dailyBreakdown ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">{t('No data for this range.')}</p>
        ) : (
          <div className="space-y-1.5">
            {(() => {
              const max = Math.max(1, ...data!.dailyBreakdown.map((d) => d.count));
              return data!.dailyBreakdown.map((d) => (
                <div key={d.date} className="flex items-center gap-3 text-sm">
                  <span className="w-24 flex-shrink-0 text-gray-600 tabular-nums">{d.date}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-red-400"
                      style={{ width: `${(d.count / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 flex-shrink-0 text-right font-semibold text-gray-900 tabular-nums">
                    {d.count}
                  </span>
                </div>
              ));
            })()}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {t('Persons of Interest')}
        </h2>
        {loading ? (
          <p className="text-sm text-gray-500">{t('Loading...')}</p>
        ) : (data?.personsOfInterest ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">
            {t('No students exceed the unexcused-absence threshold in this range.')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-gray-500 border-b">
                <tr>
                  <th className="text-left py-2 pr-4">{t('Student')}</th>
                  <th className="text-left py-2 pr-4">{t('Matricule')}</th>
                  <th className="text-left py-2 pr-4">{t('Class')}</th>
                  <th className="text-right py-2">{t('Unexcused Absences')}</th>
                </tr>
              </thead>
              <tbody>
                {data!.personsOfInterest.map((p) => (
                  <tr key={p.enrollmentId} className="border-b last:border-none">
                    <td className="py-2 pr-4">{p.student?.name ?? '—'}</td>
                    <td className="py-2 pr-4 text-gray-500">{p.student?.matricule ?? '—'}</td>
                    <td className="py-2 pr-4">
                      {p.subClass ? `${p.subClass.class.name} · ${p.subClass.name}` : '—'}
                    </td>
                    <td className="py-2 text-right font-semibold">{p.absenceCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
