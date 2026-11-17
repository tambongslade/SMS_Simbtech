'use client';

import { appDateLocale } from '@/lib/formatDate';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BellIcon,
  UserGroupIcon,
  ScaleIcon,
  BanknotesIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { apiService } from '@/lib/apiService';
import { StudentPhoto } from '@/components/ui';
import {
  ISSUE_TYPES,
  getStudentDisciplineHistory,
  fmtMoney,
  type DisciplineIssue,
} from '@/lib/disciplineApi';
import {
  ACTION_TYPE_LABELS,
  listDisciplinaryActions,
  type DisciplinaryAction,
  type DisciplinaryActionStatus,
  type DisciplinaryActionType,
} from '@/lib/disciplinaryActionsApi';
import {
  listWarnings,
  listSummons,
  enumLabel,
  type DisciplineWarning,
  type ParentSummons,
} from '@/lib/disciplineExtApi';
import { useLanguage } from '@/components/context/LanguageContext';

interface SearchStudent {
  id: number;
  name: string;
  matricule?: string;
  photo?: string | null;
  className?: string;
  subClassName?: string;
}

const ISSUE_LABELS: Record<string, string> = ISSUE_TYPES.reduce(
  (acc, t) => ({ ...acc, [t.value]: t.label }),
  {} as Record<string, string>
);

const dateLabel = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(appDateLocale()) : '—');

// --- List views (GET /discipline-profiles/...) ---
interface ListStudent extends SearchStudent {
  subClassId?: number | null;
}
interface RecentStudent extends ListStudent {
  actionCount: number;
  latestAction: {
    id: number;
    actionType: DisciplinaryActionType;
    status: DisciplinaryActionStatus;
    days?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    reason?: string | null;
    createdAt: string;
  };
}
interface RosterStudent extends ListStudent {
  issues: number;
  actions: number;
  openWarnings: number;
  pendingSummons: number;
  lastActionAt: string | null;
}
interface SubClassOption {
  id: number;
  name: string;
  className: string;
}
// Outstanding fees on the installment that applies today (GET /discipline-profiles/student/:id/fees)
interface FeeStatus {
  installmentsCount: 2 | 3;
  totalExpected: number;
  totalPaid: number;
  totalOutstanding: number;
  current: { number: number; dueDate: string; passed: boolean; dueByThen: number; outstanding: number } | null;
  next: { number: number; dueDate: string; dueByThen: number; outstanding: number } | null;
}

const RECENT = 'recent';
const ORDINAL = ['', '1st', '2nd', '3rd'];

