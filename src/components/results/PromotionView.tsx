'use client';

// End-of-year promotion for one class at a time: annual averages (same
// numbers as the annual report card), a suggested decision per student, bulk
// "apply to all", and one Save that creates next year's enrolments.
//   GET  /results/promotion-preview
//   POST /students/promote

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import apiService from '@/lib/apiService';
import { sortSubClassesByLevel } from '@/lib/classOrdering';
import { useLanguage } from '@/components/context/LanguageContext';
import { FILTER_KEYS, useRememberedFilter } from '@/hooks/useRememberedFilter';

type Action = 'PROMOTE' | 'REPEAT' | 'GRADUATE' | 'DISMISS' | '';

interface PreviewStudent {
  studentId: number;
  name: string;
  matricule: string;
  annualAverage: number | null;
  rankLabel: string;
  termAverages: { termId: number; termName: string; average: number | null }[];
  suggestedDecision: 'PROMOTE' | 'REPEAT' | 'GRADUATE' | 'NEEDS_DECISION' | 'NO_AVERAGE';
  suggestedTargetClassId: number | null;
  alreadyEnrolledNextYear: boolean;
}

interface Preview {
  subClass: { id: number; name: string; classId: number; className: string; passMark: number };
  nextClass: { id: number; name: string } | null;
  passMark: number;
  students: PreviewStudent[];
}

interface Row { action: Action; targetClassId: number | '' }

const f2 = (v: number | null) => (v === null ? 'NC' : v.toFixed(2));

