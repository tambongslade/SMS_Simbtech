'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { useLanguage } from '@/components/context/LanguageContext';
import { sortSubClassesByLevel } from '@/lib/classOrdering';
import {
  type OverviewPeriod,
  type OverviewSlot,
  type TeacherAttendanceStatus,
  type TeacherWeekOverview,
  getTeacherAttendanceWeekOverview,
} from '@/lib/teacherAttendanceApi';
// The very same helpers the school-wide timetable view builds its tables with,
// so these tables have the same rows (bell-schedule groups, day headers, periods)
// and the same columns (sub-classes in academic order).
import {
  DAYS_ORDER,
  buildPeriodRows,
  formatTimeRange,
  isAssignablePeriod,
  type PeriodDefinition,
  type PeriodRow,
  type PeriodType,
} from '@/app/dashboard/super-manager/timetable/components/TimetableContext';
import DeanAssignmentsModal from './DeanAssignmentsModal';

// The tables refresh themselves so a period the discipline masters just saved
// shows up without anyone reloading the page.
const AUTO_REFRESH_MS = 30_000;

// Roles allowed to choose which classes each Dean of Discipline is responsible for.
const ASSIGNER_ROLES = ['SUPER_MANAGER', 'MANAGER', 'PRINCIPAL', 'VICE_PRINCIPAL', 'DISCIPLINE_COORDINATOR'];

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

const normalizePeriod = (p: OverviewPeriod): PeriodDefinition => {
  const type: PeriodType =
    p.type === 'BREAK' || p.type === 'PREP' || p.type === 'TEACHING' ? p.type : p.isBreak ? 'BREAK' : 'TEACHING';
  return {
    id: String(p.id),
    name: p.name ?? '',
    dayOfWeek: p.dayOfWeek ?? '',
    startTime: p.startTime ?? '',
    endTime: p.endTime ?? '',
    sequence: Number(p.sequence ?? 0),
    type,
    isBreak: p.isBreak ?? type === 'BREAK',
    periodSetId: p.periodSetId != null ? String(p.periodSetId) : null,
  };
};

type CellState = TeacherAttendanceStatus | 'PENDING' | 'UPCOMING';
type ViewMode = 'mine' | 'school' | 'class';

interface Group {
  key: string;
  name: string;
  rows: PeriodRow[];
  columns: { id: number; name: string; className: string }[];
}

