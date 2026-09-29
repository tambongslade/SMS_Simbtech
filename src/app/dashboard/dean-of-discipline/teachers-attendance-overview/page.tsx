'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { useLanguage } from '@/components/context/LanguageContext';
import { Modal } from '@/components/ui';
import { sortSubClassesByLevel } from '@/lib/classOrdering';
import {
  type OverviewPeriod,
  type OverviewSlot,
  type TeacherAttendanceStatus,
  type TeacherWeekOverview,
  getTeacherAttendanceWeekOverview,
  markAllTeachersPresent,
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
import EditAttendanceModal, { type EditTarget } from './EditAttendanceModal';

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
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [markConfirmOpen, setMarkConfirmOpen] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

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
    const m = new Map<string, { id: number; status: TeacherAttendanceStatus; reason?: string | null; recordedBy?: { name: string } | null }>();
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

  // ---- Mark all present (one day at a time) ----------------------------------
  // Scope follows the tab: whole school, the dean's own classes, or the chosen class.
  const markScopeSubClassIds = useMemo<number[] | undefined>(() => {
    if (activeMode === 'mine') return data?.mySubClassIds ?? [];
    if (activeMode === 'class') return classId != null ? [classId] : [];
    return undefined;
  }, [activeMode, data, classId]);

  const isFutureDay = useCallback(
    (day: string) => !!data && !!dateByDay[day] && dateByDay[day] > data.today,
    [data, dateByDay]
  );

  // Which days can be edited: never a future day; and a Dean of Discipline only today
  // (Manager / Super Manager can also correct past days). The server enforces the same rule.
  const canEditDay = useCallback(
    (day: string) => {
      const date = dateByDay[day];
      if (!data || !date || isFutureDay(day)) return false;
      return isDean ? date === data.today : true;
    },
    [data, dateByDay, isFutureDay, isDean]
  );

  // "Mark all present" always acts on today (one day only). Empty when today is not a
  // school day inside the week being shown.
  const markDay = useMemo(
    () => (data ? DAYS_ORDER.find(d => dateByDay[d] === data.today) ?? '' : ''),
    [data, dateByDay]
  );

  // Periods on the chosen day, inside the current scope, with nothing recorded yet.
  const unrecordedForMarkDay = useMemo(() => {
    const date = dateByDay[markDay];
    if (!data || !date) return 0;
    let n = 0;
    data.subclasses.forEach(block => {
      if (!inScope(block.subClass.id)) return;
      block.slots.forEach(slot => {
        if (slot.day !== markDay || !slot.teacherId) return;
        if (slot.periodType && !isAssignablePeriod(slot.periodType)) return;
        if (!attendanceByKey.has(`${slot.id}|${date}`)) n += 1;
      });
    });
    return n;
  }, [data, dateByDay, markDay, inScope, attendanceByKey]);

  const scopeLabel =
    activeMode === 'mine' ? t('your classes') : activeMode === 'class'
      ? allSubClasses.find(sc => sc.id === classId)?.name ?? ''
      : t('the whole school');

  const canMarkAll = !!markDay && !(markScopeSubClassIds && markScopeSubClassIds.length === 0);

  const confirmMarkAll = async () => {
    const date = dateByDay[markDay];
    if (!date) return;
    setIsMarking(true);
    try {
      const res = await markAllTeachersPresent(date, markScopeSubClassIds, selectedAcademicYear?.id);
      toast.success(
        `${res.created} ${t('periods marked present')}${res.alreadyRecorded ? ` (${res.alreadyRecorded} ${t('already recorded, left unchanged')})` : ''}`
      );
      setMarkConfirmOpen(false);
      await load(true);
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : t('Failed to mark teachers present.'));
    } finally {
      setIsMarking(false);
    }
  };

  // Open the edit dialog for one slot on one day. Upcoming days can't be edited yet.
  const openEdit = (slot: OverviewSlot, day: string, period: PeriodDefinition) => {
    const date = dateByDay[day];
    if (!date || !canEditDay(day)) return;
    setEditTarget({
      slot,
      date,
      dayLabel: day.charAt(0) + day.slice(1).toLowerCase(),
      periodLabel: `${period.name} · ${formatTimeRange(period.startTime, period.endTime)}`,
      className: (data?.subclasses ?? []).find(b => b.subClass.id === slot.subClassId)?.subClass.name ?? '',
      existing: attendanceByKey.get(`${slot.id}|${date}`),
    });
  };

  // One timetable cell: teacher name + Present / Late / Absent, tinted by status.
  const renderCell = (subClassId: number, period: PeriodDefinition | undefined, day: string) => {
    if (!period) {
      return (
        <td key={`${subClassId}-${day}-none`} className="px-2 py-2 text-center text-xs text-gray-300 border-r border-b h-20">
          —
        </td>
      );
    }
    if (!isAssignablePeriod(period.type)) {
      return (
        <td key={`${subClassId}-${day}-${period.id}`} className="px-2 py-2 text-center text-xs text-gray-600 border-r border-b bg-gray-100 h-20">
          <div className="truncate">{period.type === 'PREP' ? t('Preps') : t('Break')}</div>
        </td>
      );
    }

    const slots = slotsByCell.get(`${subClassId}|${period.id}`) ?? [];
    if (slots.length === 0) {
      return <td key={`${subClassId}-${day}-${period.id}`} className="px-2 py-2 border-r border-b bg-white h-20" />;
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
    const clickable = !!date && canEditDay(day);
    const click = clickable ? 'cursor-pointer hover:brightness-95' : '';
    return (
      <td
        key={`${subClassId}-${day}-${period.id}`}
        className={`px-1 py-2 text-center text-xs border-r border-b h-20 ${single ? STATUS_TEXT[items[0].state].bg : 'bg-white'} ${
          single && items[0].dim ? 'opacity-30' : ''
        } ${single ? click : ''}`}
        title={clickable ? `${title}\n${t('Click to change')}` : title}
        onClick={single && clickable ? () => openEdit(items[0].slot, day, period) : undefined}
      >
        <div className={`h-full flex flex-col justify-center ${single ? 'space-y-1' : 'gap-0.5'}`}>
          {items.map(({ slot, state, dim }, i) => (
            <div
              key={slot.id}
              className={`${!single ? `${STATUS_TEXT[state].bg} rounded px-0.5 py-0.5` : ''} ${!single && dim ? 'opacity-30' : ''} ${
                i > 0 && !single ? 'mt-0.5' : ''
              } ${!single ? click : ''}`}
              onClick={!single && clickable ? () => openEdit(slot, day, period) : undefined}
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
          {/* Scrolls in both directions inside a fixed height so the class header row and
              the current day's row can stay pinned to the top while you scroll. */}
          <div className="overflow-auto max-h-[80vh]">
            <div className="inline-block min-w-full">
              <table className="min-w-full text-xs border-separate border-spacing-0">
                <thead>
                  <tr className="h-9">
                    <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b w-24">
                      {t('Period')}
                    </th>
                    <th className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b w-20">
                      {t('Time')}
                    </th>
                    {group.columns.map(col => (
                      <th
                        key={col.id}
                        className="sticky top-0 z-20 bg-gray-50 px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border-r border-b text-gray-500"
                        title={col.name}
                        style={{ minWidth: '100px', width: '150px', maxWidth: '150px' }}
                      >
                        <div className="truncate">{col.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                {/* One tbody per day: the day row is pinned under the class header and is
                    replaced by the next day's row as you scroll into it. */}
                {DAYS_ORDER.map(day => (
                  <tbody key={day} className="bg-white">
                    <tr>
                      <td
                        colSpan={2 + group.columns.length}
                        className="sticky top-9 z-10 bg-blue-50 py-2 border-b text-sm font-bold text-blue-900"
                      >
                        {/* pinned to the left edge too, so the day name stays visible however far you scroll sideways */}
                        <div className="sticky left-0 inline-block px-4">{dayHeader(day)}</div>
                      </td>
                    </tr>
                    {group.rows.map(row => {
                        const period = row.byDay[day];
                        return (
                          <tr key={`${day}-${row.sequence}`} className="hover:bg-gray-50">
                            <td className="px-2 py-2 text-center text-xs font-medium border-r border-b w-24">{(period ?? row.label).name}</td>
                            <td className="px-2 py-2 text-center text-xs text-gray-600 border-r border-b w-20">
                              <div className="truncate">{formatTimeRange((period ?? row.label).startTime, (period ?? row.label).endTime)}</div>
                            </td>
                            {group.columns.map(col => renderCell(col.id, period, day))}
                          </tr>
                        );
                      })}
                  </tbody>
                ))}
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
        <div className="overflow-auto max-h-[80vh]">
          <table className="min-w-full text-xs border-separate border-spacing-0">
            <thead className="bg-gray-50 sticky top-0 z-20">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b sticky left-0 bg-gray-50 z-30 min-w-[120px]">
                  {t('Period')} / {t('Time')}
                </th>
                {DAYS_ORDER.map(day => (
                  <th key={day} className="sticky top-0 bg-gray-50 px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b min-w-[140px]">
                    {day.charAt(0) + day.slice(1).toLowerCase()}
                    {dateByDay[day] && <div className="text-[10px] font-normal normal-case text-gray-400">{dateByDay[day]}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {classRows.map(row => (
                <tr key={row.sequence} className="hover:bg-gray-50">
                  <th className="px-2 py-2 border-r border-b bg-gray-50 font-medium text-gray-800 sticky left-0 z-10 min-w-[120px]">
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

      {/* Mark all present -- TODAY only, only periods with nothing recorded yet.
          Not offered in the school-wide view (only in "My classes" and the class view). */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center gap-3">
        {activeMode !== 'school' && (
          <>
            <button
              onClick={() => setMarkConfirmOpen(true)}
              disabled={!canMarkAll || unrecordedForMarkDay === 0}
              className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              {t('Mark all present')}
              {markDay ? ` — ${markDay.charAt(0) + markDay.slice(1).toLowerCase()} ${dateByDay[markDay]}` : ''}
            </button>
            <span className="text-xs text-gray-500">
              {markDay
                ? `${unrecordedForMarkDay} ${t('periods not recorded yet')} · ${scopeLabel}`
                : t('Today is not a school day in the week shown. Go to this week to mark today.')}
            </span>
          </>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {isDean
            ? t("Tip: click a cell of today's column to change present / late / absent. Other days are read-only.")
            : t('Tip: click any cell to change present / late / absent.')}
        </span>
      </div>

      <EditAttendanceModal
        target={editTarget}
        academicYearId={selectedAcademicYear?.id}
        onClose={() => setEditTarget(null)}
        onSaved={() => load(true)}
      />

      <Modal isOpen={markConfirmOpen} onClose={() => !isMarking && setMarkConfirmOpen(false)} title={t('Mark all present')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            {t('Mark')} <strong>{unrecordedForMarkDay}</strong> {t('unrecorded periods as present for')}{' '}
            <strong>
              {markDay ? markDay.charAt(0) + markDay.slice(1).toLowerCase() : ''} {dateByDay[markDay]}
            </strong>{' '}
            ({scopeLabel})?
          </p>
          <p className="text-xs text-gray-500">
            {t('Only this day is affected. Periods already recorded as present, late or absent are not changed.')}
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setMarkConfirmOpen(false)}
              disabled={isMarking}
              className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
            >
              {t('Cancel')}
            </button>
            <button
              onClick={confirmMarkAll}
              disabled={isMarking}
              className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              {isMarking ? t('Saving...') : t('Confirm')}
            </button>
          </div>
        </div>
      </Modal>

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
