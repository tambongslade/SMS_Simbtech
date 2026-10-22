'use client';

// Ranked class results for a sequence, a term or the whole year, with subject
// averages, class statistics, CSV (Excel) export and term/annual report card
// downloads. Numbers come from GET /results/class — the same calculation the
// report card PDFs use.

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import apiService from '@/lib/apiService';
import { saveFile } from '@/lib/download';
import { sortSubClassesByLevel } from '@/lib/classOrdering';
import { useLanguage } from '@/components/context/LanguageContext';
import { FILTER_KEYS, useAcademicYearFilter, useRememberedFilter } from '@/hooks/useRememberedFilter';

type Scope = 'sequence' | 'term' | 'annual';

interface YearOption {
  id: number;
  name: string;
  isCurrent?: boolean;
  terms?: { id: number; name: string; startDate?: string | null; isHoliday?: boolean }[];
  examSequences?: { id: number; sequenceNumber: number; termId: number; status?: string }[];
}

interface SubClassOption {
  id: number;
  name: string;
  class?: { id: number; name: string };
}

interface ResultsSubject {
  subClassSubjectId: number;
  subjectId: number;
  name: string;
  category: string;
  coefficient: number;
  teacherName: string | null;
}

interface StudentResult {
  enrollmentId: number;
  studentId: number;
  name: string;
  matricule: string;
  subjects: { subClassSubjectId: number; score: number | null; rank: number | null }[];
  totalCoefficient: number;
  average: number | null;
  subjectsWithMarks: number;
  rank: number | null;
  termAverages?: { termId: number; termName: string; average: number | null; rank: number | null }[];
}

interface SubjectStats {
  subClassSubjectId: number;
  markedCount: number;
  min: number | null;
  max: number | null;
  average: number | null;
  successRate: number | null;
}

interface ClassResults {
  scope: { kind: string; label: string; academicYearName: string };
  subClass: { id: number; name: string; className: string; classMasterName: string | null };
  subjects: ResultsSubject[];
  students: StudentResult[];
  subjectStats: SubjectStats[];
  classStats: {
    enrolled: number;
    ranked: number;
    classAverage: number | null;
    highest: number | null;
    lowest: number | null;
    successRate: number | null;
    passed: number;
  };
  totalMarks: number;
}

const f2 = (v: number | null | undefined) => (v === null || v === undefined ? 'NC' : v.toFixed(2));
const ordinal = (n: number | null, lang: 'en' | 'fr' = 'en') => {
  if (n === null) return 'NC';
  if (lang === 'fr') return n === 1 ? '1er' : `${n}e`;
  const m = n % 100;
  if (m >= 11 && m <= 13) return `${n}th`;
  const suffix = ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
};

