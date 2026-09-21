'use client'
import { FC, useEffect, useMemo, useState } from 'react';
import {
  AcademicCapIcon,
  TrophyIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';
import { useLanguage } from '@/components/context/LanguageContext';
import { fetchChildDetails, getActiveMatricule, getSavedMatricules, setActiveMatricule } from '@/lib/parentPortalApi';

// Backend `/parents/:matricule/details` response shape (camelCase after
// case-conversion middleware).
interface SubjectPerformance {
  subjectName: string;
  teacherName?: string;
  marks: Array<{ sequence: string; mark: number; total: number; date: string }>;
  average: number;
}

interface ChildDetailsPayload {
  id: number;
  name: string;
  matricule?: string;
  classInfo?: { className: string; subclassName: string; classMaster?: string } | null;
  attendance?: { presentDays: number; absentDays: number; lateDays: number; attendanceRate: number };
  academicPerformance?: {
    subjects: SubjectPerformance[];
    overallAverage: number;
    positionInClass?: number;
  };
}

// One row per sequence, aggregated across all subjects for the selected term.
interface SequenceRow {
  sequenceLabel: string;
  subjects: Array<{ name: string; teacher?: string; mark: number; total: number; percent: number }>;
  averagePercent: number;
}

const gradeColor = (pct: number) => {
  if (pct >= 80) return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (pct >= 60) return 'bg-blue-50 text-blue-700 ring-blue-200';
  if (pct >= 50) return 'bg-amber-50 text-amber-700 ring-amber-200';
  return 'bg-rose-50 text-rose-700 ring-rose-200';
};

const gradeLetter = (pct: number) => {
  if (pct >= 85) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 55) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
};

function StatTile({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub?: string; icon: any; tone: 'blue' | 'emerald' | 'amber' | 'slate' }) {
  const toneStyle: Record<string, string> = {
    blue: 'from-blue-50 text-blue-900',
    emerald: 'from-emerald-50 text-emerald-900',
    amber: 'from-amber-50 text-amber-900',
    slate: 'from-slate-50 text-slate-900',
  };
  return (
    <div className={`rounded-2xl border border-slate-100 shadow-sm bg-gradient-to-br ${toneStyle[tone]} to-white p-5`}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-slate-500">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
      <div className="rounded-3xl bg-slate-100 h-24 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => <div key={i} className="rounded-2xl h-32 bg-slate-100 animate-pulse" />)}
      </div>
      <div className="rounded-2xl h-96 bg-slate-100 animate-pulse" />
    </div>
  );
}

interface ParentStudentResultsPageProps {
  studentId?: number;
  matricule?: string;
}

