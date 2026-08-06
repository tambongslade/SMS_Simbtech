'use client';

import { Fragment, useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import {
  ArrowPathIcon,
  ChevronRightIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, Modal } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import {
  fetchFeeStats,
  fmtMoney,
  fmtPct,
  type ClassFeeStats,
  type FeeGroupStats,
  type FeeStudentRow,
} from '@/lib/feeStatsApi';

type Drill = { title: string; rows: FeeStudentRow[] } | null;

/** Paid vs unpaid as one bar — the whole point of the page, at a glance. */
function PaidBar({ group }: { group: FeeGroupStats }) {
  if (group.studentCount === 0) return <span className="text-xs text-gray-400">—</span>;
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-red-200 overflow-hidden">
        <div className="h-full bg-emerald-500" style={{ width: `${group.paidRate}%` }} />
      </div>
      <span className="text-xs text-gray-600 tabular-nums w-12 text-right">
        {fmtPct(group.paidRate)}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'good' | 'bad';
}) {
  const valueTone =
    tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : 'text-gray-900';
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueTone}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function BursarFeeStatisticsPage() {
  const { selectedAcademicYear } = useAuth();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [drill, setDrill] = useState<Drill>(null);

  const yearId = selectedAcademicYear?.id;

  const { data, error, isLoading, mutate } = useSWR(
    yearId ? ['fee-stats', yearId] : null,
    ([, id]) => fetchFeeStats(id as number),
    {
      revalidateOnFocus: false,
      onError: (err) => {
        if (err?.message !== 'Unauthorized') toast.error('Could not load fee statistics.');
      },
    },
  );

  const classes = useMemo(() => {
    const list = data?.classes ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.subClasses.some((sc) => sc.name.toLowerCase().includes(q)),
    );
  }, [data, search]);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Open the student list behind any number in the table.
  const openDrill = (title: string, filter: (row: FeeStudentRow) => boolean) => {
    const rows = (data?.students ?? []).filter(filter);
    setDrill({ title, rows: rows.sort((a, b) => b.balance - a.balance) });
  };

  const exportCsv = () => {
    if (!data) return;
    const header = 'Class,Subclass,Students,Paid in full,Not paid,Expected,Collected,Outstanding,% paid';
    const lines = data.classes.flatMap((c) => [
      `"${c.name}","(all)",${c.studentCount},${c.paidCount},${c.unpaidCount},${c.expected},${c.collected},${c.outstanding},${c.paidRate.toFixed(1)}`,
      ...c.subClasses.map(
        (sc) =>
          `"${c.name}","${sc.name}",${sc.studentCount},${sc.paidCount},${sc.unpaidCount},${sc.expected},${sc.collected},${sc.outstanding},${sc.paidRate.toFixed(1)}`,
      ),
    ]);
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fee-statistics-${selectedAcademicYear?.name || 'year'}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const totals = data?.totals;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Fee Payment Statistics</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Who has paid in full and who hasn&apos;t, per class and subclass
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

      {!yearId && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          Select an academic year to see fee statistics.
        </div>
      )}

      {error && yearId && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          Could not load fee statistics. Try refreshing.
        </div>
      )}

      {/* Totals */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Students with fees"
            value={totals.studentCount.toLocaleString()}
            sub={`${fmtMoney(totals.expected)} expected`}
          />
          <StatCard
            label="Paid in full"
            value={totals.paidCount.toLocaleString()}
            sub={fmtPct(totals.paidRate)}
            tone="good"
          />
          <StatCard
            label="Not fully paid"
            value={totals.unpaidCount.toLocaleString()}
            sub={`${totals.partialCount.toLocaleString()} part-paid`}
            tone="bad"
          />
          <StatCard
            label="Collected"
            value={fmtMoney(totals.collected)}
            sub={`${fmtMoney(totals.outstanding)} outstanding`}
          />
        </div>
      )}

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
          <div className="px-4 py-12 text-center text-gray-500">Loading fee statistics…</div>
        ) : classes.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500">
            {data ? 'No fee records for this academic year.' : 'Nothing to show yet.'}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class / Subclass</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Students</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Not paid</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">% paid</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Collected</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {classes.map((cls: ClassFeeStats) => {
                    const key = String(cls.id ?? 'unassigned');
                    const isOpen = expanded.has(key);
                    return (
                      <Fragment key={key}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggle(key)}
                              className="flex items-center gap-2 text-sm font-semibold text-gray-900"
                            >
                              <ChevronRightIcon
                                className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                              />
                              {cls.name}
                              <span className="text-xs font-normal text-gray-400">
                                ({cls.subClasses.length} subclass{cls.subClasses.length === 1 ? '' : 'es'})
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700 tabular-nums">
                            {cls.studentCount}
                          </td>
                          <td className="px-4 py-3 text-sm text-right tabular-nums">
                            <button
                              className="font-semibold text-emerald-700 hover:underline disabled:no-underline disabled:text-gray-400"
                              disabled={cls.paidCount === 0}
                              onClick={() =>
                                openDrill(`${cls.name} — paid in full`, (r) => r.classId === cls.id && r.paidInFull)
                              }
                            >
                              {cls.paidCount}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-right tabular-nums">
                            <button
                              className="font-semibold text-red-700 hover:underline disabled:no-underline disabled:text-gray-400"
                              disabled={cls.unpaidCount === 0}
                              onClick={() =>
                                openDrill(`${cls.name} — not fully paid`, (r) => r.classId === cls.id && !r.paidInFull)
                              }
                            >
                              {cls.unpaidCount}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <PaidBar group={cls} />
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700 tabular-nums">
                            {fmtMoney(cls.collected)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-red-700 tabular-nums">
                            {fmtMoney(cls.outstanding)}
                          </td>
                        </tr>

                        {isOpen &&
                          cls.subClasses.map((sc) => (
                            <tr key={`${key}-${sc.id ?? 'none'}`} className="bg-gray-50/60">
                              <td className="px-4 py-2 pl-12 text-sm text-gray-700">{sc.name}</td>
                              <td className="px-4 py-2 text-sm text-right text-gray-600 tabular-nums">
                                {sc.studentCount}
                              </td>
                              <td className="px-4 py-2 text-sm text-right tabular-nums">
                                <button
                                  className="text-emerald-700 hover:underline disabled:no-underline disabled:text-gray-400"
                                  disabled={sc.paidCount === 0}
                                  onClick={() =>
                                    openDrill(`${cls.name} · ${sc.name} — paid in full`, (r) =>
                                      r.subClassId === sc.id && r.paidInFull)
                                  }
                                >
                                  {sc.paidCount}
                                </button>
                              </td>
                              <td className="px-4 py-2 text-sm text-right tabular-nums">
                                <button
                                  className="text-red-700 hover:underline disabled:no-underline disabled:text-gray-400"
                                  disabled={sc.unpaidCount === 0}
                                  onClick={() =>
                                    openDrill(`${cls.name} · ${sc.name} — not fully paid`, (r) =>
                                      r.subClassId === sc.id && !r.paidInFull)
                                  }
                                >
                                  {sc.unpaidCount}
                                </button>
                              </td>
                              <td className="px-4 py-2">
                                <PaidBar group={sc} />
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-gray-600 tabular-nums">
                                {fmtMoney(sc.collected)}
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-red-700 tabular-nums">
                                {fmtMoney(sc.outstanding)}
                              </td>
                            </tr>
                          ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {classes.map((cls) => {
                const key = String(cls.id ?? 'unassigned');
                const isOpen = expanded.has(key);
                return (
                  <div key={key}>
                    <button
                      onClick={() => toggle(key)}
                      className="w-full flex items-center gap-2 px-4 py-3 text-left"
                    >
                      <ChevronRightIcon
                        className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{cls.name}</p>
                        <p className="text-xs text-gray-500">
                          <span className="text-emerald-700 font-medium">{cls.paidCount} paid</span>
                          {' · '}
                          <span className="text-red-700 font-medium">{cls.unpaidCount} not paid</span>
                          {' · '}
                          {fmtPct(cls.paidRate)}
                        </p>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3 pl-10 space-y-2">
                        {cls.subClasses.map((sc) => (
                          <div key={sc.id ?? 'none'} className="text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-gray-800 truncate">{sc.name}</span>
                              <span className="shrink-0 text-gray-500">
                                <span className="text-emerald-700">{sc.paidCount}</span>
                                {' / '}
                                <span className="text-red-700">{sc.unpaidCount}</span>
                              </span>
                            </div>
                            <div className="mt-1">
                              <PaidBar group={sc} />
                            </div>
                            <button
                              className="mt-1 text-red-700 underline disabled:no-underline disabled:text-gray-400"
                              disabled={sc.unpaidCount === 0}
                              onClick={() =>
                                openDrill(`${cls.name} · ${sc.name} — not fully paid`, (r) =>
                                  r.subClassId === sc.id && !r.paidInFull)
                              }
                            >
                              View {sc.unpaidCount} not paid
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-gray-500 px-1">
        Counts cover students who have a fee record for the year. A student with no fee record yet
        is in neither column.
      </p>

      {/* Student drill-down */}
      <Modal isOpen={!!drill} onClose={() => setDrill(null)} title={drill?.title || ''} size="lg">
        {drill && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {drill.rows.length} student{drill.rows.length === 1 ? '' : 's'}
              </p>
              <Button variant="outline" size="xs" leftIcon={XMarkIcon} onClick={() => setDrill(null)}>
                Close
              </Button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {drill.rows.map((row) => (
                <div key={row.studentId} className="p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{row.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {row.matricule} · {row.subClassName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-gray-900">{fmtMoney(row.paid)}</p>
                    <p className="text-xs text-gray-500">of {fmtMoney(row.expected)}</p>
                    {row.balance > 0 && (
                      <p className="text-xs font-medium text-red-700">{fmtMoney(row.balance)} owing</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