export default function ClassResultsView({ allowReportCards = true }: { allowReportCards?: boolean }) {
  const { t, language } = useLanguage();
  const [scope, setScope] = useState<Scope>('sequence');
  const [busy, setBusy] = useState<string | null>(null);

  const fetcher = (url: string) => apiService.get(url);
  const { data: yearsRes } = useSWR<{ data: YearOption[] }>('/academic-years', fetcher);
  const { data: subClassesRes } = useSWR<{ data: SubClassOption[] }>('/classes/sub-classes?limit=200', fetcher);

  const years = useMemo(() => yearsRes?.data ?? [], [yearsRes]);
  const subClasses = sortSubClassesByLevel(subClassesRes?.data ?? []);
  // Year / class / sequence / term are remembered per user across pages.
  const [yearId, setYearId] = useAcademicYearFilter(years);
  const [subClassId, setSubClassId] = useRememberedFilter<number>(FILTER_KEYS.subClass, subClasses.map(sc => sc.id));
  const year = years.find(y => y.id === yearId);
  const terms = useMemo(
    () => [...(year?.terms ?? [])]
      .filter(tm => !tm.isHoliday)
      .sort((a, b) => (a.startDate ? Date.parse(a.startDate) : Infinity) - (b.startDate ? Date.parse(b.startDate) : Infinity) || a.id - b.id),
    [year]
  );
  const sequences = useMemo(
    () => [...(year?.examSequences ?? [])].sort((a, b) => a.sequenceNumber - b.sequenceNumber),
    [year]
  );
  const [sequenceId, setSequenceId] = useRememberedFilter<number>(FILTER_KEYS.sequence, sequences.map(s => s.id));
  const [termId, setTermId] = useRememberedFilter<number>(FILTER_KEYS.term, terms.map(tm => tm.id));
  const termName = (id: number) => terms.find(tm => tm.id === id)?.name ?? '';

  const query = useMemo(() => {
    if (!subClassId || !yearId) return null;
    const p = new URLSearchParams({ subClassId: String(subClassId) });
    if (scope === 'sequence') {
      if (!sequenceId) return null;
      p.set('examSequenceId', String(sequenceId));
    } else if (scope === 'term') {
      if (!termId) return null;
      p.set('termId', String(termId));
    } else {
      p.set('academicYearId', String(yearId));
      p.set('scope', 'annual');
    }
    return p.toString();
  }, [subClassId, yearId, scope, sequenceId, termId]);

  const { data: resultsRes, isLoading, error } = useSWR<{ data: ClassResults }>(
    query ? `/results/class?${query}` : null,
    (url: string) => apiService.get(url, { silent: true })
  );
  const r = resultsRes?.data;
  const stats = new Map((r?.subjectStats ?? []).map(s => [s.subClassSubjectId, s]));
  const termCols = r?.scope.kind === 'ANNUAL' ? (r.students[0]?.termAverages ?? []).map(tm => tm.termName) : [];

  const download = async (url: string, filename: string, label: string) => {
    setBusy(label);
    try {
      const blob = await apiService.get(url, {}, 'blob');
      await saveFile(blob as Blob, filename);
    } catch (e) {
      toast.error((e as Error)?.message || t('Download failed'));
    } finally {
      setBusy(null);
    }
  };

  const safe = (s: string) => s.replace(/[^\w-]+/g, '_');

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="text-sm">
          <span className="block font-medium text-gray-700 mb-1">{t('Academic Year')}</span>
          <select className="w-full rounded-md border-gray-300 text-sm" value={yearId}
            onChange={e => { setYearId(Number(e.target.value) || ''); setSequenceId(''); setTermId(''); }}>
            <option value="">{t('Select')}</option>
            {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="block font-medium text-gray-700 mb-1">{t('Class')}</span>
          <select className="w-full rounded-md border-gray-300 text-sm" value={subClassId}
            onChange={e => setSubClassId(Number(e.target.value) || '')}>
            <option value="">{t('Select')}</option>
            {subClasses.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="block font-medium text-gray-700 mb-1">{t('Period')}</span>
          <select className="w-full rounded-md border-gray-300 text-sm" value={scope}
            onChange={e => setScope(e.target.value as Scope)}>
            <option value="sequence">{t('Sequence')}</option>
            <option value="term">{t('Term')}</option>
            <option value="annual">{t('Whole year (annual)')}</option>
          </select>
        </label>
        {scope === 'sequence' && (
          <label className="text-sm">
            <span className="block font-medium text-gray-700 mb-1">{t('Sequence')}</span>
            <select className="w-full rounded-md border-gray-300 text-sm" value={sequenceId}
              onChange={e => setSequenceId(Number(e.target.value) || '')}>
              <option value="">{t('Select')}</option>
              {sequences.map(s => (
                <option key={s.id} value={s.id}>{t('Sequence')} {s.sequenceNumber}{termName(s.termId) ? ` (${termName(s.termId)})` : ''}</option>
              ))}
            </select>
          </label>
        )}
        {scope === 'term' && (
          <label className="text-sm">
            <span className="block font-medium text-gray-700 mb-1">{t('Term')}</span>
            <select className="w-full rounded-md border-gray-300 text-sm" value={termId}
              onChange={e => setTermId(Number(e.target.value) || '')}>
              <option value="">{t('Select')}</option>
              {terms.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
            </select>
          </label>
        )}
      </div>

      {!query && (
        <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500 text-sm">
          {t('Choose a class and a period to see the results.')}
        </div>
      )}
      {query && isLoading && (
        <div className="bg-white rounded-lg shadow p-10 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </div>
      )}
      {query && error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error.message}</div>
      )}

      {r && !isLoading && (
        <>
          <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{r.subClass.name} · {r.scope.label} · {r.scope.academicYearName}</h2>
              <p className="text-xs text-gray-500">
                {t('Class master')}: {r.subClass.classMasterName || t('not set')} · {r.classStats.ranked}/{r.classStats.enrolled} {t('students ranked')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => download(`/results/class/export?${query}`, `results_${safe(r.subClass.name)}_${safe(r.scope.label)}.csv`, 'csv')}
                disabled={!!busy}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50">
                <ArrowDownTrayIcon className="w-4 h-4" />{busy === 'csv' ? t('Exporting...') : t('Export to Excel (CSV)')}
              </button>
              {allowReportCards && scope !== 'sequence' && (
                <button
                  onClick={() => download(
                    scope === 'term'
                      ? `/report-cards/term/subclass/${subClassId}?termId=${termId}`
                      : `/report-cards/annual/subclass/${subClassId}?academicYearId=${yearId}`,
                    `report-cards_${safe(r.subClass.name)}_${safe(r.scope.label)}.pdf`, 'pdf')}
                  disabled={!!busy || r.totalMarks === 0}
                  title={r.totalMarks === 0 ? t('No marks entered yet') : ''}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                  <DocumentTextIcon className="w-4 h-4" />{busy === 'pdf' ? t('Generating...') : (scope === 'term' ? t('Term report cards (PDF)') : t('Annual report cards (PDF)'))}
                </button>
              )}
            </div>
          </div>

          {r.totalMarks === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 text-sm">
              {t('No marks have been entered for this class and period yet. Nobody is ranked and report cards cannot be generated.')}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              [t('Class average'), f2(r.classStats.classAverage)],
              [t('Highest'), f2(r.classStats.highest)],
              [t('Lowest'), f2(r.classStats.lowest)],
              [t('Success rate'), r.classStats.successRate === null ? 'NC' : `${r.classStats.successRate.toFixed(1)}%`],
              [t('Passed'), `${r.classStats.passed} / ${r.classStats.ranked}`],
            ].map(([label, value]) => (
              <div key={label} className="bg-white rounded-lg shadow p-3">
                <p className="text-xs text-gray-500 uppercase">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left sticky left-0 bg-gray-50">{t('Rank')}</th>
                  <th className="px-2 py-2 text-left sticky left-10 bg-gray-50 min-w-[180px]">{t('Student')}</th>
                  {r.subjects.map(s => (
                    <th key={s.subClassSubjectId} className="px-2 py-2 text-center whitespace-nowrap" title={s.teacherName ?? ''}>
                      {s.name}<div className="font-normal text-gray-400">coef {s.coefficient}</div>
                    </th>
                  ))}
                  {termCols.map(c => <th key={c} className="px-2 py-2 text-center whitespace-nowrap">{c}</th>)}
                  <th className="px-2 py-2 text-center">{t('Average')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {r.students.map(s => (
                  <tr key={s.enrollmentId} className={s.rank === null ? 'text-gray-400' : ''}>
                    <td className="px-2 py-1.5 font-semibold sticky left-0 bg-white">{ordinal(s.rank, language)}</td>
                    <td className="px-2 py-1.5 sticky left-10 bg-white">
                      <div className="font-medium text-gray-900">{s.name}</div>
                      <div className="text-gray-400">{s.matricule}</div>
                    </td>
                    {s.subjects.map(x => (
                      <td key={x.subClassSubjectId}
                        className={`px-2 py-1.5 text-center ${x.score === null ? 'text-gray-300' : x.score < 10 ? 'text-red-600' : ''}`}>
                        {f2(x.score)}
                      </td>
                    ))}
                    {(s.termAverages ?? []).map(tm => <td key={tm.termId} className="px-2 py-1.5 text-center">{f2(tm.average)}</td>)}
                    <td className={`px-2 py-1.5 text-center font-bold ${s.average !== null && s.average < 10 ? 'text-red-600' : ''}`}>{f2(s.average)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td className="px-2 py-1.5 sticky left-0 bg-gray-50" />
                  <td className="px-2 py-1.5 sticky left-10 bg-gray-50">{t('Subject average')}</td>
                  {r.subjects.map(s => <td key={s.subClassSubjectId} className="px-2 py-1.5 text-center">{f2(stats.get(s.subClassSubjectId)?.average)}</td>)}
                  {termCols.map(c => <td key={c} />)}
                  <td className="px-2 py-1.5 text-center">{f2(r.classStats.classAverage)}</td>
                </tr>
                <tr className="font-normal text-gray-600">
                  <td className="px-2 py-1.5 sticky left-0 bg-gray-50" />
                  <td className="px-2 py-1.5 sticky left-10 bg-gray-50">{t('Success rate')}</td>
                  {r.subjects.map(s => {
                    const sr = stats.get(s.subClassSubjectId)?.successRate;
                    return <td key={s.subClassSubjectId} className="px-2 py-1.5 text-center">{sr === null || sr === undefined ? 'NC' : `${sr.toFixed(0)}%`}</td>;
                  })}
                  {termCols.map(c => <td key={c} />)}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-gray-500">{t('NC = no mark. Subjects without a mark are left out of the average; students without any mark are not ranked.')}</p>
        </>
      )}
    </div>
  );
}
