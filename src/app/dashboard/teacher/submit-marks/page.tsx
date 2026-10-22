'use client'
import { useState, useEffect, useCallback, useMemo } from 'react';
import { FILTER_KEYS, useAcademicYearFilter, useRememberedFilter } from '@/hooks/useRememberedFilter';
import { ExclamationCircleIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import apiService from '@/lib/apiService';
import { sortSubClassesByLevel } from '@/lib/classOrdering';
import { useLanguage } from '@/components/context/LanguageContext';

// Types
interface Subject {
  id: number;
  name: string;
  subClasses?: { id: number }[];
}

interface ExamSequence {
  id: number;
  name: string;
  sequenceNumber: number;
  status: string;
  term?: { id: number; name: string } | null;
  academicYear?: { id: number; name: string } | null;
}

interface AcademicYear {
  id: number;
  name: string;
  isCurrent?: boolean;
}

interface SubClass {
  id: number;
  name: string;
  class: { id: number; name: string };
}

// GET /marks/entry-sheet
interface EntrySheetStudent {
  studentId: number;
  enrollmentId: number;
  name: string;
  matricule: string | null;
  markId: number | null;
  score: number | null;
  updatedAt: string | null;
}

interface EntrySheet {
  examSequence: {
    id: number;
    sequenceNumber: number;
    termName: string | null;
    status: string;
    submissionDeadline: string | null;
    isOpen: boolean;
    closedReason: string | null;
  };
  minScore: number;
  maxScore: number;
  totalStudents: number;
  markedCount: number;
  students: EntrySheetStudent[];
}

interface Row {
  studentId: number;
  name: string;
  matricule: string | null;
  savedScore: number | null; // what the server has
  input: string; // what is in the box
}

const MIN_SCORE = 0;
const MAX_SCORE = 20;

type RowState = 'invalid' | 'unsaved' | 'saved' | 'pending';

// Returns an error message for the typed value, or null when it is acceptable.
function validateInput(value: string): string | null {
  const v = value.trim();
  if (v === '') return null;
  const n = Number(v.replace(',', '.'));
  if (!Number.isFinite(n)) return 'Not a number';
  if (n < MIN_SCORE || n > MAX_SCORE) return `Mark must be between ${MIN_SCORE} and ${MAX_SCORE}`;
  return null;
}

function parseInput(value: string): number | null {
  const v = value.trim();
  return v === '' ? null : Number(v.replace(',', '.'));
}

function rowState(row: Row): RowState {
  if (validateInput(row.input)) return 'invalid';
  if (parseInput(row.input) !== row.savedScore) return 'unsaved';
  return row.savedScore !== null ? 'saved' : 'pending';
}

function sheetToRows(sheet: EntrySheet): Row[] {
  return (sheet.students ?? []).map(s => ({
    studentId: s.studentId,
    name: s.name,
    matricule: s.matricule,
    savedScore: s.score ?? null,
    input: s.score === null || s.score === undefined ? '' : String(s.score),
  }));
}

export default function SubmitMarks() {
  const { t } = useLanguage();
  const [sheet, setSheet] = useState<EntrySheet | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetcher = (url: string) => apiService.get(url);

  // Year / sequence / subclass / subject are remembered per user, so the
  // teacher lands on the same selection next time (year defaults to current).
  const { data: academicYearsData, isLoading: academicYearsLoading } =
    useSWR<{ success: boolean; data: AcademicYear[] }>('/academic-years', fetcher);
  const academicYears = useMemo(() => academicYearsData?.data ?? [], [academicYearsData]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useAcademicYearFilter(academicYears);

  const { data: examSequencesData, isLoading: examSequencesLoading } =
    useSWR<{ success: boolean; data: ExamSequence[] }>(
      selectedAcademicYear ? `/exams?academicYearId=${selectedAcademicYear}&limit=50` : null,
      fetcher
    );
  const examSequences = useMemo(
    () => [...(examSequencesData?.data ?? [])].sort((a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0)),
    [examSequencesData]
  );
  const [selectedExamSequence, setSelectedExamSequence] =
    useRememberedFilter<number>(FILTER_KEYS.sequence, examSequences.map(s => s.id));

  const { data: subClassesData, isLoading: subClassesLoading } =
    useSWR<{ success: boolean; data: SubClass[] }>(
      selectedAcademicYear ? `/teachers/me/subclasses?academicYearId=${selectedAcademicYear}` : null,
      fetcher
    );
  const subClasses = sortSubClassesByLevel(subClassesData?.data ?? []);
  const [selectedSubClass, setSelectedSubClass] =
    useRememberedFilter<number>(FILTER_KEYS.subClass, subClasses.map(sc => sc.id));

  const { data: subjectsData, isLoading: subjectsLoading } =
    useSWR<{ success: boolean; data: Subject[] }>(
      selectedSubClass ? `/teachers/me/subjects?subClassId=${selectedSubClass}&academicYearId=${selectedAcademicYear}` : null,
      fetcher
    );
  // /teachers/me/subjects returns every subject the teacher has, each with the
  // subclasses it is taught in; keep only those taught in the chosen subclass.
  const subjects = useMemo(() => {
    const seen = new Map<number, Subject>();
    for (const s of subjectsData?.data ?? []) {
      const inSubClass = !s.subClasses || s.subClasses.some(sc => sc.id === selectedSubClass);
      if (inSubClass && !seen.has(s.id)) seen.set(s.id, { id: s.id, name: s.name });
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [subjectsData, selectedSubClass]);
  const [selectedSubject, setSelectedSubject] =
    useRememberedFilter<number>('subjectId', subjects.map(sj => sj.id));

  const unsavedCount = rows.filter(r => rowState(r) === 'unsaved').length;
  const invalidCount = rows.filter(r => rowState(r) === 'invalid').length;
  const hasPendingEdits = unsavedCount + invalidCount > 0;

  // Warn before leaving the page with unsaved marks.
  useEffect(() => {
    if (!hasPendingEdits) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasPendingEdits]);

  // Ask before a filter change throws typed marks away.
  const confirmDiscard = () =>
    !hasPendingEdits ||
    window.confirm(t('You have unsaved marks. Discard them and continue?'));

  const loadSheet = useCallback(async () => {
    if (!selectedExamSequence || !selectedSubClass || !selectedSubject) {
      setSheet(null);
      setRows([]);
      return;
    }
    setIsLoadingSheet(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        examSequenceId: String(selectedExamSequence),
        subClassId: String(selectedSubClass),
        subjectId: String(selectedSubject),
      });
      const res = await apiService.get(`/marks/entry-sheet?${params}`, { silent: true });
      const data: EntrySheet = res.data;
      setSheet(data);
      setRows(sheetToRows(data));
    } catch (error) {
      setSheet(null);
      setRows([]);
      setLoadError((error as Error)?.message || t('Failed to load students and marks'));
    } finally {
      setIsLoadingSheet(false);
    }
  }, [selectedExamSequence, selectedSubClass, selectedSubject, t]);

  useEffect(() => {
    loadSheet();
  }, [loadSheet]);

  const handleMarkChange = (studentId: number, value: string) => {
    setRows(prev => prev.map(r => (r.studentId === studentId ? { ...r, input: value } : r)));
  };

  const handleSave = async () => {
    if (invalidCount > 0) {
      toast.error(t(`Fix the marks shown in red first. Marks must be between ${MIN_SCORE} and ${MAX_SCORE}.`));
      return;
    }
    const changed = rows.filter(r => rowState(r) === 'unsaved');
    if (changed.length === 0) {
      toast(t('No changes to save'));
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiService.post('/marks/bulk', {
        examSequenceId: Number(selectedExamSequence),
        subClassId: Number(selectedSubClass),
        subjectId: Number(selectedSubject),
        marks: changed.map(r => ({ studentId: r.studentId, score: parseInput(r.input) })),
      }, { silent: true });
      const data: EntrySheet | undefined = res?.data?.sheet;
      if (data) {
        setSheet(data);
        // Keep anything typed after the save started; refresh everything else from the server.
        const server = new Map(sheetToRows(data).map(r => [r.studentId, r]));
        setRows(prev => prev.map(r => {
          const fresh = server.get(r.studentId);
          if (!fresh) return r;
          const wasSent = changed.some(c => c.studentId === r.studentId && c.input === r.input);
          return wasSent || rowState(r) !== 'unsaved' ? fresh : { ...fresh, input: r.input };
        }));
      } else {
        await loadSheet();
      }
      toast.success(`${t('Saved marks for')} ${changed.length} ${t('students')}`);
    } catch (error) {
      toast.error(`${t('Failed to save marks')}: ${(error as Error)?.message || t('Unknown error')}`);
    } finally {
      setIsSaving(false);
    }
  };

  const renderSelect = (
    label: string,
    value: number | '',
    onChange: (v: number | '') => void,
    options: { id: number; name: string }[],
    isLoading: boolean,
    disabled = false
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => {
          if (!confirmDiscard()) return;
          onChange(Number(e.target.value) || '');
        }}
        disabled={isLoading || disabled}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-100"
      >
        <option value="">{isLoading ? t('Loading...') : `${t('Select')} ${label}`}</option>
        {options.map(o => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    </div>
  );

  const isOpen = sheet?.examSequence?.isOpen ?? true;
  const savedCount = rows.filter(r => r.savedScore !== null).length;

  const statusBadge = (state: RowState) => {
    switch (state) {
      case 'invalid':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">{t('Invalid')}</span>;
      case 'unsaved':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">{t('Not saved')}</span>;
      case 'saved':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">{t('Saved')}</span>;
      default:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{t('Pending')}</span>;
    }
  };

  const markInput = (row: Row) => {
    const state = rowState(row);
    const error = validateInput(row.input);
    return (
      <div>
        <input
          type="text"
          inputMode="decimal"
          value={row.input}
          onChange={e => handleMarkChange(row.studentId, e.target.value)}
          aria-invalid={!!error}
          className={`w-24 p-1.5 border rounded text-sm ${state === 'invalid'
            ? 'border-red-500 ring-1 ring-red-300 bg-red-50'
            : state === 'unsaved'
              ? 'border-blue-500 ring-1 ring-blue-300 bg-blue-50'
              : 'border-gray-300'
            } focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed`}
          disabled={isSaving || !isOpen}
          placeholder={`${MIN_SCORE}-${MAX_SCORE}`}
        />
        {error && <p className="mt-1 text-xs text-red-600">{t(error)}</p>}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">{t('Submit Marks')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-white rounded shadow">
        {renderSelect(t('Academic Year'), selectedAcademicYear, v => {
          setSelectedAcademicYear(v);
          setSelectedExamSequence('');
          setSelectedSubClass('');
          setSelectedSubject('');
        }, academicYears, academicYearsLoading)}

        {renderSelect(t('Exam Sequence'), selectedExamSequence, setSelectedExamSequence,
          examSequences.map(s => ({
            id: s.id,
            name: `${s.name || `${t('Sequence')} ${s.sequenceNumber}`}${s.term?.name ? ` (${s.term.name})` : ''}${s.status && s.status !== 'OPEN' ? ` - ${t('closed')}` : ''}`,
          })),
          examSequencesLoading, !selectedAcademicYear)}

        {renderSelect(t('Subclass'), selectedSubClass, v => {
          setSelectedSubClass(v);
          setSelectedSubject('');
        }, subClasses.map(sc => ({ id: sc.id, name: sc.name?.toUpperCase().startsWith(sc.class?.name?.toUpperCase() ?? '') ? sc.name : `${sc.class?.name ?? ''} - ${sc.name}` })),
          subClassesLoading, !selectedAcademicYear)}

        {renderSelect(t('Subject'), selectedSubject, setSelectedSubject, subjects, subjectsLoading, !selectedSubClass)}
      </div>

      {loadError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 flex">
          <ExclamationCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="ml-3 text-sm text-red-700">{loadError}</p>
        </div>
      )}

      {sheet && !isOpen && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 flex">
          <LockClosedIcon className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <p className="ml-3 text-sm text-yellow-800">
            {sheet.examSequence.closedReason || t('Mark submission is closed for this exam sequence.')} {t('Marks are shown read-only.')}
          </p>
        </div>
      )}

      <div className="mt-6">
        {isLoadingSheet && (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">{t('Loading students and marks...')}</p>
          </div>
        )}

        {!isLoadingSheet && !sheet && !loadError && (
          <div className="text-center py-10 px-4 text-gray-500 bg-gray-50 rounded-md shadow-sm">
            {t('Please select an Academic Year, Exam Sequence, Subclass, and Subject to submit marks.')}
          </div>
        )}

        {!isLoadingSheet && sheet && rows.length === 0 && (
          <div className="text-center py-10 px-4 text-gray-500 bg-gray-50 rounded-md shadow-sm">
            {t('No students are enrolled in this class.')}
          </div>
        )}

        {!isLoadingSheet && sheet && rows.length > 0 && (
          <>
            {/* Progress + save bar (sticky so it stays reachable on a long class list) */}
            <div className="sticky top-0 z-10 bg-white shadow rounded-md p-3 mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
                <span><strong>{savedCount}</strong> / {rows.length} {t('saved')}</span>
                {unsavedCount > 0 && <span className="text-yellow-700"><strong>{unsavedCount}</strong> {t('not saved yet')}</span>}
                {invalidCount > 0 && <span className="text-red-700"><strong>{invalidCount}</strong> {t('invalid')}</span>}
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving || !isOpen || unsavedCount === 0}
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? t('Saving...') : `${t('Save All Changes')}${unsavedCount > 0 ? ` (${unsavedCount})` : ''}`}
              </button>
            </div>

            <div className="hidden md:block overflow-x-auto shadow border-b border-gray-200 sm:rounded-lg mb-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Matricule')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Student Name')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Mark (out of 20)')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Status')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((row, index) => (
                    <tr key={row.studentId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{row.matricule || 'N/A'}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{row.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{markInput(row)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{statusBadge(rowState(row))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100 bg-white shadow sm:rounded-lg mb-6">
              {rows.map((row, index) => (
                <div key={row.studentId} className="p-4 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-gray-900 break-words">{index + 1}. {row.name}</span>
                    {statusBadge(rowState(row))}
                  </div>
                  <div className="text-xs text-gray-500">{row.matricule || 'N/A'}</div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">{t('Mark (out of 20)')}</span>
                    {markInput(row)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
