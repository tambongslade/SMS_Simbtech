'use client';

import { Fragment, useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import {
  ArrowPathIcon,
  ChevronRightIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';
import { sortClassesByLevel, sortSubClassesByLevel } from '@/lib/classOrdering';

interface SubClassSummary {
  id: number;
  name: string;
  classId?: number;
  studentCount?: number;
}

interface ClassSummary {
  id: number;
  name: string;
  studentCount?: number;
  academicYearId?: number;
  subClasses?: SubClassSummary[];
}

const fetchClasses = async (): Promise<ClassSummary[]> => {
  const res = await apiService.get<{ data: ClassSummary[] }>('/classes?limit=200');
  return res?.data ?? [];
};

const fetchClassDetail = async (id: number): Promise<ClassSummary | null> => {
  const res = await apiService.get<{ data: ClassSummary }>(`/classes/${id}`);
  return res?.data ?? null;
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

/**
 * Per-class subclass breakdown. Only fetched once the class is expanded — the
 * list endpoint carries class totals but no per-subclass counts.
 */
function useSubClasses(classId: number, enabled: boolean) {
  const { data, isLoading, error } = useSWR(
    enabled ? ['class-detail', classId] : null,
    ([, id]) => fetchClassDetail(id as number),
    {
      revalidateOnFocus: false,
      onError: () => toast.error('Could not load subclass enrollment.'),
    },
  );
  return {
    subClasses: sortSubClassesByLevel(data?.subClasses ?? []),
    isLoading,
    error,
  };
}

function SubClassRows({ cls, colSpan }: { cls: ClassSummary; colSpan: number }) {
  const { subClasses, isLoading, error } = useSubClasses(cls.id, true);

  if (isLoading) {
    return (
      <tr className="bg-gray-50/60">
        <td colSpan={colSpan} className="px-4 py-3 pl-12 text-sm text-gray-500">
          Loading subclasses…
        </td>
      </tr>
    );
  }

  if (error || subClasses.length === 0) {
    return (
      <tr className="bg-gray-50/60">
        <td colSpan={colSpan} className="px-4 py-3 pl-12 text-sm text-gray-500">
          {error ? 'Could not load subclasses.' : 'No subclasses in this class.'}
        </td>
      </tr>
    );
  }

  return (
    <>
      {subClasses.map((sc) => (
        <tr key={sc.id} className="bg-gray-50/60">
          <td className="px-4 py-2 pl-12 text-sm text-gray-700">{sc.name}</td>
          <td className="px-4 py-2 text-sm text-right text-gray-700 tabular-nums">
            {sc.studentCount ?? 0}
          </td>
          <td className="px-4 py-2 text-sm text-right text-gray-400">—</td>
        </tr>
      ))}
    </>
  );
}

/** Mobile card view of one class, with its subclasses when opened. */
function ClassCard({ cls }: { cls: ClassSummary }) {
  const [open, setOpen] = useState(false);
  const { subClasses, isLoading, error } = useSubClasses(cls.id, open);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <ChevronRightIcon
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}
          />
          <span className="font-semibold text-gray-900 truncate">{cls.name}</span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-gray-900 tabular-nums">
          {cls.studentCount ?? 0}
          <span className="ml-1 text-xs font-normal text-gray-500">students</span>
        </span>
      </button>

      {open && (
        <div className="bg-gray-50/60 divide-y divide-gray-200">
          {isLoading ? (
            <p className="px-4 py-3 pl-10 text-sm text-gray-500">Loading subclasses…</p>
          ) : error || subClasses.length === 0 ? (
            <p className="px-4 py-3 pl-10 text-sm text-gray-500">
              {error ? 'Could not load subclasses.' : 'No subclasses in this class.'}
            </p>
          ) : (
            subClasses.map((sc) => (
              <div key={sc.id} className="flex items-center justify-between px-4 py-2 pl-10">
                <span className="text-sm text-gray-700 truncate">{sc.name}</span>
                <span className="text-sm text-gray-700 tabular-nums">{sc.studentCount ?? 0}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Student headcount per class, drilling down to subclasses. Shared by every
 * role that needs the numbers without the power to change them (bursar,
 * super manager).
 */
export default function EnrollmentView() {
  const { selectedAcademicYear } = useAuth();

  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { data, error, isLoading, mutate } = useSWR('bursar-enrollment-classes', fetchClasses, {
    revalidateOnFocus: false,
    onError: (err) => {
      if (err?.message !== 'Unauthorized') toast.error('Could not load classes.');
    },
  });

  const classes = useMemo(() => {
    const list = sortClassesByLevel(data ?? []);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        (c.subClasses ?? []).some((sc) => sc.name?.toLowerCase().includes(q)),
    );
  }, [data, search]);

  const totals = useMemo(() => {
    const list = data ?? [];
    return {
      students: list.reduce((sum, c) => sum + (c.studentCount ?? 0), 0),
      classes: list.length,
      subClasses: list.reduce((sum, c) => sum + (c.subClasses?.length ?? 0), 0),
    };
  }, [data]);

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exportCsv = () => {
    if (!data) return;
    const header = 'Class,Students,Subclasses';
    const lines = data.map(
      (c) => `"${c.name}",${c.studentCount ?? 0},${c.subClasses?.length ?? 0}`,
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enrollment-${selectedAcademicYear?.name || 'year'}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Enrollment</h1>
          <p className="text-gray-600 mt-1 text-sm">
            How many students are in each class, and in each subclass
            {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={ArrowPathIcon}
            onClick={() => mutate()}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={DocumentArrowDownIcon}
            onClick={exportCsv}
            disabled={!data}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          Could not load enrollment. Try refreshing.
        </div>
      )}

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Students" value={totals.students.toLocaleString()} sub="All classes" />
        <StatCard label="Classes" value={totals.classes.toLocaleString()} />
        <StatCard label="Subclasses" value={totals.subClasses.toLocaleString()} />
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative max-w-sm">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by class or subclass…"
          />
          <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-gray-500">Loading classes…</div>
        ) : classes.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500">
            {data ? 'No classes found.' : 'Nothing to show yet.'}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Class / Subclass
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Students
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Subclasses
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {classes.map((cls) => {
                    const isOpen = expanded.has(cls.id);
                    return (
                      <Fragment key={cls.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggle(cls.id)}
                              className="flex items-center gap-2 text-sm font-semibold text-gray-900"
                            >
                              <ChevronRightIcon
                                className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                              />
                              {cls.name}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 tabular-nums">
                            {cls.studentCount ?? 0}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600 tabular-nums">
                            {cls.subClasses?.length ?? 0}
                          </td>
                        </tr>
                        {isOpen && <SubClassRows cls={cls} colSpan={3} />}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden p-3 space-y-3">
              {classes.map((cls) => (
                <ClassCard key={cls.id} cls={cls} />
              ))}
            </div>
          </>
        )}
      </div>

      <p className="flex items-center gap-2 text-xs text-gray-500">
        <UsersIcon className="h-4 w-4" />
        Counts reflect students enrolled in the current academic year.
      </p>
    </div>
  );
}
