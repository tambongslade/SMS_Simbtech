
import { FC, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
    ArrowLeftIcon,
    ExclamationCircleIcon,
    UserCircleIcon,
    HomeIcon,
    CurrencyDollarIcon,
    AcademicCapIcon,
    ClipboardDocumentListIcon,
    ExclamationTriangleIcon,
    ChartBarIcon,
    ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { Button, Tabs } from '@/components/ui';
import { useLanguage } from '@/components/context/LanguageContext';
import ParentStudentFeesPage from '../fees/page';
import ParentStudentResultsPage from '../results/page';
import { formatDOB } from '@/lib/formatDate';
import Link from 'next/link';
import {
    fetchChildDetails,
    fetchChildQuizResults,
    fetchChildDisciplinaryActions,
    formatMoney,
    QuizResult,
} from '@/lib/parentPortalApi';

interface ChildDetailsProps {
    childId: number;
    matricule?: string;
    onBack: () => void;
}

// ─── Overview tab ────────────────────────────────────────────────────────────
const OverviewTab: FC<{ childData: any }> = ({ childData }) => {
    const { t } = useLanguage();
    const attendance = Number(childData?.attendance?.attendanceRate ?? 0);
    const overallAvg = Number(childData?.academicPerformance?.overallAverage ?? 0);
    const outstanding = Number(childData?.fees?.outstandingBalance ?? 0);
    const rank = childData?.academicPerformance?.positionInClass;

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Identity card */}
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-4">
                        {childData?.photo ? (
                            <img src={childData.photo} alt={childData.name} className="w-16 h-16 rounded-2xl object-cover shrink-0 ring-1 ring-slate-100" />
                        ) : (
                            <UserCircleIcon className="w-16 h-16 text-slate-300 shrink-0" />
                        )}
                        <div className="min-w-0">
                            <h4 className="text-xl font-semibold text-slate-900">{childData?.name}</h4>
                            <p className="text-sm text-slate-500 mt-0.5">{t('Matricule')}: {childData?.matricule || '—'}</p>
                            <p className="text-sm text-slate-500">
                                {childData?.classInfo?.className || t('Not enrolled')}
                                {childData?.classInfo?.subclassName ? ` · ${childData.classInfo.subclassName}` : ''}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-2 text-sm">
                        <p><span className="font-medium text-slate-700">{t('Class Master')}:</span> <span className="text-slate-600">{childData?.classInfo?.classMaster || '—'}</span></p>
                        <p><span className="font-medium text-slate-700">{t('Date of Birth')}:</span> <span className="text-slate-600">{formatDOB(childData?.dateOfBirth) === '-' ? '—' : formatDOB(childData?.dateOfBirth)}</span></p>
                    </div>
                </div>
            </div>

            {/* Metric tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <MetricTile label={t('Overall Average')} value={`${overallAvg.toFixed(1)}/20`} tone="blue" icon={AcademicCapIcon} />
                <MetricTile label={t('Attendance Rate')} value={`${attendance.toFixed(1)}%`} tone={attendance >= 90 ? 'emerald' : attendance >= 75 ? 'amber' : 'rose'} icon={ClipboardDocumentListIcon} />
                <MetricTile label={t('Class Rank')} value={rank ? `#${rank}` : '—'} tone="slate" icon={ChartBarIcon} />
                <MetricTile label={t('Pending Fees')} value={formatMoney(outstanding)} tone={outstanding > 0 ? 'rose' : 'emerald'} icon={CurrencyDollarIcon} />
            </div>

            {/* Latest marks (real, from details) */}
            {childData?.academicPerformance?.subjects && childData.academicPerformance.subjects.length > 0 && (
                <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-slate-900">{t('Subject Averages')}</h3>
                    </div>
                    <ul className="divide-y divide-slate-100">
                        {childData.academicPerformance.subjects.slice(0, 5).map((s: any, i: number) => (
                            <li key={i} className="py-3 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{s.subjectName}</p>
                                    <p className="text-xs text-slate-500">{s.teacherName || '—'}</p>
                                </div>
                                <span className="text-sm font-semibold text-slate-900 tabular-nums">
                                    {Number(s.average || 0).toFixed(1)}/20
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

const MetricTile: FC<{ label: string; value: string; icon: any; tone: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' }> = ({ label, value, icon: Icon, tone }) => {
    const toneMap: Record<string, string> = {
        blue: 'from-blue-50 text-blue-900',
        emerald: 'from-emerald-50 text-emerald-900',
        amber: 'from-amber-50 text-amber-900',
        rose: 'from-rose-50 text-rose-900',
        slate: 'from-slate-50 text-slate-900',
    };
    return (
        <div className={`rounded-2xl border border-slate-100 shadow-sm bg-gradient-to-br ${toneMap[tone]} to-white p-4`}>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-slate-500">
                <Icon className="w-4 h-4" />
                <span className="truncate">{label}</span>
            </div>
            <div className="mt-1.5 text-xl font-semibold truncate">{value}</div>
        </div>
    );
};

// ─── Quizzes tab (real fetch) ────────────────────────────────────────────────
const QuizzesTab: FC<{ matricule: string }> = ({ matricule }) => {
    const { t } = useLanguage();
    const [quizzes, setQuizzes] = useState<QuizResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchChildQuizResults(matricule);
            setQuizzes(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setError(e?.message || 'Failed to load quizzes.');
        } finally {
            setLoading(false);
        }
    }, [matricule]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div className="p-6 space-y-3">
                {[0, 1, 2].map(i => <div key={i} className="rounded-xl h-20 bg-slate-100 animate-pulse" />)}
            </div>
        );
    }

    if (error) {
        return <div className="p-6 text-center text-sm text-rose-600">{error}</div>;
    }

    const completed = quizzes.filter(q => q.status === 'COMPLETED');
    const avgScore = completed.length > 0
        ? Math.round(completed.reduce((s, q) => s + (Number(q.percentage) || 0), 0) / completed.length)
        : 0;

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-slate-900">{t('Quiz Results')}</h3>
                <p className="text-sm text-slate-500">{t('Track quiz performance over time')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <MetricTile label={t('Completed')} value={String(completed.length)} tone="blue" icon={ClipboardDocumentListIcon} />
                <MetricTile label={t('Average Score')} value={`${avgScore}%`} tone={avgScore >= 75 ? 'emerald' : 'amber'} icon={ChartBarIcon} />
                <MetricTile label={t('Total attempts')} value={String(quizzes.length)} tone="slate" icon={AcademicCapIcon} />
            </div>

            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm divide-y divide-slate-100">
                {quizzes.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">{t('No quiz submissions yet.')}</div>
                ) : (
                    quizzes.map(q => (
                        <div key={q.submissionId} className="p-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{q.quizTitle}</p>
                                <p className="text-xs text-slate-500 truncate">
                                    {q.subject}{q.submittedAt ? ` · ${new Date(q.submittedAt).toLocaleDateString()}` : ''}
                                </p>
                            </div>
                            <div className="text-right">
                                {q.percentage !== null && q.percentage !== undefined ? (
                                    <>
                                        <div className={`text-sm font-semibold ${Number(q.percentage) >= 75 ? 'text-emerald-600' : Number(q.percentage) >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {Number(q.percentage).toFixed(0)}%
                                        </div>
                                        <div className="text-xs text-slate-500">{q.score}/{q.totalMarks}</div>
                                    </>
                                ) : (
                                    <span className="inline-flex px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600">{q.status}</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// ─── Discipline tab (real fetch) ─────────────────────────────────────────────
const DisciplineTab: FC<{ matricule: string; disciplineFromDetails?: any }> = ({ matricule, disciplineFromDetails }) => {
    const { t } = useLanguage();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const data: any = await fetchChildDisciplinaryActions(matricule);
                setItems(Array.isArray(data) ? data : data?.items || []);
            } catch (e: any) {
                setError(e?.message || 'Failed to load discipline records.');
            } finally {
                setLoading(false);
            }
        })();
    }, [matricule]);

    // Merge with recent_issues from details (which have derived status)
    const recentFromDetails: any[] = disciplineFromDetails?.recentIssues || [];
    const total = disciplineFromDetails?.totalIssues ?? recentFromDetails.length;
    const resolved = recentFromDetails.filter(i => i.status === 'RESOLVED').length;
    const pending = Math.max(0, total - resolved);

    if (loading) {
        return (
            <div className="p-6 space-y-3">
                {[0, 1, 2].map(i => <div key={i} className="rounded-xl h-20 bg-slate-100 animate-pulse" />)}
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-slate-900">{t('Discipline & Behavior')}</h3>
                <p className="text-sm text-slate-500">{t('Track behavioral patterns and discipline records')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <MetricTile label={t('Total Issues')} value={String(total)} tone="slate" icon={ExclamationTriangleIcon} />
                <MetricTile label={t('Resolved')} value={String(resolved)} tone="emerald" icon={ClipboardDocumentListIcon} />
                <MetricTile label={t('Pending')} value={String(pending)} tone={pending > 0 ? 'amber' : 'emerald'} icon={ExclamationCircleIcon} />
            </div>

            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm">
                <div className="p-5 border-b border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-900">{t('Recent Discipline Records')}</h4>
                </div>
                {recentFromDetails.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">{t('No discipline issues recorded')}</div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {recentFromDetails.map((issue: any) => (
                            <li key={issue.id} className="p-4 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-900">
                                        {String(issue.type || '').replace(/_/g, ' ')}
                                    </p>
                                    <p className="text-sm text-slate-600 line-clamp-2">{issue.description}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {issue.dateOccurred ? new Date(issue.dateOccurred).toLocaleDateString() : ''}
                                    </p>
                                </div>
                                <span className={`shrink-0 inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                                    issue.status === 'RESOLVED'
                                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                                        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                                }`}>
                                    {issue.status}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {items.length > 0 && (
                <div className="rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <div className="p-5 border-b border-slate-100">
                        <h4 className="text-sm font-semibold text-slate-900">{t('Disciplinary Actions')}</h4>
                    </div>
                    <ul className="divide-y divide-slate-100">
                        {items.slice(0, 10).map((a: any) => (
                            <li key={a.id} className="p-4">
                                <p className="text-sm font-medium text-slate-900">{a.actionType || a.type || t('Action')}</p>
                                {a.reason && <p className="text-sm text-slate-600 mt-0.5">{a.reason}</p>}
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {error && <div className="text-sm text-rose-600">{error}</div>}
        </div>
    );
};

// ─── Analytics tab (link to full analytics) ──────────────────────────────────
const AnalyticsTab: FC = () => {
    const { t } = useLanguage();
    return (
        <div className="p-4 sm:p-6">
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-8 text-center">
                <ChartBarIcon className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-3 text-base font-semibold text-slate-900">{t('Full analytics for this child')}</h3>
                <p className="mt-1 text-sm text-slate-500">
                    {t('View trends, class comparisons and quiz breakdowns.')}
                </p>
                <Link href="/dashboard/parent-student/analytics">
                    <Button variant="outline" className="mt-5 rounded-full inline-flex items-center">
                        {t('Open Analytics')}
                        <ArrowRightIcon className="w-4 h-4 ml-1" />
                    </Button>
                </Link>
            </div>
        </div>
    );
};

// ─── Container ───────────────────────────────────────────────────────────────
export const ChildDetails: FC<ChildDetailsProps> = ({ childId, matricule: propMatricule, onBack }) => {
    const { t } = useLanguage();
    const [childData, setChildData] = useState<any>(null);
    const [matricule, setMatricule] = useState<string | null>(propMatricule ?? null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // If no matricule was passed, look up from local storage children list by id.
    useEffect(() => {
        if (propMatricule) { setMatricule(propMatricule); return; }
        if (typeof window === 'undefined') return;
        try {
            // Callers who don't pass matricule pass a numeric child id; we can't
            // resolve id → matricule without the dashboard payload. Fall back to
            // the active portal matricule.
            const raw = localStorage.getItem('parentPortal');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            setMatricule(parsed?.active || parsed?.matricules?.[0] || null);
        } catch { /* ignore */ }
    }, [propMatricule, childId]);

    const fetchData = useCallback(async () => {
        if (!matricule) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchChildDetails(matricule);
            setChildData(data);
        } catch (err: any) {
            setError(err?.message || t('Failed to fetch child details.'));
            toast.error(err?.message || 'Failed to fetch child details.');
        } finally {
            setIsLoading(false);
        }
    }, [matricule, t]);

    useEffect(() => {
        if (matricule) fetchData();
    }, [fetchData, matricule]);

    const tabs = matricule ? [
        { id: 'overview',   label: t('Overview'),   icon: HomeIcon,                     content: <OverviewTab childData={childData} /> },
        { id: 'fees',       label: t('Fees'),       icon: CurrencyDollarIcon,           content: <ParentStudentFeesPage studentId={childId} matricule={matricule} /> },
        { id: 'academics',  label: t('Academics'),  icon: AcademicCapIcon,              content: <ParentStudentResultsPage studentId={childId} matricule={matricule} /> },
        { id: 'quizzes',    label: t('Quizzes'),    icon: ClipboardDocumentListIcon,    content: <QuizzesTab matricule={matricule} /> },
        { id: 'discipline', label: t('Discipline'), icon: ExclamationTriangleIcon,      content: <DisciplineTab matricule={matricule} disciplineFromDetails={childData?.discipline} /> },
        { id: 'analytics',  label: t('Analytics'),  icon: ChartBarIcon,                 content: <AnalyticsTab /> },
    ] : [];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 p-6 space-y-4">
                <div className="rounded-2xl h-16 bg-slate-100 animate-pulse" />
                <div className="rounded-2xl h-64 bg-slate-100 animate-pulse" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-6">
                <div className="max-w-md w-full rounded-3xl bg-white shadow-sm border border-slate-100 p-8 text-center">
                    <ExclamationCircleIcon className="mx-auto h-12 w-12 text-rose-400" />
                    <h2 className="mt-4 text-lg font-semibold text-slate-900">{t('Failed to load child details')}</h2>
                    <p className="mt-1 text-sm text-slate-500">{error}</p>
                    <Button onClick={onBack} className="mt-6 rounded-full" variant="outline">{t('Go Back')}</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-100 px-3 sm:px-6 py-3 sm:py-4">
                <div className="max-w-6xl mx-auto flex items-center">
                    <Button variant="ghost" onClick={onBack} className="mr-1 sm:mr-3 shrink-0 px-2 rounded-full">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Button>
                    {childData?.photo ? (
                        <img src={childData.photo} alt={childData.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl object-cover mr-3 shrink-0 ring-1 ring-slate-100" />
                    ) : (
                        <UserCircleIcon className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mr-3 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 leading-tight truncate">{childData?.name}</h1>
                        <p className="text-xs sm:text-sm text-slate-500 truncate">
                            {childData?.classInfo?.className || t('Not enrolled')}
                            {childData?.classInfo?.subclassName ? ` · ${childData.classInfo.subclassName}` : ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex-1 overflow-hidden">
                <div className="max-w-6xl mx-auto">
                    <Tabs tabs={tabs} />
                </div>
            </div>
        </div>
    );
};