export default function TeachersAttendanceOverviewPage() {
  const { selectedAcademicYear, selectedRole } = useAuth();
  const { t } = useLanguage();

  const isDean = selectedRole === 'DEAN_OF_DISCIPLINE';
  const canAssign = !!selectedRole && ASSIGNER_ROLES.includes(selectedRole);

  const [weekStart, setWeekStart] = useState(() => mondayOf(toIso(new Date())));
  const [data, setData] = useState<TeacherWeekOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [mode, setMode] = useState<ViewMode | null>(null); // null until the role is known
  const [classId, setClassId] = useState<number | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  // A dean lands on their own classes; everyone else on the whole school.
  useEffect(() => {
    if (mode === null && selectedRole) setMode(isDean ? 'mine' : 'school');
  }, [mode, selectedRole, isDean]);
  const activeMode: ViewMode = mode ?? 'school';

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const res = await getTeacherAttendanceWeekOverview(weekStart, selectedAcademicYear?.id);
        setData(res);
        setLastUpdated(new Date());
      } catch (error) {
        if (!silent) {
          toast.error(
            error instanceof Error && error.message ? error.message : t('Failed to load teachers attendance overview.')
          );
        }
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

  const dateByDay = useMemo(() => {
    const m: Record<string, string> = {};
    (data?.days ?? []).forEach(d => {
      m[d.dayOfWeek] = d.date;
    });
    return m;
  }, [data]);

  // slots of one sub-class + period (several teachers can share a slot)
  const slotsByCell = useMemo(() => {
    const m = new Map<string, OverviewSlot[]>();
    (data?.subclasses ?? []).forEach(block => {
      block.slots.forEach(slot => {
        const key = `${block.subClass.id}|${slot.periodId}`;
        const arr = m.get(key) ?? [];
        arr.push(slot);
        m.set(key, arr);
      });
    });
    return m;
  }, [data]);

  const attendanceByKey = useMemo(() => {
    const m = new Map<string, { status: TeacherAttendanceStatus; reason?: string | null; recordedBy?: { name: string } | null }>();
    (data?.attendance ?? []).forEach(a => m.set(`${a.teacherPeriodId}|${a.date}`, a));
    return m;
  }, [data]);

  // Every sub-class in academic order, for the class picker and the assignment screen.
  const allSubClasses = useMemo(
    () =>
      sortSubClassesByLevel((data?.subclasses ?? []).map(b => ({ ...b.subClass }))).map(sc => ({
        id: sc.id,
        name: sc.name,
        className: sc.className,
      })),
    [data]
  );

  // Default the class picker to the first class (or the dean's first) once data is in.
  useEffect(() => {
    if (classId != null || allSubClasses.length === 0) return;
    const mineFirst = allSubClasses.find(sc => data?.mySubClassIds.includes(sc.id));
    setClassId((mineFirst ?? allSubClasses[0]).id);
  }, [classId, allSubClasses, data]);

  // Which sub-classes the current tab shows.
  const scopeIds = useMemo<Set<number> | null>(() => {
    if (activeMode === 'mine') return new Set(data?.mySubClassIds ?? []);
    if (activeMode === 'class') return classId != null ? new Set([classId]) : new Set();
    return null; // whole school
  }, [activeMode, data, classId]);
  const inScope = useCallback((id: number) => scopeIds === null || scopeIds.has(id), [scopeIds]);

  // One matrix per bell schedule, exactly like the school-wide timetable view.
  const groups = useMemo<Group[]>(() => {
    const bySet = new Map<string, Group>();
    sortSubClassesByLevel((data?.subclasses ?? []).map(b => ({ ...b.subClass, block: b }))).forEach(({ block }) => {
      if (!inScope(block.subClass.id)) return;
      if (!block.periodSet || block.periods.length === 0) return;
      const key = String(block.periodSet.id);
      let group = bySet.get(key);
      if (!group) {
        group = { key, name: block.periodSet.name, rows: buildPeriodRows(block.periods.map(normalizePeriod)), columns: [] };
        bySet.set(key, group);
      }
      group.columns.push({ id: block.subClass.id, name: block.subClass.name, className: block.subClass.className });
    });
    return Array.from(bySet.values());
  }, [data, inScope]);

  // The single class shown by the class view: its own bell schedule as rows.
  const classBlock = useMemo(
    () => (data?.subclasses ?? []).find(b => b.subClass.id === classId) ?? null,
    [data, classId]
  );
  const classRows = useMemo(
    () => (classBlock && classBlock.periods.length > 0 ? buildPeriodRows(classBlock.periods.map(normalizePeriod)) : []),
    [classBlock]
  );

  const statusOf = (slot: OverviewSlot, date: string | undefined): CellState => {
    const rec = date ? attendanceByKey.get(`${slot.id}|${date}`) : undefined;
    if (rec) return rec.status;
    return date && data && date > data.today ? 'UPCOMING' : 'PENDING';
  };

  // Present / late / absent are coloured; anything not recorded (yet) stays grey.
  const STATUS_TEXT: Record<CellState, { label: string; text: string; bg: string }> = {
    PRESENT: { label: t('Present'), text: 'text-green-700', bg: 'bg-green-100' },
    LATE: { label: t('Late'), text: 'text-yellow-700', bg: 'bg-yellow-100' },
    ABSENT: { label: t('Absent'), text: 'text-red-700', bg: 'bg-red-100' },
    PENDING: { label: t('Not recorded yet'), text: 'text-gray-500', bg: 'bg-gray-200' },
    UPCOMING: { label: '', text: 'text-gray-400', bg: 'bg-gray-200' },
  };

  const term = search.trim().toLowerCase();
  const matchesFilters = (slot: OverviewSlot, state: CellState) => {
    if (term && !(slot.teacherName ?? '').toLowerCase().includes(term)) return false;
    if (onlyIssues && state !== 'LATE' && state !== 'ABSENT') return false;
    return true;
  };
  const filtering = term !== '' || onlyIssues;

  const summary = useMemo(() => {
    const acc = { present: 0, late: 0, absent: 0, pending: 0 };
    (data?.subclasses ?? []).forEach(block => {
      if (!inScope(block.subClass.id)) return;
      block.slots.forEach(slot => {
        if (slot.periodType && !isAssignablePeriod(slot.periodType)) return;
        const date = dateByDay[slot.day];
        if (!date || !data) return;
        const rec = attendanceByKey.get(`${slot.id}|${date}`);
        if (rec) acc[rec.status.toLowerCase() as 'present' | 'late' | 'absent'] += 1;
        else if (date <= data.today) acc.pending += 1; // due, but not recorded yet
      });
    });
    return acc;
  }, [data, dateByDay, attendanceByKey, inScope]);

  // One timetable cell: teacher name + Present / Late / Absent, tinted by status.
  const renderCell = (subClassId: number, period: PeriodDefinition | undefined, day: string) => {
    if (!period) {
      return (
        <td key={`${subClassId}-${day}-none`} className="px-2 py-2 text-center text-xs text-gray-300 border-r h-20">
          —
        </td>
      );
    }
    if (!isAssignablePeriod(period.type)) {
      return (
        <td key={`${subClassId}-${day}-${period.id}`} className="px-2 py-2 text-center text-xs text-gray-600 border-r bg-gray-100 h-20">
          <div className="truncate">{period.type === 'PREP' ? t('Preps') : t('Break')}</div>
        </td>
      );
    }

    const slots = slotsByCell.get(`${subClassId}|${period.id}`) ?? [];
    if (slots.length === 0) {
      return <td key={`${subClassId}-${day}-${period.id}`} className="px-2 py-2 border-r bg-white h-20" />;
    }

    const date = dateByDay[day];
    const items = slots.map(slot => {
      const state = statusOf(slot, date);
      const rec = date ? attendanceByKey.get(`${slot.id}|${date}`) : undefined;
      return { slot, state, rec, dim: filtering && !matchesFilters(slot, state) };
    });

    const title = items
      .map(({ slot, state, rec }) =>
        [
          `${slot.subjectName ?? '?'} - ${slot.teacherName ?? t('No teacher')}`,
          STATUS_TEXT[state].label,
          rec?.reason ? `${t('Reason')}: ${rec.reason}` : '',
          rec?.recordedBy ? `${t('Recorded by')} ${rec.recordedBy.name}` : '',
        ]
          .filter(Boolean)
          .join(' · ')
      )
      .join('\n');

    const single = items.length === 1;
    return (
      <td
        key={`${subClassId}-${day}-${period.id}`}
        className={`px-1 py-2 text-center text-xs border-r h-20 ${single ? STATUS_TEXT[items[0].state].bg : 'bg-white'} ${
          single && items[0].dim ? 'opacity-30' : ''
        }`}
        title={title}
      >
        <div className={`h-full flex flex-col justify-center ${single ? 'space-y-1' : 'gap-0.5'}`}>
          {items.map(({ slot, state, dim }, i) => (
            <div
              key={slot.id}
              className={`${!single ? `${STATUS_TEXT[state].bg} rounded px-0.5 py-0.5` : ''} ${!single && dim ? 'opacity-30' : ''} ${
                i > 0 && !single ? 'mt-0.5' : ''
              }`}
            >
              <div className={`truncate font-semibold leading-tight px-1 ${single ? 'text-xs' : 'text-[10px]'}`}>
                {slot.teacherName ?? t('No teacher')}
              </div>
              {STATUS_TEXT[state].label && (
                <div className={`truncate font-semibold leading-tight px-1 ${STATUS_TEXT[state].text} ${single ? 'text-xs' : 'text-[10px]'}`}>
                  {STATUS_TEXT[state].label}
                </div>
              )}
              <div className={`truncate text-gray-500 leading-tight px-1 ${single ? 'text-[11px]' : 'text-[9px]'}`}>
                {slot.subjectName ?? ''}
              </div>
            </div>
          ))}
        </div>
      </td>
    );
  };

  const dayHeader = (day: string) => (
    <>
      {day.charAt(0) + day.slice(1).toLowerCase()}
      {dateByDay[day] && <span className="ml-2 text-xs font-normal text-blue-700">{dateByDay[day]}</span>}
    </>
  );

  // Same table as the school-wide timetable view: one per bell schedule.
  const renderSchoolTables = () =>
    groups.map(group => (
      <div key={group.key} className="space-y-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{group.name}</h3>
          <span className="text-xs text-gray-500">
            {group.columns.length} {group.columns.length === 1 ? t('class') : t('classes')}
          </span>
        </div>

        <div className="w-full border rounded-lg">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r w-24">
                      {t('Period')}
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r w-20">
                      {t('Time')}
                    </th>
                    {group.columns.map(col => (
                      <th
                        key={col.id}
                        className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border-r text-gray-500"
                        title={col.name}
                        style={{ minWidth: '100px', width: '150px', maxWidth: '150px' }}
                      >
                        <div className="truncate">{col.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {DAYS_ORDER.map(day => (
                    <React.Fragment key={day}>
                      <tr className="bg-blue-50">
                        <td colSpan={2 + group.columns.length} className="px-4 py-3 text-center text-sm font-bold text-blue-900 border-b">
                          {dayHeader(day)}
                        </td>
                      </tr>
                      {group.rows.map(row => {
                        const period = row.byDay[day];
                        return (
                          <tr key={`${day}-${row.sequence}`} className="hover:bg-gray-50">
                            <td className="px-2 py-2 text-center text-xs font-medium border-r w-24">{(period ?? row.label).name}</td>
                            <td className="px-2 py-2 text-center text-xs text-gray-600 border-r w-20">
                              <div className="truncate">{formatTimeRange((period ?? row.label).startTime, (period ?? row.label).endTime)}</div>
                            </td>
                            {group.columns.map(col => renderCell(col.id, period, day))}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    ));

  // One class, laid out like the school timetable's class view: periods down, days across.
  const renderClassTable = () => {
    if (!classBlock) return <div className="p-4 text-center text-gray-500">{t('Choose a class.')}</div>;
    if (classRows.length === 0) {
      return <div className="p-4 text-center text-gray-500">{t('This class has no timetable yet.')}</div>;
    }
    return (
      <div className="w-full border rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r sticky left-0 bg-gray-50 z-20 min-w-[120px]">
                  {t('Period')} / {t('Time')}
                </th>
                {DAYS_ORDER.map(day => (
                  <th key={day} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r min-w-[140px]">
                    {day.charAt(0) + day.slice(1).toLowerCase()}
                    {dateByDay[day] && <div className="text-[10px] font-normal normal-case text-gray-400">{dateByDay[day]}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classRows.map(row => (
                <tr key={row.sequence} className="border-b hover:bg-gray-50">
                  <th className="px-2 py-2 border-r bg-gray-50 font-medium text-gray-800 sticky left-0 z-10 min-w-[120px]">
                    <div className="text-center text-sm font-semibold">{row.label.name}</div>
                    <div className="text-xs text-gray-500 font-normal text-center mt-1">
                      {formatTimeRange(row.label.startTime, row.label.endTime)}
                    </div>
                  </th>
                  {DAYS_ORDER.map(day => renderCell(classBlock.subClass.id, row.byDay[day], day))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const thisWeek = mondayOf(toIso(new Date()));
  const rangeLabel = data ? `${data.weekStart} → ${data.weekEnd}` : weekStart;
  const tabs: { key: ViewMode; label: string }[] = [
    ...(isDean ? [{ key: 'mine' as ViewMode, label: t('My classes') }] : []),
    { key: 'school', label: t('School view') },
    { key: 'class', label: t('Class view') },
  ];

  const emptyMine = activeMode === 'mine' && (data?.mySubClassIds.length ?? 0) === 0;

  return (
    <div className="p-4 md:p-6 space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">{t('Teachers Attendance Overview')}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('Weekly timetable of every teacher, filled in automatically as the discipline masters take attendance.')}
          </p>
        </div>
        {canAssign && (
          <button
            onClick={() => setAssignOpen(true)}
            className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm"
          >
            {t('Assign classes to deans')}
          </button>
        )}
      </div>

      {/* View tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${
              activeMode === tab.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
        {activeMode === 'class' && (
          <select
            value={classId ?? ''}
            onChange={e => setClassId(Number(e.target.value) || null)}
            className="ml-auto mb-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white"
            aria-label={t('Class')}
          >
            {allSubClasses.map(sc => (
              <option key={sc.id} value={sc.id}>
                {sc.className} — {sc.name}
              </option>
            ))}
          </select>
        )}
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
            placeholder={t('Name')}
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
          const count = s === 'PRESENT' ? summary.present : s === 'LATE' ? summary.late : s === 'ABSENT' ? summary.absent : summary.pending;
          return (
            <span key={s} className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium ${STATUS_TEXT[s].bg} ${STATUS_TEXT[s].text}`}>
              {STATUS_TEXT[s].label}: {count}
            </span>
          );
        })}
        {lastUpdated && (
          <span className="text-xs text-gray-400 ml-auto">
            {t('Updated')} {lastUpdated.toLocaleTimeString()} · {t('auto-refreshes every 30 s')}
          </span>
        )}
      </div>

      {isLoading && !data ? (
        <div className="p-4 text-center text-gray-500">{t('Loading...')}</div>
      ) : emptyMine ? (
        <div className="p-6 text-center text-gray-500 bg-white rounded-lg shadow text-sm">
          {t('No classes have been assigned to you yet. A Manager or Super Manager can assign them.')}
        </div>
      ) : activeMode === 'class' ? (
        renderClassTable()
      ) : groups.length === 0 ? (
        <div className="p-4 text-center text-gray-500">{t('No timetable found for this academic year.')}</div>
      ) : (
        renderSchoolTables()
      )}

      {canAssign && (
        <DeanAssignmentsModal
          isOpen={assignOpen}
          onClose={() => setAssignOpen(false)}
          subClasses={allSubClasses}
          academicYearId={selectedAcademicYear?.id}
          onSaved={() => load(true)}
        />
      )}
    </div>
  );
}
