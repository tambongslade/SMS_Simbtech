'use client';

// The class mark sheet: every student's mark in every subject, the average of each
// subject category, the general average and rank, and the class statistics for a
// sequence, a term or the whole year. Numbers come from GET /results/class/marksheet,
// the same calculation as the Results screen and the report cards; the PDF is the
// printable landscape version of the same sheet.

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import apiService from '@/lib/apiService';
import { saveFile } from '@/lib/download';
import { sortSubClassesByLevel } from '@/lib/classOrdering';
import { useLanguage } from '@/components/context/LanguageContext';
import { FILTER_KEYS, useAcademicYearFilter, useRememberedFilter } from '@/hooks/useRememberedFilter';

type Scope = 'sequence' | 'term' | 'annual';

interface YearOption {
  id: number;
  name: string;
  terms?: { id: number; name: string; startDate?: string | null; isHoliday?: boolean }[];
  examSequences?: { id: number; sequenceNumber: number; termId: number }[];
}

interface SubClassOption {
  id: number;
  name: string;
}

interface Marksheet {
  title: string;
  period: string;
  className: string;
  classMaster: string | null;
  passMark: number;
  subjects: { id: number; name: string; coefficient: number; category: string }[];
  categories: { key: string; label: string }[];
  students: {
    rank: number | null;
    name: string;
    matricule: string;
    gender: string;
    repeater: boolean;
    scores: (number | null)[];
    categoryAverages: (number | null)[];
    average: number | null;
  }[];
  stats: {
    enrolled: number;
    ranked: number;
    rankedFemales: number;
    rankedMales: number;
    succeeded: number;
    succeededFemales: number;
    succeededMales: number;
    successRate: number | null;
    femalesSuccessRate: number | null;
    malesSuccessRate: number | null;
    rankedRepeaters: number;
    succeededRepeaters: number;
    repeatersSuccessRate: number | null;
    classAverage: number | null;
    standardDeviation: number | null;
    bestAverage: number | null;
    lastAverage: number | null;
  };
  subjectAverages: (number | null)[];
}

const f2 = (v: number | null | undefined) => (v === null || v === undefined ? '-' : v.toFixed(2));
const pct = (v: number | null | undefined) => (v === null || v === undefined ? 'n/a' : `${v.toFixed(0)}%`);

