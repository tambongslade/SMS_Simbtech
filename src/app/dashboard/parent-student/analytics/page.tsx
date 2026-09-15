'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/components/context/LanguageContext';
import {
    ChartBarIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    MinusSmallIcon,
    AcademicCapIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    SparklesIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { getChildAnalytics, ChildAnalytics } from '@/lib/parentChildApi';
import { getSavedMatricules, saveMatricules } from '../hooks/useParentDashboard';
import { useParentDashboard } from '../hooks/useParentDashboard';
import { SkeletonGrid, SkeletonCard } from '../components/Skeleton';
import { attendanceBand, gradeBand } from '../components/design';
import { toast } from 'react-hot-toast';

const TrendIcon = ({ trend }: { trend: string }) => {
    const t = (trend || '').toUpperCase();
    if (t.includes('IMPROV')) return <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-600" />;
    if (t.includes('DECLIN')) return <ArrowTrendingDownIcon className="w-4 h-4 text-rose-600" />;
    return <MinusSmallIcon className="w-4 h-4 text-slate-500" />;
};

const trendLabel = (trend: string) => {
    const t = (trend || '').toLowerCase();
    if (t.includes('improv')) return 'Improving';
    if (t.includes('declin')) return 'Declining';
    if (t.includes('insuff')) return 'Not enough data yet';
    if (t.includes('no data')) return 'No data yet';
    return 'Stable';
};

export default function ParentAnalyticsPage() {
    const { t } = useLanguage();
    const { data: dashboard, isLoading: childrenLoading } = useParentDashboard();
    const children = dashboard?.children ?? [];

    const [activeMatricule, setActiveMatricule] = useState<string>('');
    const [analytics, setAnalytics] = useState<ChildAnalytics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Pick the parent's saved active matricule or first child as default.
    useEffect(() => {
        if (activeMatricule) return;
        if (typeof window === 'undefined') return;
        try {
            const portal = JSON.parse(localStorage.getItem('parentPortal') || 'null');
            const saved = portal?.active as string | undefined;
            const first = children[0]?.matricule;
            const pick = saved || first || '';
            if (pick) setActiveMatricule(pick);
        } catch {
            const first = children[0]?.matricule;
            if (first) setActiveMatricule(first);
        }
    }, [children, activeMatricule]);

    // Load analytics whenever the active child changes.
    useEffect(() => {
        if (!activeMatricule) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getChildAnalytics(activeMatricule);
                if (!cancelled) setAnalytics(data);
            } catch (e: any) {
                if (!cancelled) {
                    setError(e?.message || 'Could not load analytics.');
                    setAnalytics(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [activeMatricule]);

    const overallAvg = useMemo(() => {
        const raw = analytics?.performanceAnalytics?.overall_average;
        const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? 0));
        return Number.isFinite(n) ? n : 0;
    }, [analytics]);

    const attendanceRate = useMemo(() => {
        const raw = analytics?.attendanceAnalytics?.overall_attendance_rate;
        const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? 0));
        return Number.isFinite(n) ? n : 0;
    }, [analytics]);

    const grade = gradeBand(overallAvg);
    const att = attendanceBand(attendanceRate);

    const handleChildChange = (m: string) => {
        setActiveMatricule(m);
        try {
            const list = getSavedMatricules();
            saveMatricules(list, m);
        } catch { /* localStorage best-effort */ }
    };

    if (childrenLoading) {
        return (
            <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
                <SkeletonGrid count={4} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SkeletonCard lines={4} />
                    <SkeletonCard lines={4} />
                </div>
            </div>
        );
    }

    if (children.length === 0) {
        return (
            <div className="max-w-3xl mx-auto p-8 text-center">
                <SparklesIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h2 className="text-xl font-semibold text-slate-800">{t('No children linked yet')}</h2>
                <p className="text-slate-500 mt-1">{t('Add a child from the Overview to see analytics.')}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
                {/* Header — child switcher (large tap targets, subtle chip style) */}
                <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-indigo-600">{t('Analytics')}</p>
                        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">{t('Performance overview')}</h1>
                        <p className="text-sm text-slate-500 mt-1">{t('Real-time academic, attendance and quiz insights.')}</p>
                    </div>
                    {children.length > 1 && (
                        <div className="flex flex-wrap gap-2">
                            {children.map(c => c.matricule && (
                                <button
                                    key={c.matricule}
                                    onClick={() => handleChildChange(c.matricule!)}
                                    className={`px-3.5 py-2 rounded-full text-sm font-medium transition-all
                                        ${activeMatricule === c.matricule
                                            ? 'bg-slate-900 text-white shadow-sm'
                                            : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300'}`}
                                >
                                    {c.name.split(' ')[0]}
                                </button>
                            ))}
                        </div>
                    )}
                </header>

                {loading && (
                    <>
                        <SkeletonGrid count={4} />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <SkeletonCard lines={5} />
                            <SkeletonCard lines={5} />
                        </div>
                    </>
                )}

                {error && !loading && (
                    <div className="rounded-2xl bg-rose-50 ring-1 ring-rose-200 p-5 flex items-start gap-3">
                        <ExclamationTriangleIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-rose-900">{t('Could not load analytics')}</p>
                            <p className="text-sm text-rose-700 mt-0.5">{error}</p>
                            <button
                                onClick={() => activeMatricule && setActiveMatricule(activeMatricule + '')}
                                className="mt-2 text-sm font-medium text-rose-700 hover:text-rose-900"
                            >
                                {t('Try again')}
                            </button>
                        </div>
                    </div>
                )}

                {analytics && !loading && (
                    <>
                        {/* Stat tiles — clean, elevated cards */}
                        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatTile
                                icon={<AcademicCapIcon className="w-5 h-5" />}
                                label={t('Overall average')}
                                value={`${overallAvg.toFixed(2)} / 20`}
                                pill={grade.label}
                                pillClassName={grade.className}
                            />
                            <StatTile
                                icon={<ChartBarIcon className="w-5 h-5" />}
                                label={t('Assessments')}
                                value={String(analytics.performanceAnalytics.total_assessments || 0)}
                                subtext={trendLabel(analytics.performanceAnalytics.improvement_trend)}
                                subIcon={<TrendIcon trend={analytics.performanceAnalytics.improvement_trend} />}
                            />
                            <StatTile
                                icon={<ClockIcon className="w-5 h-5" />}
                                label={t('Attendance rate')}
                                value={`${attendanceRate.toFixed(1)}%`}
                                pill={att.label}
                                pillClassName={att.className}
                            />
                            <StatTile
                                icon={<SparklesIcon className="w-5 h-5" />}
                                label={t('Quizzes')}
                                value={String(analytics.quizAnalytics.total_quizzes || 0)}
                                subtext={`${t('Avg')} ${Number(analytics.quizAnalytics.average_score || 0).toFixed(1)}%`}
                            />
                        </section>

                        {/* Strengths & areas for improvement */}
                        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Card title={t('Strengths')} accent="emerald">
                                {(analytics.performanceAnalytics.strengths?.length ?? 0) === 0 ? (
                                    <EmptyLine text={t('No strengths identified yet.')} />
                                ) : (
                                    <ul className="space-y-2.5">
                                        {analytics.performanceAnalytics.strengths?.map((s, i) => (
                                            <li key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="w-1.5 h-6 rounded-full bg-emerald-400" />
                                                    <span className="font-medium text-slate-800">{s.subject}</span>
                                                </div>
                                                <span className="text-emerald-700 font-semibold tabular-nums">{s.average} / 20</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Card>

                            <Card title={t('Focus areas')} accent="amber">
                                {(analytics.performanceAnalytics.areas_for_improvement?.length ?? 0) === 0 ? (
                                    <EmptyLine text={t('No focus areas at the moment.')} />
                                ) : (
                                    <ul className="space-y-3">
                                        {analytics.performanceAnalytics.areas_for_improvement?.map((s, i) => (
                                            <li key={i} className="pb-3 border-b border-slate-100 last:border-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-slate-800">{s.subject}</span>
                                                    <span className="text-amber-700 font-semibold tabular-nums">{s.average} / 20</span>
                                                </div>
                                                {s.recommendation && (
                                                    <p className="text-sm text-slate-500 mt-1">{s.recommendation}</p>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Card>
                        </section>

                        {/* Attendance trend */}
                        <section>
                            <Card title={t('Attendance by month')}>
                                {(analytics.attendanceAnalytics.monthly_trends?.length ?? 0) === 0 ? (
                                    <EmptyLine text={t('No attendance data yet for this year.')} />
                                ) : (
                                    <div className="flex items-end gap-2 h-40 pt-2 overflow-x-auto">
                                        {analytics.attendanceAnalytics.monthly_trends!.map((m, i) => {
                                            const rate = parseFloat(m.attendance_rate as any) || 0;
                                            const h = Math.max(4, Math.min(100, rate));
                                            return (
                                                <div key={i} className="flex flex-col items-center gap-1.5 min-w-[42px]">
                                                    <div className="w-8 relative flex items-end justify-center" style={{ height: '100%' }}>
                                                        <div
                                                            className="w-full rounded-t-lg bg-gradient-to-t from-indigo-500 to-indigo-400 transition-all"
                                                            style={{ height: `${h}%` }}
                                                            title={`${m.attendance_rate}%`}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-medium text-slate-500">{m.month}</span>
                                                    <span className="text-[10px] tabular-nums text-slate-700">{Math.round(rate)}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                    <MetricInline label={t('Class absences')} value={analytics.attendanceAnalytics.class_absences ?? 0} />
                                    <MetricInline label={t('Late arrivals')} value={analytics.attendanceAnalytics.morning_lateness ?? 0} />
                                    <MetricInline label={t('Excused')} value={analytics.attendanceAnalytics.excused_count ?? 0} tone="emerald" />
                                    <MetricInline label={t('Unexcused')} value={analytics.attendanceAnalytics.unexcused_count ?? 0} tone={analytics.attendanceAnalytics.at_risk ? 'rose' : 'slate'} />
                                </div>
                            </Card>
                        </section>

                        {/* Recent quizzes */}
                        {(analytics.quizAnalytics.recent_quizzes?.length ?? 0) > 0 && (
                            <section>
                                <Card title={t('Recent quizzes')}>
                                    <ul className="divide-y divide-slate-100">
                                        {analytics.quizAnalytics.recent_quizzes!.map((q, i) => (
                                            <li key={i} className="py-3 flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-slate-800">{q.quiz_title}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {q.subject}{q.date ? ` · ${q.date}` : ''}
                                                    </p>
                                                </div>
                                                <span className="tabular-nums font-semibold text-slate-700">{q.score ?? '—'}%</span>
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Small presentational primitives (kept local — one-page use) ─────────────

const StatTile = ({
    icon, label, value, pill, pillClassName, subtext, subIcon,
}: {
    icon: React.ReactNode; label: string; value: string;
    pill?: string; pillClassName?: string;
    subtext?: string; subIcon?: React.ReactNode;
}) => (
    <div className="group rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-sm hover:shadow-md hover:ring-slate-300 transition-all p-5">
        <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                {icon}
            </div>
            {pill && <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${pillClassName}`}>{pill}</span>}
        </div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
        {subtext && (
            <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                {subIcon} <span>{subtext}</span>
            </div>
        )}
    </div>
);

const Card = ({ title, accent, children }: { title: string; accent?: 'emerald' | 'amber'; children: React.ReactNode }) => (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center gap-2">
            {accent === 'emerald' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
            {accent === 'amber' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
            <h3 className="font-semibold text-slate-900">{title}</h3>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

const EmptyLine = ({ text }: { text: string }) => (
    <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
        <CheckCircleIcon className="w-4 h-4 text-slate-400" />
        {text}
    </div>
);

const MetricInline = ({ label, value, tone = 'slate' }: { label: string; value: number | string; tone?: 'slate' | 'emerald' | 'rose' }) => {
    const map = {
        slate: 'text-slate-800',
        emerald: 'text-emerald-700',
        rose: 'text-rose-700',
    } as const;
    return (
        <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`text-lg font-semibold tabular-nums ${map[tone]}`}>{value}</p>
        </div>
    );
};