const STATUS_CHIP: Record<string, string> = {
  ACTIVE: 'bg-red-100 text-red-700',
  PENDING: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

function FeeCard({ fee, loading, t }: { fee: FeeStatus | null; loading: boolean; t: (s: string) => string }) {
  const header = (
    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
      <BanknotesIcon className="w-5 h-5 text-emerald-600" />
      <h2 className="font-semibold text-gray-900 text-sm">{t('School Fees')}</h2>
    </div>
  );
  if (loading) {
    return <section className="bg-white rounded-lg shadow overflow-hidden">{header}<p className="p-4 text-sm text-gray-400">{t('Loading fees…')}</p></section>;
  }
  if (!fee) {
    return <section className="bg-white rounded-lg shadow overflow-hidden">{header}<p className="p-4 text-sm text-gray-400">{t('No school fee record for this year.')}</p></section>;
  }
  const c = fee.current;
  const owing = c ? c.outstanding > 0 : fee.totalOutstanding > 0;
  return (
    <section className="bg-white rounded-lg shadow overflow-hidden">
      {header}
      <div className="p-4 space-y-3">
        {c ? (
          <div className={`rounded-lg p-3 ${owing ? (c.passed ? 'bg-red-50' : 'bg-amber-50') : 'bg-green-50'}`}>
            <p className="text-xs text-gray-600">
              {ORDINAL[c.number]} {t('installment')} · {c.passed ? t('was due') : t('due')} {dateLabel(c.dueDate)}
            </p>
            <p className={`text-2xl font-bold ${owing ? (c.passed ? 'text-red-700' : 'text-amber-700') : 'text-green-700'}`}>
              {owing ? fmtMoney(c.outstanding) : t('Paid up')}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              {owing ? `${t('still to pay of')} ${fmtMoney(c.dueByThen)} ${t('due by then')}` : `${fmtMoney(c.dueByThen)} ${t('due by then is paid')}`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-amber-700">{t('Installment due dates are not set (Academic Years → term fee deadlines).')}</p>
        )}
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-gray-50 p-2">
            <dt className="text-[11px] text-gray-500">{t('Year total')}</dt>
            <dd className="text-sm font-semibold text-gray-900">{fmtMoney(fee.totalExpected)}</dd>
          </div>
          <div className="rounded-md bg-gray-50 p-2">
            <dt className="text-[11px] text-gray-500">{t('Paid')}</dt>
            <dd className="text-sm font-semibold text-gray-900">{fmtMoney(fee.totalPaid)}</dd>
          </div>
          <div className="rounded-md bg-gray-50 p-2">
            <dt className="text-[11px] text-gray-500">{t('Year balance')}</dt>
            <dd className="text-sm font-semibold text-gray-900">{fmtMoney(fee.totalOutstanding)}</dd>
          </div>
        </dl>
        {fee.next && (
          <p className="text-xs text-gray-500">
            {t('Next')}: {ORDINAL[fee.next.number]} {t('installment')} {t('due')} {dateLabel(fee.next.dueDate)}
            {fee.next.outstanding > 0 ? ` · ${fmtMoney(fee.next.outstanding)} ${t('to pay by then')}` : ''}
          </p>
        )}
        {fee.installmentsCount === 2 && (
          <p className="text-xs text-gray-500">{t('This class pays in 2 installments.')}</p>
        )}
      </div>
    </section>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number; tone: 'red' | 'amber' | 'blue' | 'purple' | 'gray' }) {
  const tones = {
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    gray: 'bg-gray-100 text-gray-600',
  };
  return (
    <div className={`rounded-lg px-3 py-2 text-center ${tones[tone]}`}>
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className="text-[11px] leading-tight">{label}</p>
    </div>
  );
}

export default function StudentDisciplineProfilesPage() {
  const { selectedAcademicYear } = useAuth();
  const { t } = useLanguage();

  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchStudent[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selected, setSelected] = useState<SearchStudent | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [issues, setIssues] = useState<DisciplineIssue[]>([]);
  const [warnings, setWarnings] = useState<DisciplineWarning[]>([]);
  const [summons, setSummons] = useState<ParentSummons[]>([]);
  const [actions, setActions] = useState<DisciplinaryAction[]>([]);
  const [fee, setFee] = useState<FeeStatus | null>(null);
  const [isLoadingFee, setIsLoadingFee] = useState(false);

  // List view: recent disciplinary actions (default) or one sub-class
  const [view, setView] = useState<string>(RECENT);
  const [subClasses, setSubClasses] = useState<SubClassOption[]>([]);
  const [recent, setRecent] = useState<RecentStudent[]>([]);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const yearQs = selectedAcademicYear?.id ? `academicYearId=${selectedAcademicYear.id}` : '';

  useEffect(() => {
    apiService
      .get<{ data?: { id: number; name: string; className?: string; class?: { name?: string } }[] }>('/classes/sub-classes?limit=500', { silent: true })
      .then((res) => {
        const list = res?.data ?? [];
        setSubClasses(
          list
            .map((s) => ({ id: s.id, name: s.name, className: s.class?.name ?? s.className ?? '' }))
            .sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }) || a.name.localeCompare(b.name, undefined, { numeric: true })),
        );
      })
      .catch(() => setSubClasses([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingList(true);
    const url = view === RECENT ? `/discipline-profiles/recent?limit=50&${yearQs}` : `/discipline-profiles/sub-class/${view}?${yearQs}`;
    apiService
      .get<{ data?: (RecentStudent & RosterStudent)[] }>(url)
      .then((res) => {
        if (cancelled) return;
        if (view === RECENT) setRecent(res?.data ?? []);
        else setRoster(res?.data ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        if (view === RECENT) setRecent([]);
        else setRoster([]);
      })
      .finally(() => !cancelled && setIsLoadingList(false));
    return () => { cancelled = true; };
  }, [view, yearQs]);

  const subClassGroups = useMemo(() => {
    const groups = new Map<string, SubClassOption[]>();
    subClasses.forEach((s) => groups.set(s.className, [...(groups.get(s.className) || []), s]));
    return [...groups.entries()];
  }, [subClasses]);

  // Debounced student search
  useEffect(() => {
    if (searchTerm.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiService.get(
          `/students/search?q=${encodeURIComponent(searchTerm.trim())}&limit=15${selectedAcademicYear?.id ? `&academicYearId=${selectedAcademicYear.id}` : ''}`
        );
        const inner = res.data?.data ?? res.data ?? [];
        setResults((Array.isArray(inner) ? inner : []).map((s: any) => {
          const enrollments: any[] = s.enrollments || [];
          const current = enrollments[enrollments.length - 1];
          const subClass = current?.subClass ?? current?.sub_class;
          return {
            id: s.id,
            name: s.name,
            matricule: s.matricule,
            photo: s.photo,
            className: subClass?.class?.name,
            subClassName: subClass?.name,
          };
        }));
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm, selectedAcademicYear?.id]);

  const openProfile = async (student: SearchStudent) => {
    setSelected(student);
    setIsLoadingProfile(true);
    setIssues([]); setWarnings([]); setSummons([]); setActions([]);
    setFee(null);
    setIsLoadingFee(true);
    const yearId = selectedAcademicYear?.id;
    apiService
      .get(`/discipline-profiles/student/${student.id}/fees?${yearQs}`, { silent: true })
      .then((res: { data?: FeeStatus | null }) => setFee(res?.data ?? null))
      .catch(() => setFee(null))
      .finally(() => setIsLoadingFee(false));
    const [issuesRes, warningsRes, summonsRes, actionsRes] = await Promise.allSettled([
      getStudentDisciplineHistory(student.id, yearId),
      listWarnings({ studentId: student.id, academicYearId: yearId }),
      listSummons({ studentId: student.id, academicYearId: yearId }),
      listDisciplinaryActions({ studentId: student.id, academicYearId: yearId, limit: 100 }),
    ]);
    if (issuesRes.status === 'fulfilled') setIssues(issuesRes.value || []);
    if (warningsRes.status === 'fulfilled') setWarnings(warningsRes.value || []);
    if (summonsRes.status === 'fulfilled') setSummons(summonsRes.value || []);
    if (actionsRes.status === 'fulfilled') setActions(actionsRes.value.data || []);
    if ([issuesRes, warningsRes, summonsRes, actionsRes].every(r => r.status === 'rejected')) {
      toast.error(t('Failed to load discipline information.'));
    }
    setIsLoadingProfile(false);
  };

  const stats = useMemo(() => ({
    lateness: issues.filter(i => i.issueType === 'MORNING_LATENESS').length,
    absences: issues.filter(i => i.issueType === 'CLASS_ABSENCE').length,
    misconduct: issues.filter(i => !['MORNING_LATENESS', 'CLASS_ABSENCE'].includes(i.issueType)).length,
    openWarnings: warnings.filter(w => !w.resolved).length,
    pendingSummons: summons.filter(s => s.status === 'PENDING' || s.status === 'SCHEDULED').length,
    activeActions: actions.filter(a => a.status === 'ACTIVE' || a.status === 'PENDING').length,
  }), [issues, warnings, summons, actions]);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      {!selected ? (
        <>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('Student Discipline Profiles')}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('Search a student, or pick a class, to see their full discipline record')}
              {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}.
            </p>
          </div>

          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('Search by name or matricule (min 2 characters)…')}
              className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              autoFocus
            />
          </div>

          {searchTerm.trim().length < 2 ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label htmlFor="profiles-view" className="text-sm font-medium text-gray-700 shrink-0">{t('Show')}</label>
                <select
                  id="profiles-view"
                  value={view}
                  onChange={e => setView(e.target.value)}
                  className="w-full sm:w-auto sm:min-w-[18rem] border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={RECENT}>{t('Recent disciplinary actions')}</option>
                  {subClassGroups.map(([className, list]) => (
                    <optgroup key={className} label={className || t('Other')}>
                      {list.map(s => (
                        <option key={s.id} value={String(s.id)}>{className ? `${className} – ${s.name}` : s.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {isLoadingList ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-sm text-gray-500">{t('Loading…')}</div>
              ) : view === RECENT ? (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                    <ScaleIcon className="w-5 h-5 text-red-500" />
                    <h2 className="font-semibold text-gray-900 text-sm">{t('Students with recent disciplinary actions')}</h2>
                  </div>
                  {recent.length === 0 ? (
                    <p className="p-6 text-sm text-gray-400 text-center">{t('No disciplinary actions recorded this year.')}</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {recent.map(s => (
                        <li key={s.id}>
                          <button onClick={() => openProfile(s)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 active:bg-gray-100">
                            <StudentPhoto studentId={s.id} photo={s.photo || undefined} size="sm" studentName={s.name} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {s.matricule || t('No matricule')}
                                {s.subClassName ? ` · ${s.className || ''} ${s.subClassName}` : s.className ? ` · ${s.className}` : ''}
                              </p>
                              <p className="text-xs text-gray-700 mt-0.5 truncate">
                                {ACTION_TYPE_LABELS[s.latestAction.actionType] || enumLabel(s.latestAction.actionType)}
                                {s.latestAction.days ? ` · ${s.latestAction.days} ${s.latestAction.days > 1 ? t('days') : t('day')}` : ''}
                                {' · '}{dateLabel(s.latestAction.createdAt)}
                                {s.actionCount > 1 ? ` · ${s.actionCount} ${t('actions this year')}` : ''}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_CHIP[s.latestAction.status] || 'bg-gray-100 text-gray-600'}`}>
                              {enumLabel(s.latestAction.status)}
                            </span>
                            <ChevronRightIcon className="w-4 h-4 text-gray-300 shrink-0" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                    <UserGroupIcon className="w-5 h-5 text-blue-500" />
                    <h2 className="font-semibold text-gray-900 text-sm">
                      {(() => { const s = subClasses.find(x => String(x.id) === view); return s ? `${s.className} – ${s.name}` : t('Class'); })()}
                      {' '}({roster.length})
                    </h2>
                  </div>
                  {roster.length === 0 ? (
                    <p className="p-6 text-sm text-gray-400 text-center">{t('No students in this class.')}</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {roster.map(s => (
                        <li key={s.id}>
                          <button onClick={() => openProfile(s)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 active:bg-gray-100">
                            <StudentPhoto studentId={s.id} photo={s.photo || undefined} size="sm" studentName={s.name} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {s.matricule || t('No matricule')}
                                {s.lastActionAt ? ` · ${t('last action')} ${dateLabel(s.lastActionAt)}` : ''}
                              </p>
                            </div>
                            <div className="hidden sm:flex gap-1 shrink-0">
                              {s.issues > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{s.issues} {t('issues')}</span>}
                              {s.openWarnings > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{s.openWarnings} {t('warnings')}</span>}
                              {s.pendingSummons > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{s.pendingSummons} {t('summons')}</span>}
                              {s.actions > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700">{s.actions} {t('sanctions')}</span>}
                            </div>
                            {(s.issues + s.openWarnings + s.pendingSummons + s.actions) > 0 && (
                              <span className="sm:hidden text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 shrink-0">
                                {s.issues + s.openWarnings + s.pendingSummons + s.actions}
                              </span>
                            )}
                            <ChevronRightIcon className="w-4 h-4 text-gray-300 shrink-0" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          ) : (
          <>
          {isSearching && <p className="text-sm text-gray-400">{t('Searching…')}</p>}

          <div className="bg-white rounded-lg shadow divide-y divide-gray-100 overflow-hidden">
            {results.map(s => (
              <button
                key={s.id}
                onClick={() => openProfile(s)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 active:bg-gray-100"
              >
                <StudentPhoto studentId={s.id} photo={s.photo || undefined} size="sm" studentName={s.name} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-500">
                    {s.matricule || t('No matricule')}
                    {s.subClassName ? ` · ${s.className || ''} ${s.subClassName}` : ''}
                  </p>
                </div>
              </button>
            ))}
            {!isSearching && searchTerm.trim().length >= 2 && results.length === 0 && (
              <p className="p-6 text-sm text-gray-400 text-center">{t('No students found.')}</p>
            )}
          </div>
          </>
          )}
        </>
      ) : (
        <>
          {/* Profile header */}
          <button onClick={() => setSelected(null)} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800">
            <ArrowLeftIcon className="w-4 h-4" /> {t('Back to list')}
          </button>

          <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
            <StudentPhoto studentId={selected.id} photo={selected.photo || undefined} size="lg" studentName={selected.name} />
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{selected.name}</h1>
              <p className="text-sm text-gray-500">
                {selected.matricule || t('No matricule')}
                {selected.subClassName ? ` · ${selected.className || ''} ${selected.subClassName}` : ''}
              </p>
            </div>
          </div>

          <FeeCard fee={fee} loading={isLoadingFee} t={t} />

          {isLoadingProfile ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">{t('Loading discipline record…')}</div>
          ) : (
            <>
              {/* Summary chips */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <StatChip label={t('Lateness')} value={stats.lateness} tone={stats.lateness > 0 ? 'amber' : 'gray'} />
                <StatChip label={t('Absences')} value={stats.absences} tone={stats.absences > 0 ? 'red' : 'gray'} />
                <StatChip label={t('Misconduct')} value={stats.misconduct} tone={stats.misconduct > 0 ? 'purple' : 'gray'} />
                <StatChip label={t('Open Warnings')} value={stats.openWarnings} tone={stats.openWarnings > 0 ? 'amber' : 'gray'} />
                <StatChip label={t('Summons')} value={stats.pendingSummons} tone={stats.pendingSummons > 0 ? 'blue' : 'gray'} />
                <StatChip label={t('Sanctions')} value={stats.activeActions} tone={stats.activeActions > 0 ? 'red' : 'gray'} />
              </div>

              {/* Discipline issues */}
              <section className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                  <h2 className="font-semibold text-gray-900 text-sm">{t('Discipline Issues')} ({issues.length})</h2>
                </div>
                {issues.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400">{t('No discipline issues recorded.')}</p>
                ) : (
                  <ul className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                    {issues.map(i => (
                      <li key={i.id} className="px-4 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900">{ISSUE_LABELS[i.issueType] || enumLabel(i.issueType)}</span>
                          <span className="text-xs text-gray-400 shrink-0">{dateLabel(i.createdAt)}</span>
                        </div>
                        {i.description && <p className="text-xs text-gray-500 mt-0.5">{i.description}</p>}
                        {i.actionTaken && <p className="text-xs text-green-700 mt-0.5">{t('Action')}: {i.actionTaken}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Warnings */}
              <section className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <BellIcon className="w-5 h-5 text-amber-500" />
                  <h2 className="font-semibold text-gray-900 text-sm">{t('Warnings')} ({warnings.length})</h2>
                </div>
                {warnings.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400">{t('No warnings issued.')}</p>
                ) : (
                  <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                    {warnings.map(w => (
                      <li key={w.id} className={`px-4 py-2.5 ${w.resolved ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {t('Level')} {w.warningLevel} · {enumLabel(w.reason)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${w.resolved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {w.resolved ? t('Resolved') : t('Open')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{w.description}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{dateLabel(w.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Parent summons */}
              <section className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5 text-blue-500" />
                  <h2 className="font-semibold text-gray-900 text-sm">{t('Parent Summons')} ({summons.length})</h2>
                </div>
                {summons.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400">{t('No parent summons.')}</p>
                ) : (
                  <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                    {summons.map(s => (
                      <li key={s.id} className={`px-4 py-2.5 ${s.status === 'CANCELLED' ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{s.parent?.name || t('Parent')}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full shrink-0 bg-blue-50 text-blue-700">{enumLabel(s.status)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{s.reason}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {s.scheduledDate ? `${t('Scheduled')} ${new Date(s.scheduledDate).toLocaleString(appDateLocale())}` : dateLabel(s.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Disciplinary actions (sanctions) */}
              <section className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <ScaleIcon className="w-5 h-5 text-red-500" />
                  <h2 className="font-semibold text-gray-900 text-sm">{t('Sanctions')} ({actions.length})</h2>
                </div>
                {actions.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400">{t('No sanctions recorded.')}</p>
                ) : (
                  <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                    {actions.map(a => (
                      <li key={a.id} className={`px-4 py-2.5 ${a.status === 'CANCELLED' ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {ACTION_TYPE_LABELS[a.actionType] || enumLabel(a.actionType)}
                            {a.days ? ` · ${a.days} day${a.days > 1 ? 's' : ''}` : ''}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                            a.status === 'ACTIVE' ? 'bg-red-100 text-red-700'
                              : a.status === 'PENDING' ? 'bg-amber-100 text-amber-700'
                              : a.status === 'COMPLETED' ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {enumLabel(a.status)}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {a.startDate ? `${dateLabel(a.startDate)}${a.endDate ? ` → ${dateLabel(a.endDate)}` : ''}` : dateLabel((a as any).createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
