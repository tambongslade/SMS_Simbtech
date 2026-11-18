'use client';

// Statistics under the Teachers Attendance Overview: how many periods had to be
// taught on the day / in the week / in the month around the date being viewed,
// and how many were recorded present / late / absent, per class or per teacher.

import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/components/context/LanguageContext';
import { sortSubClassesByLevel } from '@/lib/classOrdering';
import { type PeriodCounts, type PeriodStats, getTeacherAttendanceStats } from '@/lib/teacherAttendanceApi';

type Range = 'day' | 'week' | 'month';
type By = 'class' | 'teacher';

interface Row extends PeriodCounts {
  key: string;
  label: string;
}

// Share of the periods recorded so far that were actually taught (present or late).
const attendedPct = (c: PeriodCounts) => {
  const recorded = c.present + c.late + c.absent;
  return recorded ? Math.round(((c.present + c.late) / recorded) * 100) : null;
};

export default function PeriodStatsPanel({
  date,
  academicYearId,
  refreshKey,
  focusSubClassId,
}: {
  date: string;
  academicYearId?: number;
  /** Changes whenever the overview reloads, so the numbers follow new records. */
  refreshKey?: number;
  /** When set (class view), that class is highlighted and listed first. */
  focusSubClassId?: number | null;
}) {
  const { t } = useLanguage();
  const [range, setRange] = useState<Range>('day');
  const [by, setBy] = useState<By>('class');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTeacherAttendanceStats(date, academicYearId)
      .then(s => {
        if (!cancelled) {
          setStats(s);
          setError(null);
        }
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error && e.message ? e.message : t('Failed to load statistics.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, academicYearId, refreshKey, t]);

  const current = stats?.[range];

  const rows = useMemo<Row[]>(() => {
    if (!current) return [];
    let list: Row[];
    if (by === 'class') {
      list = sortSubClassesByLevel(current.bySubClass.map(s => ({ ...s }))).map(s => ({
        ...s,
        key: `c${s.id}`,
        label: s.className && !s.name.toUpperCase().startsWith(s.className.toUpperCase()) ? `${s.className} ${s.name}` : s.name,
      }));
      if (focusSubClassId) {
        const i = list.findIndex(r => r.key === `c${focusSubClassId}`);
        if (i > 0) list = [list[i], ...list.slice(0, i), ...list.slice(i + 1)];
      }
    } else {
      list = current.byTeacher.map(s => ({ ...s, key: `t${s.id}`, label: s.name }));
    }
    const q = search.trim().toLowerCase();
    return q ? list.filter(r => r.label.toLowerCase().includes(q)) : list;
  }, [current, by, search, focusSubClassId]);

  const rangeLabel = current ? (current.from === current.to ? current.from : `${current.from} → ${current.to}`) : '';
  const totals = current?.totals;

  const tile = (label: string, value: number | string, cls: string) => (
    <div className={`rounded-lg px-3 py-2 ${cls}`}>
      <div className="text-[11px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-base font-semibold text-gray-900 mr-auto">
          {t('Period statistics')}
          {rangeLabel && <span className="ml-2 text-xs font-normal text-gray-500">{rangeLabel}</span>}
        </h3>
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm" role="group" aria-label={t('Period')}>
          {([
            { key: 'day', label: t('Daily') },
            { key: 'week', label: t('Weekly') },
            { key: 'month', label: t('Monthly') },
          ] as { key: Range; label: string }[]).map(o => (
            <button
              key={o.key}
              onClick={() => setRange(o.key)}
              className={`px-3 py-1.5 ${range === o.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm" role="group" aria-label={t('Group by')}>
          {([
            { key: 'class', label: t('Per class') },
            { key: 'teacher', label: t('Per teacher') },
          ] as { key: By; label: string }[]).map(o => (
            <button
              key={o.key}
              onClick={() => {
                setBy(o.key);
                setSearch('');
              }}
              className={`px-3 py-1.5 ${by === o.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">{error}</div>}

      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {tile(t('Periods to teach'), totals.scheduled.toLocaleString(), 'bg-blue-50 text-blue-900')}
          {tile(t('Present'), totals.present.toLocaleString(), 'bg-green-400 text-green-950')}
          {tile(t('Late'), totals.late.toLocaleString(), 'bg-yellow-300 text-yellow-950')}
          {tile(t('Absent'), totals.absent.toLocaleString(), 'bg-red-400 text-red-950')}
          {tile(t('Not recorded'), totals.notRecorded.toLocaleString(), 'bg-gray-200 text-gray-700')}
          {tile(t('Still to come'), totals.upcoming.toLocaleString(), 'bg-gray-50 text-gray-600 border border-gray-200')}
        </div>
      )}

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={by === 'class' ? t('Search class') : t('Search teacher')}
        className="w-full sm:w-72 rounded-md border border-gray-300 px-3 py-2 text-sm"
      />

      <div className="overflow-auto max-h-[60vh] border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr className="text-xs uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2 text-left">{by === 'class' ? t('Class') : t('Teacher')}</th>
              <th className="px-3 py-2 text-right">{t('Periods to teach')}</th>
              <th className="px-3 py-2 text-right text-green-700">{t('Present')}</th>
              <th className="px-3 py-2 text-right text-yellow-700">{t('Late')}</th>
              <th className="px-3 py-2 text-right text-red-700">{t('Absent')}</th>
              <th className="px-3 py-2 text-right">{t('Not recorded')}</th>
              <th className="px-3 py-2 text-right">{t('Still to come')}</th>
              <th className="px-3 py-2 text-right">{t('Attended')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && !stats ? (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">{t('Loading...')}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">{t('No periods to teach in this period.')}</td></tr>
            ) : (
              rows.map(r => {
                const pct = attendedPct(r);
                const focused = by === 'class' && focusSubClassId != null && r.key === `c${focusSubClassId}`;
                return (
                  <tr key={r.key} className={focused ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                    <td className="px-3 py-2 font-medium text-gray-900">{r.label}</td>
                    <td className="px-3 py-2 text-right font-semibold">{r.scheduled}</td>
                    <td className="px-3 py-2 text-right text-green-700">{r.present}</td>
                    <td className="px-3 py-2 text-right text-yellow-700">{r.late}</td>
                    <td className="px-3 py-2 text-right text-red-700 font-semibold">{r.absent || ''}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{r.notRecorded || ''}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{r.upcoming || ''}</td>
                    <td className="px-3 py-2 text-right">
                      {pct == null ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <span className={pct >= 90 ? 'text-green-700' : pct >= 75 ? 'text-yellow-700' : 'text-red-700'}>{pct}%</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        {t('Periods to teach = timetabled teaching periods with a teacher on school days (holidays excluded). Attended = present or late, out of the periods recorded so far.')}
      </p>
    </div>
  );
}
