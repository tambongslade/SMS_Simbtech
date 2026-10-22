'use client';

import type { ReactNode } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import type { DepartmentStatus } from './useDepartmentStatus';

// Common header / loading / empty / error frame for the HOD department pages.
export function DeptPageShell({
  title,
  subtitle,
  icon,
  data,
  loading,
  error,
  reload,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  data: DepartmentStatus | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  children: ReactNode;
}) {
  return (
    <div className="max-w-7xl mx-auto space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            {icon}
            {title}
          </h1>
          <p className="text-sm text-gray-600 mt-0.5">
            {subtitle}
            {data?.subjects?.length ? ` · ${data.subjects.map((s) => s.name).join(', ')}` : ''}
            {data?.academicYear ? ` · ${data.academicYear.name}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowPathIcon className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">Loading…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      ) : !data || data.subjects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
          No subjects are assigned to you as Head of Department yet. Ask an administrator to set you as HOD on your
          department&apos;s subjects.
        </div>
      ) : (
        children
      )}
    </div>
  );
}
