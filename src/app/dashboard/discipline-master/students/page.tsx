'use client';

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
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { apiService } from '@/lib/apiService';
import { StudentPhoto } from '@/components/ui';
import {
  ISSUE_TYPES,
  getStudentDisciplineHistory,
  type DisciplineIssue,
} from '@/lib/disciplineApi';
import {
  ACTION_TYPE_LABELS,
  listDisciplinaryActions,
  type DisciplinaryAction,
} from '@/lib/disciplinaryActionsApi';
import {
  listWarnings,
  listSummons,
  enumLabel,
  type DisciplineWarning,
  type ParentSummons,
} from '@/lib/disciplineExtApi';

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

const dateLabel = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');

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

  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchStudent[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selected, setSelected] = useState<SearchStudent | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [issues, setIssues] = useState<DisciplineIssue[]>([]);
  const [warnings, setWarnings] = useState<DisciplineWarning[]>([]);
  const [summons, setSummons] = useState<ParentSummons[]>([]);
  const [actions, setActions] = useState<DisciplinaryAction[]>([]);

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
    const yearId = selectedAcademicYear?.id;
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
      toast.error('Failed to load discipline information.');
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
            <h1 className="text-2xl font-bold text-gray-900">Student Discipline Profiles</h1>
            <p className="text-sm text-gray-500 mt-1">
              Search a student to see their full discipline record
              {selectedAcademicYear ? ` for ${selectedAcademicYear.name}` : ''}.
            </p>
          </div>

          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name or matricule (min 2 characters)…"
              className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              autoFocus
            />
          </div>

          {isSearching && <p className="text-sm text-gray-400">Searching…</p>}

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
                    {s.matricule || 'No matricule'}
                    {s.subClassName ? ` · ${s.className || ''} ${s.subClassName}` : ''}
                  </p>
                </div>
              </button>
            ))}
            {!isSearching && searchTerm.trim().length >= 2 && results.length === 0 && (
              <p className="p-6 text-sm text-gray-400 text-center">No students found.</p>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Profile header */}
          <button onClick={() => setSelected(null)} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800">
            <ArrowLeftIcon className="w-4 h-4" /> Back to search
          </button>

          <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
            <StudentPhoto studentId={selected.id} photo={selected.photo || undefined} size="lg" studentName={selected.name} />
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{selected.name}</h1>
              <p className="text-sm text-gray-500">
                {selected.matricule || 'No matricule'}
                {selected.subClassName ? ` · ${selected.className || ''} ${selected.subClassName}` : ''}
              </p>
            </div>
          </div>

          {isLoadingProfile ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Loading discipline record…</div>
          ) : (
            <>
              {/* Summary chips */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <StatChip label="Lateness" value={stats.lateness} tone={stats.lateness > 0 ? 'amber' : 'gray'} />
                <StatChip label="Absences" value={stats.absences} tone={stats.absences > 0 ? 'red' : 'gray'} />
                <StatChip label="Misconduct" value={stats.misconduct} tone={stats.misconduct > 0 ? 'purple' : 'gray'} />
                <StatChip label="Open Warnings" value={stats.openWarnings} tone={stats.openWarnings > 0 ? 'amber' : 'gray'} />
                <StatChip label="Summons" value={stats.pendingSummons} tone={stats.pendingSummons > 0 ? 'blue' : 'gray'} />
                <StatChip label="Sanctions" value={stats.activeActions} tone={stats.activeActions > 0 ? 'red' : 'gray'} />
              </div>

              {/* Discipline issues */}
              <section className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                  <h2 className="font-semibold text-gray-900 text-sm">Discipline Issues ({issues.length})</h2>
                </div>
                {issues.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400">No discipline issues recorded.</p>
                ) : (
                  <ul className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                    {issues.map(i => (
                      <li key={i.id} className="px-4 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900">{ISSUE_LABELS[i.issueType] || enumLabel(i.issueType)}</span>
                          <span className="text-xs text-gray-400 shrink-0">{dateLabel(i.createdAt)}</span>
                        </div>
                        {i.description && <p className="text-xs text-gray-500 mt-0.5">{i.description}</p>}
                        {i.actionTaken && <p className="text-xs text-green-700 mt-0.5">Action: {i.actionTaken}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Warnings */}
              <section className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <BellIcon className="w-5 h-5 text-amber-500" />
                  <h2 className="font-semibold text-gray-900 text-sm">Warnings ({warnings.length})</h2>
                </div>
                {warnings.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400">No warnings issued.</p>
                ) : (
                  <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                    {warnings.map(w => (
                      <li key={w.id} className={`px-4 py-2.5 ${w.resolved ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            Level {w.warningLevel} · {enumLabel(w.reason)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${w.resolved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {w.resolved ? 'Resolved' : 'Open'}
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
                  <h2 className="font-semibold text-gray-900 text-sm">Parent Summons ({summons.length})</h2>
                </div>
                {summons.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400">No parent summons.</p>
                ) : (
                  <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                    {summons.map(s => (
                      <li key={s.id} className={`px-4 py-2.5 ${s.status === 'CANCELLED' ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{s.parent?.name || 'Parent'}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full shrink-0 bg-blue-50 text-blue-700">{enumLabel(s.status)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{s.reason}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {s.scheduledDate ? `Scheduled ${new Date(s.scheduledDate).toLocaleString()}` : dateLabel(s.createdAt)}
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
                  <h2 className="font-semibold text-gray-900 text-sm">Sanctions ({actions.length})</h2>
                </div>
                {actions.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400">No sanctions recorded.</p>
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
