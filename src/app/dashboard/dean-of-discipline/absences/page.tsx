'use client';

import { Fragment, useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/components/context/AuthContext';
import { useLanguage } from '@/components/context/LanguageContext';
import { apiService } from '@/lib/apiService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

type Slot = 'SLOT_2' | 'SLOT_5' | 'SLOT_8';
type AbsenceType = 'CLASS_ABSENCE' | 'MORNING_LATENESS';
type Source = 'all' | 'DM' | 'TEACHER';
type RangeMode = 'daily' | 'weekly' | 'monthly';

interface AbsenceRow {
  id: number;
  absenceType: AbsenceType | string;
  isExcused: boolean;
  excuseReason: string | null;
  excusedAt: string | null;
  makeupStatus: string;
  createdAt: string;
  student: { id: number; name: string; matricule: string | null } | null;
  subClass: { id: number; name: string; class: { id: number; name: string } } | null;
  assignedBy: { id: number; name: string } | null;
  excusedBy: { id: number; name: string } | null;
  slot: Slot | null;
  recordedVia: 'DM' | 'TEACHER' | null;
  totalInRange: number;
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

// DM roll call has 3 fixed daily check-in slots -- this IS "period" for
// absences (see disciplineService.ts). TeacherPeriod/Subject is basically
// never populated (bulk roll-call recording doesn't require picking one),
// so a row's slot is what actually renders when Subject would otherwise be
// blank.
const SLOT_LABEL: Record<Slot, string> = {
  SLOT_2: 'Period 1',
  SLOT_5: 'Period 2',
  SLOT_8: 'Period 3',
};

const SOURCE_LABEL: Record<'DM' | 'TEACHER', string> = {
  DM: 'Discipline Master',
  TEACHER: 'Teacher',
};

const toISO = (d: Date) => d.toISOString().slice(0, 10);

function todayISO(): string {
  return toISO(new Date());
}

// First/last day of the given "YYYY-MM" month string, as ISO dates.
function monthBounds(monthStr: string): { from: string; to: string } {
  const [y, m] = monthStr.split('-').map(Number);
  if (!y || !m) return { from: todayISO(), to: todayISO() };
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0); // day 0 of next month = last day of this month
  return { from: toISO(from), to: toISO(to) };
}

function currentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const PAGE_SIZE = 50;

function ClassAbsencesPageInner() {
  const { selectedAcademicYear } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Derive "Back to Overview" URL, and the student-profile link prefix, from
  // the current role segment (e.g. "/dashboard/discipline-master/absences"
  // -> "/dashboard/discipline-master/overview" and ".../students/:id").
  // super-manager keeps its own pre-existing profile route; every other
  // discipline role shares dean-of-discipline's (see that page's students/
  // [id] route comment) and falls back to it for role prefixes without an
  // overview of their own.
  const roleSegment = useMemo(() => {
    const parts = (pathname ?? '').split('/');
    return parts.length > 2 ? parts[2] : 'dean-of-discipline';
  }, [pathname]);

  const overviewHref = useMemo(() => {
    if (roleSegment === 'senior-discipline-master' || roleSegment === 'discipline-coordinator') {
      return '/dashboard/dean-of-discipline/overview';
    }
    if (roleSegment === 'super-manager') {
      return '/dashboard/super-manager/discipline-overview';
    }
    return `/dashboard/${roleSegment}/overview`;
  }, [roleSegment]);

  const studentHref = (studentId: number) =>
    roleSegment === 'super-manager'
      ? `/dashboard/super-manager/student-management/${studentId}`
      : `/dashboard/${roleSegment}/students/${studentId}`;

  // "Lateness" and "Class Absences" on the overview page both link here,
  // distinguished by ?type=.
  const [absenceType, setAbsenceType] = useState<AbsenceType>(
    searchParams.get('type') === 'MORNING_LATENESS' ? 'MORNING_LATENESS' : 'CLASS_ABSENCE'
  );

  // Daily/Weekly/Monthly range picker. Seeded from whatever from/to the
  // overview page's stat-card link carried over (if any), otherwise today.
  const initialFrom = searchParams.get('from') || todayISO();
  const initialTo = searchParams.get('to') || todayISO();
  const [rangeMode, setRangeMode] = useState<RangeMode>(
    initialFrom === initialTo ? 'daily' : 'weekly'
  );
  const [selectedDate, setSelectedDate] = useState(initialFrom);
  const [weekFrom, setWeekFrom] = useState(initialFrom);
  const [weekTo, setWeekTo] = useState(initialTo);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());

  const { from, to } = useMemo(() => {
    if (rangeMode === 'daily') return { from: selectedDate, to: selectedDate };
    if (rangeMode === 'monthly') return monthBounds(selectedMonth);
    return { from: weekFrom, to: weekTo };
  }, [rangeMode, selectedDate, weekFrom, weekTo, selectedMonth]);

  const [excusedFilter, setExcusedFilter] = useState<string>(searchParams.get('is_excused') || 'all');
  const [slotFilter, setSlotFilter] = useState<string>(searchParams.get('slot') || 'all');
  const [sourceFilter, setSourceFilter] = useState<Source>('all');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AbsenceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Which student-groups are currently expanded to show every individual
  // record, keyed by "<subClassId>-<studentId>" (a student can in principle
  // straddle groupings if their subclass changed mid-range, so scope the key
  // to the subclass too rather than just the student id).
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('absence_type', absenceType);
    if (selectedAcademicYear?.id) params.set('academic_year_id', String(selectedAcademicYear.id));
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (excusedFilter !== 'all') params.set('is_excused', excusedFilter);
    if (slotFilter !== 'all') params.set('slot', slotFilter);
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));

    apiService
      .get<ListResponse>(`/discipline/absences?${params.toString()}`)
      .then((res) => {
        if (cancelled) return;
        const resp = res ?? { success: true, data: [], meta: { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 } };
        setRows(resp.data ?? []);
        setTotal(resp.meta?.total ?? 0);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load absences');
        setRows([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAcademicYear?.id, absenceType, from, to, excusedFilter, slotFilter, sourceFilter, page]);

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Group the current page of rows by Class, then SubClass, then Student --
  // one summary row per student (badge = totalInRange, the true count across
  // the whole filtered range, not just this page), expandable to the
  // individual records. Natural sort throughout so "FORM 2" sorts before
  // "FORM 10". Rows with no subclass (orphaned enrollment) fall into a
  // trailing "Unassigned" section.
  const classGroups = useMemo(() => {
    type StudentGroup = { studentId: number; studentName: string; matricule: string | null; count: number; rows: AbsenceRow[] };
    type SubGroup = { key: string; subClassName: string; students: StudentGroup[]; recordCount: number };
    const byClass = new Map<string, { className: string; subClasses: Map<string, { subClassName: string; byStudent: Map<string, StudentGroup> }> }>();

    for (const r of rows) {
      const classKey = r.subClass ? String(r.subClass.class.id) : 'unassigned';
      const className = r.subClass?.class?.name ?? t('Unassigned');
      const subKey = r.subClass ? String(r.subClass.id) : 'unassigned';
      const subClassName = r.subClass?.name ?? '';

      if (!byClass.has(classKey)) byClass.set(classKey, { className, subClasses: new Map() });
      const cls = byClass.get(classKey)!;
      if (!cls.subClasses.has(subKey)) cls.subClasses.set(subKey, { subClassName, byStudent: new Map() });
      const sub = cls.subClasses.get(subKey)!;

      const studentKey = r.student ? String(r.student.id) : `row-${r.id}`;
      if (!sub.byStudent.has(studentKey)) {
        sub.byStudent.set(studentKey, {
          studentId: r.student?.id ?? 0,
          studentName: r.student?.name ?? t('Unknown'),
          matricule: r.student?.matricule ?? null,
          count: r.totalInRange,
          rows: [],
        });
      }
      sub.byStudent.get(studentKey)!.rows.push(r);
    }

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return Array.from(byClass.entries())
      .sort(([keyA, a], [keyB, b]) => {
        if (keyA === 'unassigned') return 1;
        if (keyB === 'unassigned') return -1;
        return collator.compare(a.className, b.className);
      })
      .map(([classKey, cls]) => ({
        classKey,
        className: cls.className,
        subClasses: Array.from(cls.subClasses.entries())
          .map(([key, sub]): SubGroup => {
            const students = Array.from(sub.byStudent.values()).sort((a, b) =>
              collator.compare(a.studentName, b.studentName)
            );
            return {
              key,
              subClassName: sub.subClassName,
              students,
              recordCount: students.reduce((n, s) => n + s.rows.length, 0),
            };
          })
          .sort((a, b) => collator.compare(a.subClassName, b.subClassName)),
      }));
  }, [rows, t]);

  const isLateness = absenceType === 'MORNING_LATENESS';
  const pageTitle = isLateness ? t('Lateness') : t('Class Absences');
  const emptyMessage = isLateness
    ? t('No late arrivals found for the selected range.')
    : t('No absences found for the selected range.');

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
            {isLateness ? (
              <ClockIcon className="w-6 h-6 text-amber-600" />
            ) : (
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            )}
            {pageTitle}
          </h1>
          <p className="text-sm text-gray-600 mt-0.5">
            {from && to ? (from === to ? from : `${from} → ${to}`) : ''}
          </p>
        </div>
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
          {(['CLASS_ABSENCE', 'MORNING_LATENESS'] as AbsenceType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => { setAbsenceType(type); setPage(1); }}
              className={`px-3 py-1.5 ${absenceType === type
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
              {type === 'CLASS_ABSENCE' ? t('Absences') : t('Lateness')}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className="w-4 h-4 text-gray-500" />
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
            {(['daily', 'weekly', 'monthly'] as RangeMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setRangeMode(mode)}
                className={`px-3 py-1.5 capitalize ${rangeMode === mode
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {t(mode === 'daily' ? 'Daily' : mode === 'weekly' ? 'Weekly' : 'Monthly')}
              </button>
            ))}
          </div>
        </div>

        {rangeMode === 'daily' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('Day')}</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
        )}
        {rangeMode === 'weekly' && (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('From')}</label>
              <input
                type="date"
                value={weekFrom}
                onChange={(e) => { setWeekFrom(e.target.value); setPage(1); }}
                className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('To')}</label>
              <input
                type="date"
                value={weekTo}
                onChange={(e) => { setWeekTo(e.target.value); setPage(1); }}
                className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        )}
        {rangeMode === 'monthly' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('Month')}</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('Period')}</label>
            <select
              value={slotFilter}
              onChange={(e) => {
                setSlotFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            >
              <option value="all">{t('All periods')}</option>
              <option value="SLOT_2">{t('Period 1')}</option>
              <option value="SLOT_5">{t('Period 2')}</option>
              <option value="SLOT_8">{t('Period 3')}</option>
            </select>
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
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('Recorded by')}</label>
            <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
              {(['all', 'DM', 'TEACHER'] as Source[]).map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => { setSourceFilter(src); setPage(1); }}
                  className={`px-3 py-1.5 ${sourceFilter === src
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {src === 'all' ? t('All') : t(SOURCE_LABEL[src])}
                </button>
              ))}
            </div>
          </div>
          <div className="ml-auto text-sm text-gray-600 self-end">
            {loading ? t('Loading…') : `${total} ${t('records')}`}
          </div>
        </div>
      </Card>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200 text-red-800 text-sm">{error}</Card>
      )}

      {loading ? (
        <Card className="p-6 text-center text-sm text-gray-500">{t('Loading…')}</Card>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-gray-500">{emptyMessage}</Card>
      ) : (
        classGroups.map((cls) => (
          <div key={cls.classKey} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-bold text-gray-900">{cls.className}</h2>
              <span className="text-xs text-gray-500">
                {cls.subClasses.reduce((n, sc) => n + sc.recordCount, 0)} {t('records')}
              </span>
            </div>
            <div className="space-y-3">
              {cls.subClasses.map((sc) => (
                <Card key={sc.key} className="p-0 overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-100 border-b flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">
                      {sc.key === 'unassigned' ? t('Unassigned') : sc.subClassName}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {sc.students.length} {t('students')} · {sc.recordCount} {t('records')}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-xs uppercase text-gray-500 bg-gray-50 border-b">
                        <tr>
                          <th className="text-left py-2 px-3">{t('Student')}</th>
                          <th className="text-left py-2 px-3">{t('Recorded by')}</th>
                          <th className="text-right py-2 px-3">{t('Count')}</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sc.students.map((s) => {
                          const groupKey = `${sc.key}-${s.studentId}`;
                          const isOpen = expanded.has(groupKey);
                          // "Recorded by" on the summary row: whichever source
                          // shows up on this page's rows for the student — a
                          // dash if the record set is mixed or unknown.
                          const sources = new Set(s.rows.map((r) => r.recordedVia).filter(Boolean));
                          const sourceLabel = sources.size === 1
                            ? t(SOURCE_LABEL[[...sources][0] as 'DM' | 'TEACHER'])
                            : '—';
                          return (
                            <Fragment key={groupKey}>
                              <tr
                                className="border-b last:border-none hover:bg-gray-50 cursor-pointer"
                                onClick={() => toggleExpanded(groupKey)}
                              >
                                <td className="py-2 px-3">
                                  {s.studentId ? (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); router.push(studentHref(s.studentId)); }}
                                      className="text-blue-700 hover:text-blue-900 hover:underline text-left"
                                    >
                                      {s.studentName}
                                    </button>
                                  ) : (
                                    s.studentName
                                  )}
                                </td>
                                <td className="py-2 px-3 text-gray-600">{sourceLabel}</td>
                                <td className="py-2 px-3 text-right font-semibold text-gray-900">
                                  {s.count}
                                </td>
                                <td className="py-2 px-3 text-gray-400">
                                  {isOpen ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                                </td>
                              </tr>
                              {isOpen && (
                                <tr key={`${groupKey}-detail`} className="bg-gray-50/60 border-b last:border-none">
                                  <td colSpan={4} className="px-3 pb-3 pt-1">
                                    <table className="min-w-full text-xs">
                                      <thead className="text-gray-500">
                                        <tr>
                                          <th className="text-left py-1 pr-3">{t('Date')}</th>
                                          <th className="text-left py-1 pr-3">{t('Subject / Period')}</th>
                                          <th className="text-left py-1 pr-3">{t('Recorded by')}</th>
                                          <th className="text-left py-1 pr-3">{t('Status')}</th>
                                          <th className="text-left py-1 pr-3">{t('By')}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {s.rows.map((r) => (
                                          <tr key={r.id} className="border-t border-gray-200">
                                            <td className="py-1 pr-3 text-gray-700">
                                              {new Date(r.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-1 pr-3 text-gray-600">
                                              {r.teacherPeriod?.subject?.name ?? (r.slot ? SLOT_LABEL[r.slot] : '—')}
                                            </td>
                                            <td className="py-1 pr-3 text-gray-600">
                                              {r.recordedVia ? t(SOURCE_LABEL[r.recordedVia]) : '—'}
                                            </td>
                                            <td className="py-1 pr-3">
                                              {r.isExcused ? (
                                                <span className="text-green-700">{t('Excused')}</span>
                                              ) : (
                                                <span className="text-red-700">{t('Unexcused')}</span>
                                              )}
                                            </td>
                                            <td className="py-1 pr-3 text-gray-600">{r.assignedBy?.name ?? '—'}</td>
                                          </tr>
                                        ))}
                                        {s.count > s.rows.length && (
                                          <tr>
                                            <td colSpan={5} className="py-1 pr-3 text-gray-400 italic">
                                              {t('More records exist outside this page — refine the range or filters to see them.')}
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {totalPages > 1 && (
        <Card className="p-0">
          <div className="flex items-center justify-between p-3 bg-gray-50">
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
        </Card>
      )}
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
