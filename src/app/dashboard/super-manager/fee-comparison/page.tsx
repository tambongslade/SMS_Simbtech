"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/components/context/AuthContext';
import controlFeeService, { AuditRosterRow, AuditStatus, ComparisonSummary } from '@/lib/controlFeeService';
import toast from 'react-hot-toast';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ScaleIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(amount);

type StudentStatus = 'NEW' | 'OLD' | 'REPEATER';

const STUDENT_STATUS_BADGE: Record<StudentStatus, { bg: string; label: string }> = {
  NEW:      { bg: 'bg-emerald-100 text-emerald-800', label: 'New' },
  OLD:      { bg: 'bg-gray-100 text-gray-600',       label: 'Old' },
  REPEATER: { bg: 'bg-orange-100 text-orange-800',   label: 'Repeater' },
};

function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const { bg, label } = STUDENT_STATUS_BADGE[status] ?? { bg: 'bg-gray-100 text-gray-500', label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${bg}`}>
      {label}
    </span>
  );
}

const STATUS_CHIPS: { value: AuditStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'MATCHED', label: 'Matched' },
  { value: 'PAYMENT_MISMATCH', label: 'Payment Mismatch' },
  { value: 'MISSING_CONTROL', label: 'Missing Control' },
  { value: 'MISSING_PRIMARY', label: 'Missing Primary' },
  { value: 'NO_RECORDS', label: 'No Records' },
];

const STATUS_BADGE: Record<AuditStatus, { bg: string; label: string }> = {
  MATCHED:          { bg: 'bg-green-100 text-green-800',  label: 'Matched' },
  PAYMENT_MISMATCH: { bg: 'bg-amber-100 text-amber-800',  label: 'Mismatch' },
  MISSING_CONTROL:  { bg: 'bg-blue-100 text-blue-800',    label: 'Missing Control' },
  MISSING_PRIMARY:  { bg: 'bg-red-100 text-red-800',      label: 'Missing Primary' },
  NO_RECORDS:       { bg: 'bg-gray-100 text-gray-500',    label: 'No Records' },
};

function StatusBadge({ status }: { status: AuditStatus }) {
  const { bg, label } = STATUS_BADGE[status] ?? { bg: 'bg-gray-100 text-gray-500', label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${bg}`}>
      {label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeeAuditRoster() {
  const { user, currentAcademicYear, selectedRole, selectedAcademicYear: globalAcademicYear } = useAuth();

  const canAccess = ['SUPER_MANAGER', 'PRINCIPAL', 'MANAGER'].includes(selectedRole || '') ||
    user?.userRoles?.some((ur: { role: string }) => ['SUPER_MANAGER', 'PRINCIPAL', 'MANAGER'].includes(ur.role));

  // Academic years
  const [localAcademicYears, setLocalAcademicYears] = useState<{ id: number; name: string }[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<{ id: number; name: string } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AuditStatus | ''>('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<StudentStatus | ''>('');
  const [classId, setClassId] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 25;

  // Export
  const [exportLoading, setExportLoading] = useState(false);

  // ── Load academic years ──────────────────────────────────────────────────
  useEffect(() => {
    if (!canAccess) return;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/academic-years`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const json = await res.json();
        const years: { id: number; name: string }[] = json.data || [];
        setLocalAcademicYears(years);
        // Prefer the globally selected year, then current year, then first in list
        const initial = globalAcademicYear ?? currentAcademicYear;
        if (initial) {
          setSelectedAcademicYear(initial as { id: number; name: string });
        } else if (years.length > 0) {
          setSelectedAcademicYear(years[0]);
        }
      } catch {
        toast.error('Failed to load academic years');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess]);

  // ── Sync with global academic year when changed via sidebar ────────────
  useEffect(() => {
    if (globalAcademicYear) {
      setSelectedAcademicYear(globalAcademicYear as { id: number; name: string });
    }
  }, [globalAcademicYear]);

  // ── Debounce search ──────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // ── Reset page on filter change ──────────────────────────────────────────
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, studentStatusFilter, classId, selectedAcademicYear]);

  // ── SWR: roster ─────────────────────────────────────────────────────────
  const rosterKey = selectedAcademicYear
    ? {
        _key: 'audit-roster',
        academicYearId: selectedAcademicYear.id,
        page,
        limit: LIMIT,
        ...(classId ? { classId } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(studentStatusFilter ? { studentStatus: studentStatusFilter } : {}),
      }
    : null;

  const { data: rosterData, isLoading } = useSWR(
    rosterKey,
    (params) => {
      const { _key, ...rest } = params as typeof params & { _key: string };
      void _key;
      return controlFeeService.getAuditRoster(rest);
    },
  );

  const rows: AuditRosterRow[] = rosterData?.data?.data ?? [];
  const meta = rosterData?.data?.meta ?? { total: 0, totalPages: 1, page: 1 };

  // ── SWR: summary ────────────────────────────────────────────────────────
  const { data: summaryData } = useSWR(
    selectedAcademicYear ? `fee-comparison-summary-${selectedAcademicYear.id}` : null,
    () => controlFeeService.getComparisonSummary({ academicYearId: selectedAcademicYear!.id }),
  );
  const summary: ComparisonSummary | null = summaryData?.data ?? null;

  // ── SWR: classes for filter ──────────────────────────────────────────────
  const { data: classesData } = useSWR(
    'classes-list',
    () => fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/classes`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(r => r.json()),
  );
  const classes: { id: number; name: string }[] = classesData?.data || [];

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!selectedAcademicYear) return;
    setExportLoading(true);
    try {
      const blob = await controlFeeService.exportDiscrepancies({
        academicYearId: selectedAcademicYear.id,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(classId ? { classId } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fee-audit-${selectedAcademicYear.name}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExportLoading(false);
    }
  };

  const hasFilters = !!(search || statusFilter || studentStatusFilter || classId);
  const clearFilters = () => { setSearch(''); setStatusFilter(''); setStudentStatusFilter(''); setClassId(''); };

  // ── Access guard ─────────────────────────────────────────────────────────
  if (!canAccess) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-center">
          <XCircleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600 text-sm">This page is accessible to Super Managers, Principals, and Managers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ScaleIcon className="h-7 w-7 text-blue-600 flex-shrink-0" />
            Fee Audit Roster
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedAcademicYear ? `Academic Year: ${selectedAcademicYear.name}` : 'Select an academic year to begin'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedAcademicYear?.id ?? ''}
            onChange={e => {
              const yr = localAcademicYears.find(y => y.id === parseInt(e.target.value));
              if (yr) setSelectedAcademicYear(yr);
            }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
          >
            <option value="">Select Year</option>
            {localAcademicYears.map(yr => (
              <option key={yr.id} value={yr.id}>{yr.name}</option>
            ))}
          </select>

          <button
            onClick={handleExport}
            disabled={exportLoading || !selectedAcademicYear}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {exportLoading ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>

      {/* ── No academic year ────────────────────────────────────────────── */}
      {!selectedAcademicYear && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ExclamationCircleIcon className="h-12 w-12 text-yellow-400 mb-3" />
          <p className="text-gray-600 font-medium">Please select an academic year</p>
        </div>
      )}

      {selectedAcademicYear && (
        <>
          {/* ── Summary cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Students',   value: summary?.totalStudents ?? '—',       icon: ClipboardDocumentListIcon, color: 'blue' },
              { label: 'Matched',           value: summary ? (summary.totalStudents - summary.totalDiscrepancies) : '—', icon: CheckCircleIcon, color: 'green' },
              { label: 'Discrepancies',     value: summary?.totalDiscrepancies ?? '—', icon: ExclamationTriangleIcon,   color: 'red' },
              { label: 'Avg Variance',      value: summary ? `${summary.averageVariancePercentage.toFixed(1)}%` : '—', icon: ChartBarIcon, color: 'yellow' },
            ].map(stat => {
              const Icon = stat.icon;
              const colorMap: Record<string, string> = {
                blue:   'bg-blue-50 text-blue-600',
                green:  'bg-green-50 text-green-600',
                red:    'bg-red-50 text-red-600',
                yellow: 'bg-yellow-50 text-yellow-600',
              };
              return (
                <div key={stat.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${colorMap[stat.color]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 truncate">{stat.label}</p>
                      <p className="text-sm font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Status chips ───────────────────────────────────────────── */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {STATUS_CHIPS.map(chip => (
              <button
                key={chip.value}
                onClick={() => setStatusFilter(chip.value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === chip.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* ── Student status chips ───────────────────────────────────── */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {([['', 'All Students'], ['NEW', 'New'], ['OLD', 'Old'], ['REPEATER', 'Repeater']] as [StudentStatus | '', string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStudentStatusFilter(val)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  studentStatusFilter === val
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Search + class filter ──────────────────────────────────── */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search student name or matricule…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={classId}
                onChange={e => setClassId(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
              >
                <option value="">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* ── Table / Cards ──────────────────────────────────────────── */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                <span className="ml-3 text-gray-500 text-sm">Loading roster…</span>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <ChartBarIcon className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No students found</p>
                {hasFilters && (
                  <button onClick={clearFilters} className="mt-2 text-sm text-blue-600 hover:underline">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Student', 'Class / Subclass', 'Type', 'Primary Expected', 'Primary Paid', 'Control Paid', 'Difference', 'Status'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rows.map(row => (
                        <tr key={row.enrollmentId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">{row.studentName}</p>
                            <p className="text-xs text-gray-500">{row.studentMatricule}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{row.className}</p>
                            <p className="text-xs text-gray-500">{row.subClassName}</p>
                          </td>
                          <td className="px-4 py-3">
                            <StudentStatusBadge status={row.studentStatus} />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {row.primary ? formatCurrency(row.primary.amountExpected) : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-green-700 whitespace-nowrap">
                            {row.primary ? formatCurrency(row.primary.amountPaid) : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                            {row.control
                              ? <span className="text-blue-700">{formatCurrency(row.control.amountPaid)}</span>
                              : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {row.status === 'PAYMENT_MISMATCH'
                              ? <span className="text-amber-700 font-medium">{formatCurrency(Math.abs(row.paidAmountDifference))}</span>
                              : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={row.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-gray-200">
                  {rows.map(row => (
                    <div key={row.enrollmentId} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{row.studentName}</p>
                          <p className="text-xs text-gray-500">{row.studentMatricule}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{row.className} — {row.subClassName}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusBadge status={row.status} />
                          <StudentStatusBadge status={row.studentStatus} />
                        </div>
                      </div>
                      <div className="text-xs space-y-1 pt-1">
                        <p className="text-gray-700">
                          Bursar: <span className="font-medium text-green-700">{row.primary ? formatCurrency(row.primary.amountPaid) : '—'}</span>
                          {row.primary ? ` paid (of ${formatCurrency(row.primary.amountExpected)} expected)` : ''}
                        </p>
                        <p className="text-gray-700">
                          Controller: <span className="font-medium text-blue-700">{row.control ? formatCurrency(row.control.amountPaid) : '—'}</span>
                          {row.control ? ` paid` : ' (no record)'}
                        </p>
                        {row.status === 'PAYMENT_MISMATCH' && (
                          <p className="text-amber-700 font-medium">
                            Difference: {formatCurrency(Math.abs(row.paidAmountDifference))}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Pagination ─────────────────────────────────────────────── */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Page <strong>{meta.page}</strong> of <strong>{meta.totalPages}</strong> ({meta.total} students)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
