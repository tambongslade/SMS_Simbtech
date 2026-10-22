'use client';

// Read-only view of the examination structure: terms in teaching order with
// their sequences (1-6), status and submission deadline. For roles that need
// to see the calendar but not change it (e.g. Dean of Studies).

import { useMemo } from 'react';
import useSWR from 'swr';
import apiService from '@/lib/apiService';
import { useLanguage } from '@/components/context/LanguageContext';
import { formatDateMedium } from '@/lib/formatDate';
import { enumLabel } from '@/lib/enumLabels';
import { useAcademicYearFilter } from '@/hooks/useRememberedFilter';

interface YearData {
  id: number;
  name: string;
  isCurrent?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  terms?: { id: number; name: string; startDate?: string | null; endDate?: string | null; isHoliday?: boolean }[];
  examSequences?: { id: number; sequenceNumber: number; termId: number; status?: string; submissionDeadline?: string | null }[];
}

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-200 text-gray-800',
  FINALIZED: 'bg-blue-100 text-blue-800',
  REPORTS_GENERATING: 'bg-yellow-100 text-yellow-800',
  REPORTS_AVAILABLE: 'bg-indigo-100 text-indigo-800',
  REPORTS_FAILED: 'bg-red-100 text-red-800',
};

const fmt = (d?: string | null) => (d ? formatDateMedium(d) : '—');

export default function ExamStructureView() {
  const { t } = useLanguage();
  const { data, isLoading } = useSWR<{ data: YearData[] }>('/academic-years', (url: string) => apiService.get(url));
  const years = useMemo(() => data?.data ?? [], [data]);
  const [yearId, setYearId] = useAcademicYearFilter(years);

  const year = years.find(y => y.id === yearId);
  const terms = useMemo(
    () => [...(year?.terms ?? [])].sort(
      (a, b) => (a.startDate ? Date.parse(a.startDate) : Infinity) - (b.startDate ? Date.parse(b.startDate) : Infinity) || a.id - b.id
    ),
    [year]
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="block font-medium text-gray-700 mb-1">{t('Academic Year')}</span>
          <select className="rounded-md border-gray-300 text-sm" value={yearId} onChange={e => setYearId(Number(e.target.value) || '')}>
            {years.map(y => <option key={y.id} value={y.id}>{y.name}{y.isCurrent ? ` (${t('current')})` : ''}</option>)}
          </select>
        </label>
        {year && <p className="text-sm text-gray-500">{fmt(year.startDate)} – {fmt(year.endDate)}</p>}
        <p className="text-xs text-gray-400 ml-auto">{t('Read-only. Changes are made by the Principal.')}</p>
      </div>

      {isLoading && <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">{t('Loading...')}</div>}

      {terms.map(term => {
        const seqs = (year?.examSequences ?? []).filter(s => s.termId === term.id).sort((a, b) => a.sequenceNumber - b.sequenceNumber);
        return (
          <div key={term.id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b flex flex-wrap justify-between gap-2">
              <h3 className="font-semibold text-gray-900">{term.name}{term.isHoliday ? ` · ${t('Holiday')}` : ''}</h3>
              <span className="text-sm text-gray-500">{fmt(term.startDate)} – {fmt(term.endDate)}</span>
            </div>
            {seqs.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-500">{t('No sequences in this term.')}</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">{t('Sequence')}</th>
                    <th className="px-4 py-2 text-left">{t('Status')}</th>
                    <th className="px-4 py-2 text-left">{t('Submission deadline')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {seqs.map(s => (
                    <tr key={s.id}>
                      <td className="px-4 py-2 font-medium">{t('Sequence')} {s.sequenceNumber}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[s.status ?? ''] ?? 'bg-gray-100 text-gray-700'}`}>
                          {s.status ? t(enumLabel(s.status)) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{fmt(s.submissionDeadline)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