const ParentStudentResultsPage: FC<ParentStudentResultsPageProps> = ({ matricule: propMatricule }) => {
  const { t } = useLanguage();
  const [matricule, setMatricule] = useState<string | null>(propMatricule ?? null);
  const [availableMatricules, setAvailableMatricules] = useState<string[]>([]);
  const [details, setDetails] = useState<ChildDetailsPayload | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propMatricule) return;
    const saved = getSavedMatricules();
    setAvailableMatricules(saved);
    setMatricule(getActiveMatricule() || saved[0] || null);
  }, [propMatricule]);

  const load = async (m: string) => {
    setLoading(true);
    setError(null);
    try {
      const res: ChildDetailsPayload = await fetchChildDetails(m);
      setDetails(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to load results.');
      setDetails(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (matricule) load(matricule);
  }, [matricule]);

  // Regroup all subject marks by sequence label.
  const sequenceRows: SequenceRow[] = useMemo(() => {
    if (!details?.academicPerformance?.subjects) return [];
    const bySequence = new Map<string, SequenceRow>();
    details.academicPerformance.subjects.forEach(subj => {
      subj.marks?.forEach(m => {
        const label = m.sequence || t('Sequence');
        if (!bySequence.has(label)) {
          bySequence.set(label, { sequenceLabel: label, subjects: [], averagePercent: 0 });
        }
        const total = m.total > 0 ? m.total : 20;
        const percent = (m.mark / total) * 100;
        bySequence.get(label)!.subjects.push({
          name: subj.subjectName,
          teacher: subj.teacherName,
          mark: m.mark,
          total,
          percent,
        });
      });
    });
    const rows = Array.from(bySequence.values());
    rows.forEach(r => {
      r.averagePercent = r.subjects.length > 0
        ? r.subjects.reduce((s, x) => s + x.percent, 0) / r.subjects.length
        : 0;
    });
    return rows;
  }, [details, t]);

  useEffect(() => {
    if (sequenceRows.length > 0 && !selectedSequence) {
      setSelectedSequence(sequenceRows[0].sequenceLabel);
    }
  }, [sequenceRows, selectedSequence]);

  const activeRow = sequenceRows.find(r => r.sequenceLabel === selectedSequence);
  const overallAvg = details?.academicPerformance?.overallAverage ?? 0;
  const overallPercent = (overallAvg / 20) * 100;

  const handleSwitch = (m: string) => {
    setActiveMatricule(m);
    setMatricule(m);
    setDetails(null);
    setSelectedSequence(null);
  };

  if (!matricule) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl bg-white shadow-sm border border-slate-100 p-8 text-center">
          <AcademicCapIcon className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">{t('No child selected')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('Add a child from the overview page to see results.')}</p>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl bg-white shadow-sm border border-slate-100 p-8 text-center">
          <ExclamationCircleIcon className="mx-auto h-12 w-12 text-rose-400" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">{t('Could not load results')}</h2>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <Button onClick={() => load(matricule)} className="mt-6 rounded-full inline-flex items-center" variant="outline">
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            {t('Try Again')}
          </Button>
        </div>
      </div>
    );
  }

  if (!details) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
        {/* Header */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6 sm:p-8">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">{t('Academic Results')}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{details.name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {details.classInfo?.className || t('Not enrolled')}
                {details.classInfo?.subclassName ? ` · ${details.classInfo.subclassName}` : ''}
                {details.classInfo?.classMaster ? ` · ${t('Class Master')}: ${details.classInfo.classMaster}` : ''}
              </p>
            </div>
            {availableMatricules.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {availableMatricules.map(m => (
                  <button
                    key={m}
                    onClick={() => handleSwitch(m)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      m === matricule
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatTile
            label={t('Overall Average')}
            value={`${overallAvg.toFixed(1)}/20`}
            sub={`${overallPercent.toFixed(1)}% · ${gradeLetter(overallPercent)}`}
            icon={AcademicCapIcon}
            tone="blue"
          />
          <StatTile
            label={t('Position in Class')}
            value={details.academicPerformance?.positionInClass ? `#${details.academicPerformance.positionInClass}` : '—'}
            sub={t('Rank across the subclass')}
            icon={TrophyIcon}
            tone="emerald"
          />
          <StatTile
            label={t('Subjects')}
            value={String(details.academicPerformance?.subjects?.length ?? 0)}
            sub={t('This academic year')}
            icon={ChartBarIcon}
            tone="slate"
          />
        </div>

        {/* Sequence selector */}
        {sequenceRows.length > 0 ? (
          <Card className="rounded-2xl border border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">{t('Select sequence')}</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {sequenceRows.map(row => (
                  <button
                    key={row.sequenceLabel}
                    onClick={() => setSelectedSequence(row.sequenceLabel)}
                    className={`px-3.5 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2 transition ${
                      selectedSequence === row.sequenceLabel
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300'
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4" />
                    {row.sequenceLabel}
                    <span className="text-xs opacity-75">{row.averagePercent.toFixed(0)}%</span>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card className="rounded-2xl border border-slate-100 shadow-sm">
            <CardBody>
              <div className="text-center py-10">
                <AcademicCapIcon className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-3 text-sm font-medium text-slate-900">{t('No results available')}</h3>
                <p className="mt-1 text-sm text-slate-500">{t('No marks have been recorded yet.')}</p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Selected sequence detail */}
        {activeRow && (
          <Card className="rounded-2xl border border-slate-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-900">{activeRow.sequenceLabel}</CardTitle>
                <div className="text-sm text-slate-500">
                  {t('Average')}: <span className="font-semibold text-slate-900">{activeRow.averagePercent.toFixed(1)}%</span>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3">{t('Subject')}</th>
                      <th className="px-4 py-3">{t('Teacher')}</th>
                      <th className="px-4 py-3">{t('Score')}</th>
                      <th className="px-4 py-3">{t('Progress')}</th>
                      <th className="px-4 py-3">{t('Grade')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeRow.subjects.map((s, i) => (
                      <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{s.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{s.teacher || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-800 tabular-nums">{s.mark}/{s.total}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                                style={{ width: `${Math.max(0, Math.min(100, s.percent))}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 tabular-nums">{s.percent.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ring-1 ${gradeColor(s.percent)}`}>
                            {gradeLetter(s.percent)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {activeRow.subjects.map((s, i) => (
                  <div key={i} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{s.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{s.teacher || '—'}</div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ring-1 ${gradeColor(s.percent)}`}>
                        {gradeLetter(s.percent)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.max(0, Math.min(100, s.percent))}%` }} />
                      </div>
                      <span className="text-xs text-slate-600 tabular-nums font-medium">{s.mark}/{s.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ParentStudentResultsPage;