export default function PromotionView() {
  const { t } = useLanguage();
  const fetcher = (url: string) => apiService.get(url);
  const { data: yearsRes } = useSWR<{ data: { id: number; name: string; isCurrent?: boolean; startDate?: string }[] }>('/academic-years', fetcher);
  const { data: subClassesRes } = useSWR<{ data: { id: number; name: string; class?: { id: number; name: string } }[] }>('/classes/sub-classes?limit=200', fetcher);
  const { data: classesRes } = useSWR<{ data: { id: number; name: string }[] }>('/classes?limit=100', fetcher);

  const years = useMemo(
    () => [...(yearsRes?.data ?? [])].sort((a, b) => (a.startDate ? Date.parse(a.startDate) : 0) - (b.startDate ? Date.parse(b.startDate) : 0)),
    [yearsRes]
  );
  const subClasses = sortSubClassesByLevel(subClassesRes?.data ?? []);
  const classes = classesRes?.data ?? [];

  const [fromYearId, setFromYearId] = useState<number | ''>('');
  const [toYearId, setToYearId] = useState<number | ''>('');
  // Class is remembered per user (shared with the results pages).
  const [subClassId, setSubClassId] = useRememberedFilter<number>(FILTER_KEYS.subClass, subClasses.map(sc => sc.id));
  const [rows, setRows] = useState<Record<number, Row>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (fromYearId === '' && years.length) {
      const current = years.find(y => y.isCurrent) ?? years[years.length - 1];
      setFromYearId(current.id);
      const next = years.find(y => (y.startDate && current.startDate) ? Date.parse(y.startDate) > Date.parse(current.startDate) : false);
      if (next) setToYearId(next.id);
    }
  }, [years, fromYearId]);

  const previewUrl = fromYearId && subClassId
    ? `/results/promotion-preview?subClassId=${subClassId}&academicYearId=${fromYearId}${toYearId ? `&toAcademicYearId=${toYearId}` : ''}`
    : null;
  const { data: previewRes, isLoading, mutate } = useSWR<{ data: Preview }>(previewUrl, fetcher);
  const preview = previewRes?.data;

  // Prefill each row with the suggestion whenever a new preview loads.
  useEffect(() => {
    if (!preview) return;
    const next: Record<number, Row> = {};
    for (const s of preview.students) {
      const action: Action =
        s.suggestedDecision === 'PROMOTE' ? 'PROMOTE'
          : s.suggestedDecision === 'REPEAT' ? 'REPEAT'
            : s.suggestedDecision === 'GRADUATE' ? 'GRADUATE'
              : s.suggestedDecision === 'NEEDS_DECISION' ? 'PROMOTE'
                : '';
      next[s.studentId] = { action, targetClassId: s.suggestedTargetClassId ?? '' };
    }
    setRows(next);
  }, [preview]);

  const targetFor = (s: PreviewStudent, row: Row): number | '' => {
    if (row.action === 'REPEAT') return preview?.subClass.classId ?? '';
    if (row.action === 'PROMOTE') return row.targetClassId || preview?.nextClass?.id || '';
    return '';
  };

  const setAll = (action: Action) => {
    if (!preview) return;
    setRows(prev => {
      const next = { ...prev };
      for (const s of preview.students) {
        if (s.alreadyEnrolledNextYear) continue;
        next[s.studentId] = { ...next[s.studentId], action };
      }
      return next;
    });
  };

  const applySuggestions = () => setRows(prev => {
    if (!preview) return prev;
    const next = { ...prev };
    for (const s of preview.students) {
      if (s.alreadyEnrolledNextYear) continue;
      next[s.studentId] = {
        action: s.suggestedDecision === 'NO_AVERAGE' ? '' : s.suggestedDecision === 'NEEDS_DECISION' ? 'PROMOTE' : s.suggestedDecision,
        targetClassId: s.suggestedTargetClassId ?? '',
      };
    }
    return next;
  });

  const pending = (preview?.students ?? []).filter(s => !s.alreadyEnrolledNextYear && rows[s.studentId]?.action);
  const missingTarget = pending.filter(s => {
    const r = rows[s.studentId];
    return (r.action === 'PROMOTE' || r.action === 'REPEAT') && !targetFor(s, r);
  });

  const save = async () => {
    if (!toYearId) { toast.error(t('Choose the academic year to enrol students into')); return; }
    if (missingTarget.length) { toast.error(t('Choose the next class for every promoted student')); return; }
    if (!pending.length) { toast(t('Nothing to save')); return; }
    if (!window.confirm(`${t('Apply decisions for')} ${pending.length} ${t('students')}?`)) return;
    setSaving(true);
    try {
      const res = await apiService.post('/students/promote', {
        fromAcademicYearId: fromYearId,
        toAcademicYearId: toYearId,
        promotions: pending.map(s => {
          const r = rows[s.studentId];
          const target = targetFor(s, r);
          return { studentId: s.studentId, action: r.action, targetClassId: target === '' ? null : target };
        }),
      });
      const d = res?.data;
      if (d?.failed) {
        const firstError = d.results?.find((x: { success: boolean; error?: string }) => !x.success)?.error;
        toast.error(`${d.successful} ${t('saved')}, ${d.failed} ${t('failed')}${firstError ? `: ${firstError}` : ''}`);
      } else {
        toast.success(`${d?.successful ?? pending.length} ${t('decisions applied')}`);
      }
      mutate();
    } catch (e) {
      toast.error((e as Error)?.message || t('Failed to apply decisions'));
    } finally {
      setSaving(false);
    }
  };

  const otherYears = years.filter(y => y.id !== fromYearId);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-sm">
          <span className="block font-medium text-gray-700 mb-1">{t('From academic year')}</span>
          <select className="w-full rounded-md border-gray-300 text-sm" value={fromYearId} onChange={e => setFromYearId(Number(e.target.value) || '')}>
            {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="block font-medium text-gray-700 mb-1">{t('Enrol into academic year')}</span>
          <select className="w-full rounded-md border-gray-300 text-sm" value={toYearId} onChange={e => setToYearId(Number(e.target.value) || '')}>
            <option value="">{otherYears.length ? t('Select') : t('Create next academic year first')}</option>
            {otherYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="block font-medium text-gray-700 mb-1">{t('Class')}</span>
          <select className="w-full rounded-md border-gray-300 text-sm" value={subClassId} onChange={e => setSubClassId(Number(e.target.value) || '')}>
            <option value="">{t('Select')}</option>
            {subClasses.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
          </select>
        </label>
      </div>

      {!previewUrl && <div className="bg-white rounded-lg shadow p-10 text-center text-sm text-gray-500">{t('Choose a class.')}</div>}
      {previewUrl && isLoading && <div className="bg-white rounded-lg shadow p-10 text-center text-sm text-gray-500">{t('Loading...')}</div>}

      {preview && !isLoading && (
        <>
          <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-700 mr-auto">
              {preview.subClass.name}: {t('pass mark')} {preview.passMark}/20 · {t('next class')}: {preview.nextClass?.name ?? t('none (final year or choose per student)')}
            </span>
            <button onClick={applySuggestions} className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50">{t('Apply suggestions')}</button>
            <button onClick={() => setAll('PROMOTE')} className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50">{t('All promote')}</button>
            <button onClick={() => setAll('REPEAT')} className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50">{t('All repeat')}</button>
            <button
              onClick={save}
              disabled={saving || !toYearId || pending.length === 0}
              className="px-4 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
              {saving ? t('Saving...') : `${t('Save decisions')} (${pending.length})`}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">{t('Rank')}</th>
                  <th className="px-3 py-2 text-left">{t('Student')}</th>
                  {(preview.students[0]?.termAverages ?? []).map(tm => <th key={tm.termId} className="px-3 py-2 text-center">{tm.termName}</th>)}
                  <th className="px-3 py-2 text-center">{t('Annual')}</th>
                  <th className="px-3 py-2 text-left">{t('Decision')}</th>
                  <th className="px-3 py-2 text-left">{t('Next year class')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.students.map(s => {
                  const row = rows[s.studentId] ?? { action: '', targetClassId: '' };
                  const locked = s.alreadyEnrolledNextYear;
                  return (
                    <tr key={s.studentId} className={locked ? 'bg-gray-50 text-gray-400' : ''}>
                      <td className="px-3 py-2">{s.rankLabel}</td>
                      <td className="px-3 py-2"><div className="font-medium">{s.name}</div><div className="text-xs text-gray-400">{s.matricule}</div></td>
                      {s.termAverages.map(tm => <td key={tm.termId} className="px-3 py-2 text-center">{f2(tm.average)}</td>)}
                      <td className={`px-3 py-2 text-center font-semibold ${s.annualAverage !== null && s.annualAverage < preview.passMark ? 'text-red-600' : ''}`}>{f2(s.annualAverage)}</td>
                      <td className="px-3 py-2">
                        {locked ? <span className="text-xs">{t('Already enrolled next year')}</span> : (
                          <select className="rounded-md border-gray-300 text-sm" value={row.action}
                            onChange={e => setRows(prev => ({ ...prev, [s.studentId]: { ...row, action: e.target.value as Action } }))}>
                            <option value="">{t('— no decision —')}</option>
                            <option value="PROMOTE">{t('Promote')}</option>
                            <option value="REPEAT">{t('Repeat')}</option>
                            <option value="GRADUATE">{t('Graduate')}</option>
                            <option value="DISMISS">{t('Dismiss (not re-enrolled)')}</option>
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {!locked && row.action === 'PROMOTE' && (
                          <select className="rounded-md border-gray-300 text-sm" value={row.targetClassId || preview.nextClass?.id || ''}
                            onChange={e => setRows(prev => ({ ...prev, [s.studentId]: { ...row, targetClassId: Number(e.target.value) || '' } }))}>
                            <option value="">{t('Choose class')}</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        )}
                        {!locked && row.action === 'REPEAT' && <span className="text-sm">{preview.subClass.className}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">
            {t('Promoted and repeating students get an enrolment (class only) in the target year; assign their subclass there as usual. Graduate marks the student as graduated. Dismiss creates no enrolment.')}
          </p>
        </>
      )}
    </div>
  );
}
