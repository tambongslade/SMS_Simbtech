'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { useLanguage } from '@/components/context/LanguageContext';
import {
  type TeacherAttendanceStatus,
  type TeacherWeekCell,
  type TeacherWeekOverview,
  getTeacherAttendanceWeekOverview,
} from '@/lib/teacherAttendanceApi';

// The grid refreshes itself so a period the discipline masters just saved
// shows up without anyone reloading the page.
const AUTO_REFRESH_MS = 30_000;

const toIso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const mondayOf = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toIso(d);
};

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toIso(d);
};

const shortTime = (t?: string) => (t ? t.slice(0, 5) : '');

type CellState = TeacherAttendanceStatus | 'PENDING' | 'UPCOMING';

export default function TeachersAttendanceOverviewPage() {
  const { selectedAcademicYear } = useAuth();
  const { t } = useLanguage();

  const [weekStart, setWeekStart] = useState(() => mondayOf(toIso(new Date())));
  const [data, setData] = useState<TeacherWeekOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [onlyIssues, setOnlyIssues] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const res = await getTeacherAttendanceWeekOverview(weekStart, selectedAcademicYear?.id);
        setData(res);
        setLastUpdated(new Date());
      } catch (error: any) {
        if (!silent) toast.error(error.message || t('Failed to load teachers attendance overview.'));
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [weekStart, selectedAcademicYear?.id, t]
  );

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const stateOf = (cell: TeacherWeekCell, date: string): CellState => {
    if (cell.status) return cell.status;
    return data && date > data.today ? 'UPCOMING' : 'PENDING';
  };

  const STATE_STYLE: Record<CellState, { chip: string; label: string }> = {
    PRESENT: { chip: 'bg-green-600 text-white', label: t('Present') },
    LATE: { chip: 'bg-yellow-500 text-white', label: t('Late') },
    ABSENT: { chip: 'bg-red-600 text-white', label: t('Absent') },
    PENDING: { chip: 'bg-gray-200 text-gray-600', label: t('Not recorded yet') },
    UPCOMING: { chip: 'bg-white text-gray-400 border border-dashed border-gray-300', label: t('Upcoming') },
  };

  const teachers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.teachers ?? []).filter(row => {
      if (term && !`${row.name} ${row.matricule ?? ''}`.toLowerCase().includes(term)) return false;
      if (onlyIssues && row.totals.late + row.totals.absent === 0) return false;
      return true;
    });
  }, [data, search, onlyIssues]);

  const summary = useMemo(() => {
    const acc = { present: 0, late: 0, absent: 0, pending: 0 };
    (data?.teachers ?? []).forEach(row => {
      acc.present += row.totals.present;
      acc.late += row.totals.late;
      acc.absent += row.totals.absent;
      acc.pending += row.totals.pending;
    });
    return acc;
  }, [data]);

  const thisWeek = mondayOf(toIso(new Date()));
  const rangeLabel = data ? `${data.weekStart} → ${data.weekEnd}` : weekStart;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-full mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('Teachers Attendance Overview')}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('Weekly timetable of every teacher, filled in automatically as the discipline masters take attendance.')}
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
            aria-label={t('Previous week')}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <div className="text-sm font-medium text-gray-800 min-w-[190px] text-center">{rangeLabel}</div>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
            aria-label={t('Next week')}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          {weekStart !== thisWeek && (
            <button
              onClick={() => setWeekStart(thisWeek)}
              className="px-3 py-2 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm"
            >
              {t('This week')}
            </button>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('Go to date')}</label>
          <input
            type="date"
            value={weekStart}
            onChange={e => e.target.value && setWeekStart(mondayOf(e.target.value))}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('Search teacher')}</label>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('Name or matricule')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
          <input
            type="checkbox"
            checked={onlyIssues}
            onChange={e => setOnlyIssues(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          {t('Only late or absent')}
        </label>
        <button
          onClick={() => load()}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
        >
          <ArrowPathIcon className="w-4 h-4" /> {t('Refresh')}
        </button>
      </div>

      {/* Summary + legend */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {(['PRESENT', 'LATE', 'ABSENT', 'PENDING'] as CellState[]).map(s => {
          const count =
            s === 'PRESENT' ? summary.present : s === 'LATE' ? summary.late : s === 'ABSENT' ? summary.absent : summary.pending;
          return (
            <span key={s} className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium ${STATE_STYLE[s].chip}`}>
              {STATE_STYLE[s].label}: {count}
            </span>
          );
        })}
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${STATE_STYLE.UPCOMING.chip}`}>
          {STATE_STYLE.UPCOMING.label}
        </span>
        {lastUpdated && (
          <span className="text-xs text-gray-400 ml-auto">
            {t('Updated')} {lastUpdated.toLocaleTimeString()} · {t('auto-refreshes every 30 s')}
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="bg-white rounded-lg shadow overflow-auto max-h-[70vh]">
        {isLoading && !data ? (
          <div className="p-10 text-center text-gray-500 text-sm">{t('Loading...')}</div>
        ) : teachers.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">{t('No teachers found for this week.')}</div>
        ) : (
          <table className="min-w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 bg-gray-50 text-left px-3 py-2 border-b border-r border-gray-200 min-w-[200px]">
                  {t('Teacher')}
                </th>
                {data?.days.map(d => (
                  <th
                    key={d.date}
                    className={`sticky top-0 z-10 px-3 py-2 border-b border-gray-200 text-left min-w-[170px] ${
                      d.date === data.today ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="font-semibold capitalize">{d.dayOfWeek.toLowerCase()}</div>
                    <div className="text-xs font-normal text-gray-500">{d.date}</div>
                  </th>
                ))}
                <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 border-b border-l border-gray-200 text-left min-w-[120px]">
                  {t('Week total')}
                </th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(row => (
                <tr key={row.id} className="hover:bg-gray-50/60">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 border-b border-r border-gray-100 align-top">
                    <div className="font-medium text-gray-900">{row.name}</div>
                    {row.matricule && <div className="text-xs text-gray-500">{row.matricule}</div>}
                  </td>
                  {data?.days.map(d => {
                    const cells = row.days[d.date] || [];
                    return (
                      <td key={d.date} className="px-2 py-2 border-b border-gray-100 align-top">
                        {cells.length === 0 ? (
                          <span className="text-gray-300">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {cells.map(cell => {
                              const state = stateOf(cell, d.date);
                              const title = [
                                `${cell.period.name} · ${shortTime(cell.period.startTime)}–${shortTime(cell.period.endTime)}`,
                                cell.subject?.name,
                                cell.subClass ? `${cell.subClass.class?.name ?? ''} ${cell.subClass.name}`.trim() : '',
                                STATE_STYLE[state].label,
                                cell.reason ? `${t('Reason')}: ${cell.reason}` : '',
                                cell.recordedBy ? `${t('Recorded by')} ${cell.recordedBy.name}` : '',
                              ]
                                .filter(Boolean)
                                .join('\n');
                              return (
                                <span
                                  key={cell.teacherPeriodId}
                                  title={title}
                                  className={`inline-flex flex-col rounded px-1.5 py-0.5 text-[11px] leading-tight cursor-default ${STATE_STYLE[state].chip}`}
                                >
                                  <span className="font-semibold">{shortTime(cell.period.startTime)}</span>
                                  <span className="opacity-90 max-w-[90px] truncate">
                                    {cell.subClass?.name ?? cell.subject?.name}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 border-b border-l border-gray-100 align-top text-xs space-y-0.5">
                    <div className="text-green-700">
                      {t('Present')}: {row.totals.present}
                    </div>
                    <div className="text-yellow-700">
                      {t('Late')}: {row.totals.late}
                    </div>
                    <div className="text-red-700">
                      {t('Absent')}: {row.totals.absent}
                    </div>
                    <div className="text-gray-500">
                      {t('Not recorded yet')}: {row.totals.pending}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