export default function ClassMarksheetView() {
  const { t } = useLanguage();
  const [scope, setScope] = useState<Scope>('sequence');
  const [busy, setBusy] = useState(false);

  const fetcher = (url: string) => apiService.get(url);
  const { data: yearsRes } = useSWR<{ data: YearOption[] }>('/academic-years', fetcher);
  const { data: subClassesRes } = useSWR<{ data: SubClassOption[] }>('/classes/sub-classes?limit=200', fetcher);

  const years = useMemo(() => yearsRes?.data ?? [], [yearsRes]);
  const subClasses = sortSubClassesByLevel(subClassesRes?.data ?? []);
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

  const { data: res, isLoading, error } = useSWR<{ data: Marksheet }>(
    query ? `/results/class/marksheet?${query}` : null,
    (url: string) => apiService.get(url, { silent: true })
  );
  const sheet = res?.data;

  const downloadPdf = async () => {
    if (!sheet || !query) return;
    setBusy(true);
    try {
      const blob = await apiService.get(`/results/class/marksheet/pdf?${query}`, {}, 'blob');
      await saveFile(blob as Blob, `class-marksheet_${sheet.className}_${sheet.period}`.replace(/[^\w-]+/g, '_') + '.pdf');
    } catch (e) {
      toast.error((e as Error)?.message || t('Download failed'));
    } finally {
      setBusy(false);
    }
  };

  const low = (v: number | null) => v !== null && sheet !== undefined && v < sheet.passMark;

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
          {t('Choose a class and a period to see the mark sheet.')}
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

      {sheet && !isLoading && (
        <>
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">{sheet.title} · {sheet.className}</h2>
                <p className="text-sm text-gray-500">
                  {sheet.period}{sheet.classMaster ? ` · ${t('Class Master')}: ${sheet.classMaster}` : ''}
                </p>
              </div>
              <button
                onClick={downloadPdf}
                disabled={busy || sheet.students.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />{busy ? t('Generating...') : t('Download PDF')}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
              <div className="space-y-0.5">
                <div>{t('Enrolled learners')}: <strong>{sheet.stats.enrolled}</strong></div>
                <div>{t('Ranked learners')}: <strong>{sheet.stats.ranked}</strong></div>
                <div>{t('Ranked females')}: <strong>{sheet.stats.rankedFemales}</strong> · {t('Ranked males')}: <strong>{sheet.stats.rankedMales}</strong></div>
                <div>{t('Ranked repeaters')}: <strong>{sheet.stats.rankedRepeaters}</strong></div>
              </div>
              <div className="space-y-0.5">
                <div>{t('Overall average')}: <strong>{f2(sheet.stats.classAverage)}</strong></div>
                <div>{t('Standard deviation')}: <strong>{f2(sheet.stats.standardDeviation)}</strong></div>
                <div>{t("Best student's average")}: <strong>{f2(sheet.stats.bestAverage)}</strong></div>
                <div>{t("Last student's average")}: <strong>{f2(sheet.stats.lastAverage)}</strong></div>
              </div>
              <div className="space-y-0.5">
                <div>{t('Succeeded')} (≥ {sheet.passMark}): <strong>{sheet.stats.succeeded}</strong> · {t('Success rate')}: <strong>{pct(sheet.stats.successRate)}</strong></div>
                <div>{t('Females')}: <strong>{sheet.stats.succeededFemales}</strong> ({pct(sheet.stats.femalesSuccessRate)}) · {t('Males')}: <strong>{sheet.stats.succeededMales}</strong> ({pct(sheet.stats.malesSuccessRate)})</div>
                <div>{t('Repeaters who succeeded')}: <strong>{sheet.stats.succeededRepeaters}</strong> ({pct(sheet.stats.repeatersSuccessRate)})</div>
              </div>
            </div>
          </div>

          {sheet.students.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500 text-sm">{t('No students are enrolled in this class.')}</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="px-2 py-2 text-left sticky left-0 bg-gray-100 z-10">{t('Rank')}</th>
                    <th className="px-2 py-2 text-left sticky left-9 bg-gray-100 z-10 min-w-[170px]">{t('Student')}</th>
                    {sheet.subjects.map(s => (
                      <th key={s.id} className="px-1.5 py-2 text-center align-bottom min-w-[56px]">
                        <div>{s.name}</div>
                        <div className="font-normal text-gray-500">×{s.coefficient}</div>
                      </th>
                    ))}
                    {sheet.categories.map(c => (
                      <th key={c.key} className="px-1.5 py-2 text-center align-bottom bg-indigo-50 min-w-[64px]">{t('Avg')}: {c.label}</th>
                    ))}
                    <th className="px-2 py-2 text-center align-bottom">{t('General average')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.students.map((st, i) => (
                    <tr key={st.matricule || i} className={i % 2 ? 'bg-gray-50' : 'bg-white'}>
                      <td className={`px-2 py-1.5 sticky left-0 ${i % 2 ? 'bg-gray-50' : 'bg-white'}`}>{st.rank ?? '-'}</td>
                      <td className={`px-2 py-1.5 sticky left-9 whitespace-nowrap ${i % 2 ? 'bg-gray-50' : 'bg-white'}`}>
                        {st.name}{st.repeater ? ' (R)' : ''}
                      </td>
                      {st.scores.map((v, j) => (
                        <td key={j} className={`px-1.5 py-1.5 text-center ${low(v) ? 'text-red-600' : ''}`}>{f2(v)}</td>
                      ))}
                      {st.categoryAverages.map((v, j) => (
                        <td key={j} className={`px-1.5 py-1.5 text-center bg-indigo-50/60 ${low(v) ? 'text-red-600' : ''}`}>{f2(v)}</td>
                      ))}
                      <td className={`px-2 py-1.5 text-center font-semibold ${low(st.average) ? 'text-red-600' : ''}`}>{f2(st.average)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-semibold">
                    <td className="px-2 py-1.5 sticky left-0 bg-gray-100" />
                    <td className="px-2 py-1.5 sticky left-9 bg-gray-100">{t('Class average')}</td>
                    {sheet.subjectAverages.map((v, j) => <td key={j} className="px-1.5 py-1.5 text-center">{f2(v)}</td>)}
                    {sheet.categories.map(c => <td key={c.key} />)}
                    <td className="px-2 py-1.5 text-center">{f2(sheet.stats.classAverage)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="px-3 py-2 text-[11px] text-gray-500">
                {t('"-" = no mark entered (not counted in the average). (R) = repeater. Marks below the pass mark are in red.')}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
