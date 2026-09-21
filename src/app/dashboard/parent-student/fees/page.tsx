'use client'

import { FC, useEffect, useState } from 'react';
import { useLanguage } from '@/components/context/LanguageContext';
import { useStudentFees } from '../hooks/useStudentFees';
import { Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';
import {
    CurrencyDollarIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    ExclamationCircleIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import { formatMoney, getActiveMatricule, getSavedMatricules, setActiveMatricule } from '@/lib/parentPortalApi';

interface ParentStudentFeesPageProps {
    studentId?: number;
    matricule?: string;
}

const urgencyStyles: Record<string, string> = {
    PAID:     'bg-emerald-50 text-emerald-700 ring-emerald-100',
    OK:       'bg-blue-50 text-blue-700 ring-blue-100',
    DUE_SOON: 'bg-amber-50 text-amber-700 ring-amber-100',
    OVERDUE:  'bg-rose-50 text-rose-700 ring-rose-100',
};

function StatTile({ label, value, tone, icon: Icon, sub }: { label: string; value: string; tone: 'blue' | 'emerald' | 'rose' | 'slate'; icon: any; sub?: string }) {
    const map: Record<string, string> = {
        blue: 'from-blue-50 text-blue-900',
        emerald: 'from-emerald-50 text-emerald-900',
        rose: 'from-rose-50 text-rose-900',
        slate: 'from-slate-50 text-slate-900',
    };
    return (
        <div className={`rounded-2xl border border-slate-100 shadow-sm bg-gradient-to-br ${map[tone]} to-white p-5`}>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-slate-500">
                <Icon className="w-4 h-4" />
                {label}
            </div>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
            {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
        </div>
    );
}

const ParentStudentFeesPage: FC<ParentStudentFeesPageProps> = ({ matricule: propMatricule }) => {
    const { t } = useLanguage();
    const [matricule, setMatricule] = useState<string | null>(propMatricule ?? null);
    const [availableMatricules, setAvailableMatricules] = useState<string[]>([]);

    useEffect(() => {
        if (propMatricule) return;
        const saved = getSavedMatricules();
        setAvailableMatricules(saved);
        setMatricule(getActiveMatricule() || saved[0] || null);
    }, [propMatricule]);

    const { data, isLoading, error, refetch } = useStudentFees(matricule);

    const handleSwitch = (m: string) => {
        setActiveMatricule(m);
        setMatricule(m);
    };

    if (!matricule) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-6">
                <div className="max-w-md w-full rounded-3xl bg-white shadow-sm border border-slate-100 p-8 text-center">
                    <CurrencyDollarIcon className="mx-auto h-12 w-12 text-slate-300" />
                    <h2 className="mt-4 text-lg font-semibold text-slate-900">{t('No child selected')}</h2>
                    <p className="mt-1 text-sm text-slate-500">{t('Add a child from the overview page to see fees.')}</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-4">
                <div className="rounded-3xl h-24 bg-slate-100 animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[0, 1, 2].map(i => <div key={i} className="rounded-2xl h-32 bg-slate-100 animate-pulse" />)}
                </div>
                <div className="rounded-2xl h-64 bg-slate-100 animate-pulse" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-6">
                <div className="max-w-md w-full rounded-3xl bg-white shadow-sm border border-slate-100 p-8 text-center">
                    <ExclamationCircleIcon className="mx-auto h-12 w-12 text-rose-400" />
                    <h2 className="mt-4 text-lg font-semibold text-slate-900">{t('Error loading fees')}</h2>
                    <p className="mt-1 text-sm text-slate-500">{error}</p>
                    <Button onClick={refetch} className="mt-6 rounded-full inline-flex items-center" variant="outline">
                        <ArrowPathIcon className="w-4 h-4 mr-2" />
                        {t('Try Again')}
                    </Button>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-6">
                <div className="max-w-md w-full rounded-3xl bg-white shadow-sm border border-slate-100 p-8 text-center">
                    <CurrencyDollarIcon className="mx-auto h-12 w-12 text-slate-300" />
                    <h2 className="mt-4 text-lg font-semibold text-slate-900">{t('No fee records')}</h2>
                    <p className="mt-1 text-sm text-slate-500">{t('No fee records found for this student.')}</p>
                </div>
            </div>
        );
    }

    const {
        totalExpected,
        totalPaid,
        outstandingBalance,
        urgency,
        daysOverdue,
        dueDate,
        paymentHistory,
        outstandingFees,
        items,
    } = data;

    const paidPct = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
                {/* Header */}
                <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6 sm:p-8">
                    <div className="flex flex-wrap justify-between items-start gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">{t('School Fees')}</p>
                            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{data.studentName}</h1>
                            <p className="mt-1 text-sm text-slate-500">{t('Matricule')}: {data.matricule}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            {urgency && (
                                <span className={`inline-flex items-center gap-1 rounded-full ring-1 ${urgencyStyles[urgency]} px-3 py-1 text-xs font-medium`}>
                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                    {urgency === 'PAID' ? t('Fully paid') :
                                     urgency === 'OK' ? t('Up to date') :
                                     urgency === 'DUE_SOON' ? t('Due soon') :
                                     t('Overdue')}
                                    {daysOverdue ? ` · ${daysOverdue} ${t('days')}` : ''}
                                </span>
                            )}
                            {availableMatricules.length > 1 && availableMatricules.map(m => (
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
                    </div>

                    {/* Progress bar */}
                    <div className="mt-6">
                        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                            <span>{t('Paid')} · {formatMoney(totalPaid)}</span>
                            <span>{t('Expected')} · {formatMoney(totalExpected)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                                style={{ width: `${Math.max(0, Math.min(100, paidPct))}%` }}
                            />
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{paidPct.toFixed(1)}% {t('paid')}</div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <StatTile label={t('Total Fees')} value={formatMoney(totalExpected)} tone="blue" icon={CurrencyDollarIcon} />
                    <StatTile label={t('Total Paid')} value={formatMoney(totalPaid)} tone="emerald" icon={CheckCircleIcon} />
                    <StatTile
                        label={t('Outstanding')}
                        value={formatMoney(outstandingBalance)}
                        tone={outstandingBalance > 0 ? 'rose' : 'emerald'}
                        icon={ExclamationTriangleIcon}
                        sub={dueDate ? `${t('Due')} ${new Date(dueDate).toLocaleDateString()}` : undefined}
                    />
                </div>

                {/* Fee items breakdown */}
                {items && items.length > 0 && (
                    <Card className="rounded-2xl border border-slate-100 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-slate-900">{t('Fee breakdown')}</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <ul className="divide-y divide-slate-100">
                                {items.map(it => {
                                    const pct = it.amountExpected > 0 ? (it.amountPaid / it.amountExpected) * 100 : 100;
                                    return (
                                        <li key={it.id} className="py-4">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-900">{it.name}</p>
                                                    {it.description && <p className="text-xs text-slate-500">{it.description}</p>}
                                                </div>
                                                <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${
                                                    it.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' :
                                                    it.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 ring-amber-100' :
                                                    'bg-rose-50 text-rose-700 ring-rose-100'
                                                }`}>
                                                    {it.status}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex items-center gap-3">
                                                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                    <div className="h-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                                                </div>
                                                <span className="text-xs tabular-nums text-slate-600 shrink-0">
                                                    {formatMoney(it.amountPaid)} / {formatMoney(it.amountExpected)}
                                                </span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </CardBody>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="rounded-2xl border border-slate-100 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-slate-900 flex items-center gap-2">
                                <ClockIcon className="w-5 h-5 text-slate-400" />
                                {t('Payment History')}
                            </CardTitle>
                        </CardHeader>
                        <CardBody>
                            {paymentHistory.length === 0 ? (
                                <div className="text-center py-8 text-sm text-slate-500">{t('No payments yet.')}</div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {paymentHistory.map(p => (
                                        <li key={p.id} className="py-3 flex justify-between items-center">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-900">{formatMoney(p.amount)}</p>
                                                <p className="text-xs text-slate-500">
                                                    {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : ''}
                                                    {p.paymentMethod ? ` · ${p.paymentMethod}` : ''}
                                                </p>
                                            </div>
                                            {p.receiptNumber && (
                                                <span className="shrink-0 text-xs text-slate-400 font-mono">#{p.receiptNumber}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardBody>
                    </Card>

                    <Card className="rounded-2xl border border-slate-100 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-slate-900">{t('Outstanding')}</CardTitle>
                        </CardHeader>
                        <CardBody>
                            {outstandingFees.length === 0 ? (
                                <div className="text-center py-8">
                                    <CheckCircleIcon className="mx-auto h-10 w-10 text-emerald-400" />
                                    <p className="mt-2 text-sm font-medium text-slate-900">{t('All paid up!')}</p>
                                    <p className="text-xs text-slate-500">{t('No outstanding balances.')}</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {outstandingFees.map(f => (
                                        <li key={f.id} className="py-3 flex justify-between items-center">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-900">{f.feeType}</p>
                                                {f.dueDate && (
                                                    <p className="text-xs text-slate-500">
                                                        {t('Due')} {new Date(f.dueDate).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="shrink-0 text-sm font-semibold text-rose-600 tabular-nums">
                                                {formatMoney(f.amountDue)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ParentStudentFeesPage;
