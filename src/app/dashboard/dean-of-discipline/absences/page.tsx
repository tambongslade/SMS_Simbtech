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
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

type Slot = 'SLOT_2' | 'SLOT_5' | 'SLOT_8';

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
  slot: Slot | null;
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

function defaultDates(): { from: string; to: string } {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  return { from: toISO(now), to: toISO(now) };
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

  const defaults = defaultDates();
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [from, setFrom] = useState(searchParams.get('from') || defaults.from);
  const [to, setTo] = useState(searchParams.get('to') || defaults.to);
  const [excusedFilter, setExcusedFilter] = useState<string>(searchParams.get('is_excused') || 'all');
  const [slotFilter, setSlotFilter] = useState<string>(searchParams.get('slot') || 'all');
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
    if (slotFilter !== 'all') params.set('slot', slotFilter);
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
  }, [selectedAcademicYear?.id, from, to, excusedFilter, slotFilter, page]);

  const onDateChange = (field: 'from' | 'to', value: string) => {
    if (field === 'from') setFrom(value);
    else setTo(value);
    setPage(1);
  };

  // Group the current page of rows by Class, then by SubClass within each
  // class, in class/subclass order (natural sort, so "FORM 2" sorts before
  // "FORM 10") -- one section per class, one table per sub-class inside it.
  // Rows with no subclass (orphaned enrollment) fall into a trailing
  // "Unassigned" section.
  const classGroups = useMemo(() => {
    type SubGroup = { key: string; subClassName: string; rows: AbsenceRow[] };
    const byClass = new Map<string, { className: string; subClasses: Map<string, SubGroup> }>();

    for (const r of rows) {
      const classKey = r.subClass ? String(r.subClass.class.id) : 'unassigned';
      const className = r.subClass?.class?.name ?? t('Unassigned');
      const subKey = r.subClass ? String(r.subClass.id) : 'unassigned';
      const subClassName = r.subClass?.name ?? '';

      if (!byClass.has(classKey)) byClass.set(classKey, { className, subClasses: new Map() });
      const cls = byClass.get(classKey)!;
      if (!cls.subClasses.has(subKey)) cls.subClasses.set(subKey, { key: subKey, subClassName, rows: [] });
      cls.subClasses.get(subKey)!.rows.push(r);
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
        subClasses: Array.from(cls.subClasses.values()).sort((a, b) =>
          collator.compare(a.subClassName, b.subClassName)
        ),
      }));
  }, [rows, t]);

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
            {from && to ? `${from} → ${to}` : ''}
          </p>
        </div>
        <Button
          variant="outline"
          leftIcon={CalendarDaysIcon}
          onClick={() => setShowRangePicker((v) => !v)}
        >
          {t('Range')}
        </Button>
      </div>

      {showRangePicker && (
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
          </div>
        </Card>
      )}

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
        <Card className="p-6 text-center text-sm text-gray-500">
          {t('No absences found for the selected range.')}
        </Card>
      ) : (
        classGroups.map((cls) => (
          <div key={cls.classKey} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-bold text-gray-900">{cls.className}</h2>
              <span className="text-xs text-gray-500">
                {cls.subClasses.reduce((n, sc) => n + sc.rows.length, 0)} {t('records')}
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
                      {sc.rows.length} {t('records')}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-xs uppercase text-gray-500 bg-gray-50 border-b">
                        <tr>
                          <th className="text-left py-2 px-3">{t('Student')}</th>
                          <th className="text-left py-2 px-3">{t('Subject')}</th>
                          <th className="text-left py-2 px-3">{t('Recorded By')}</th>
                          <th className="text-right py-2 px-3">{t('Total Absences')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sc.rows.map((r) => (
                          <tr key={r.id} className="border-b last:border-none hover:bg-gray-50">
                            <td className="py-2 px-3">
                              {r.student ? (
                                <button
                                  type="button"
                                  onClick={() => router.push(studentHref(r.student!.id))}
                                  className="text-blue-700 hover:text-blue-900 hover:underline text-left"
                                >
                                  {r.student.name}
                                </button>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-2 px-3 text-gray-600">
                              {r.teacherPeriod?.subject?.name ?? (r.slot ? SLOT_LABEL[r.slot] : '—')}
                            </td>
                            <td className="py-2 px-3 text-gray-600">{r.assignedBy?.name ?? '—'}</td>
                            <td className="py-2 px-3 text-right font-semibold text-gray-900">
                              {r.totalInRange}
                            </td>
                          </tr>
                        ))}
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
