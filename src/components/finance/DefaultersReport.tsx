'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import {
    ExclamationTriangleIcon,
    PhoneIcon,
    MagnifyingGlassIcon,
    ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardBody, StatsCard, Badge, Input, Select, Button } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';
import { sortClassesByLevel } from '@/lib/classOrdering';
import { saveBlob } from '@/lib/downloadFile';

// GET /bursar/defaulters-report — students owing fees, with a per-class
// breakdown and a per-installment breakdown per student. Available to
// BURSAR / SUPER_MANAGER / PRINCIPAL / MANAGER.

type InstallmentKey = 'first' | 'second' | 'third';

interface InstallmentAmount {
    expected: number;
    paid: number;
    outstanding: number;
}

interface DefaulterStudent {
    studentId: number;
    studentName: string;
    matricule: string;
    classId: number | null;
    className: string;
    subClassName: string;
    outstandingAmount: number;
    installments: Record<InstallmentKey, InstallmentAmount>;
    dueDate: string | null;
    daysOverdue: number;
    contactParentPhone?: string;
}

interface DefaultersReportData {
    totalDefaulters: number;
    totalOutstanding: number;
    byClass: { classId: number | null; className: string; defaultersCount: number; outstandingAmount: number }[];
    students: DefaulterStudent[];
}

const fetcher = (url: string) => apiService.get(url);

const formatMoney = (amount?: number | null) => `FCFA ${(amount ?? 0).toLocaleString()}`;

const overdueColor = (days: number): 'red' | 'yellow' | 'gray' => {
    if (days > 60) return 'red';
    if (days > 14) return 'yellow';
    return 'gray';
};

const INSTALLMENT_OPTIONS: { value: 'all' | InstallmentKey; label: string }[] = [
    { value: 'all', label: 'All Installments' },
    { value: 'first', label: '1st Installment' },
    { value: 'second', label: '2nd Installment' },
    { value: 'third', label: '3rd Installment' },
];

const INSTALLMENT_SHORT_LABEL: Record<InstallmentKey, string> = {
    first: '1st',
    second: '2nd',
    third: '3rd',
};

function BarListRow({ label, value, max, display }: { label: string; value: number; max: number; display: string }) {
    const width = max > 0 ? Math.max(2, (value / max) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-sm text-gray-600 truncate" title={label}>{label}</span>
            <div className="flex-1 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-red-500" style={{ width: `${width}%` }} />
            </div>
            <span className="w-36 text-right text-sm font-medium text-gray-900 truncate">{display}</span>
        </div>
    );
}

// Per-installment owing as a compact set of badges, e.g. "1st 25,000  2nd 30,000".
// An installment with nothing outstanding is left out entirely rather than
// shown as a zero -- with all three filtered to "all", most rows only owe on
// one or two of them, and printing every zero would bury the signal.
function InstallmentBadges({ installments }: { installments: Record<InstallmentKey, InstallmentAmount> }) {
    const owed = (['first', 'second', 'third'] as InstallmentKey[]).filter(k => installments[k].outstanding > 0);
    if (owed.length === 0) return <span className="text-gray-400">—</span>;
    return (
        <div className="flex flex-wrap gap-1">
            {owed.map(k => (
                <span
                    key={k}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700"
                    title={`${INSTALLMENT_SHORT_LABEL[k]} installment`}
                >
                    {INSTALLMENT_SHORT_LABEL[k]} {formatMoney(installments[k].outstanding)}
                </span>
            ))}
        </div>
    );
}

export default function DefaultersReport() {
    const { selectedAcademicYear } = useAuth();

    const [classFilter, setClassFilter] = useState('all');
    const [installmentFilter, setInstallmentFilter] = useState<'all' | InstallmentKey>('all');
    const [minAmount, setMinAmount] = useState('');
    const [search, setSearch] = useState('');
    const [showContacts, setShowContacts] = useState(true);

    const { data: classesResult } = useSWR<{ data: { id: number; name: string }[] }>('/classes', fetcher);
    const classOptions = useMemo(() => ([
        { value: 'all', label: 'All Classes' },
        ...sortClassesByLevel(classesResult?.data ?? []).map(c => ({ value: String(c.id), label: c.name })),
    ]), [classesResult]);

    const params = new URLSearchParams();
    if (selectedAcademicYear?.id) params.set('academicYearId', String(selectedAcademicYear.id));
    if (classFilter !== 'all') params.set('classId', classFilter);
    if (installmentFilter !== 'all') params.set('installment', installmentFilter);
    if (minAmount && Number(minAmount) > 0) params.set('minimumAmount', minAmount);
    if (showContacts) params.set('includeDetails', 'true');

    const { data: reportRes, error, isLoading } = useSWR<{ data?: DefaultersReportData }>(
        `/bursar/defaulters-report?${params.toString()}`,
        fetcher,
        { onError: (err) => { if (err?.message !== 'Unauthorized') toast.error('Failed to load defaulters report.'); } }
    );
    const report = reportRes?.data;

    const filteredStudents = useMemo(() => {
        const list = report?.students ?? [];
        if (!search.trim()) return list;
        const q = search.trim().toLowerCase();
        return list.filter(s =>
            `${s.studentName} ${s.matricule} ${s.className} ${s.subClassName}`.toLowerCase().includes(q));
    }, [report, search]);

    // Grouped by class, in the order the backend already sorted them (class
    // name, then highest outstanding within it) -- matches the request to
    // have the list sorted per class rather than one flat ranking.
    const groupedByClass = useMemo(() => {
        const groups: { classId: number | null; className: string; students: DefaulterStudent[] }[] = [];
        const byKey = new Map<string, { classId: number | null; className: string; students: DefaulterStudent[] }>();
        for (const s of filteredStudents) {
            const key = String(s.classId ?? `name:${s.className}`);
            let g = byKey.get(key);
            if (!g) {
                g = { classId: s.classId, className: s.className, students: [] };
                byKey.set(key, g);
                groups.push(g);
            }
            g.students.push(s);
        }
        return groups;
    }, [filteredStudents]);

    const maxClassAmount = Math.max(0, ...(report?.byClass ?? []).map(c => c.outstandingAmount));

    const exportCsv = () => {
        if (filteredStudents.length === 0) {
            toast.error('Nothing to export.');
            return;
        }
        // RFC-4180 style escape: wrap in quotes, double any internal quote.
        const csvCell = (v: string | number | null | undefined) => {
            const s = v == null ? '' : String(v);
            return `"${s.replace(/"/g, '""')}"`;
        };
        const header = [
            'Student', 'Matricule', 'Class', 'Subclass',
            '1st Installment Owing', '2nd Installment Owing', '3rd Installment Owing',
            'Total Outstanding (FCFA)', 'Days Overdue', 'Due Date',
        ];
        if (showContacts) header.push('Parent Phone');
        const lines = filteredStudents.map(s => {
            const row: (string | number)[] = [
                s.studentName,
                s.matricule,
                s.className,
                s.subClassName ?? '',
                s.installments.first.outstanding,
                s.installments.second.outstanding,
                s.installments.third.outstanding,
                s.outstandingAmount ?? 0,
                s.daysOverdue,
                s.dueDate ? new Date(s.dueDate).toISOString().slice(0, 10) : '',
            ];
            if (showContacts) row.push(s.contactParentPhone ?? '');
            return row.map(csvCell).join(',');
        });
        // BOM keeps Excel from mangling FCFA / accented names.
        const blob = new Blob(['﻿' + [header.map(csvCell).join(','), ...lines].join('\n')], {
            type: 'text/csv;charset=utf-8;',
        });
        const yearSlug = (selectedAcademicYear?.name || 'year').replace(/\s+/g, '-');
        const dateSlug = new Date().toISOString().slice(0, 10);
        saveBlob(blob, `fee-defaulters-${yearSlug}-${dateSlug}.csv`);
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Fee Defaulters</h1>
                    <p className="text-gray-600">
                        Students with outstanding fees
                        {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}
                    </p>
                </div>
                <Button
                    variant="outline"
                    leftIcon={ArrowDownTrayIcon}
                    onClick={exportCsv}
                    disabled={isLoading || filteredStudents.length === 0}
                >
                    Export CSV
                </Button>
            </div>

            {error && error.message !== 'Unauthorized' && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
                    Could not load the defaulters report. Please try again.
                </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 sm:gap-6">
                <StatsCard
                    title="Students Owing"
                    value={isLoading ? '...' : (report?.totalDefaulters ?? 0).toLocaleString()}
                    icon={ExclamationTriangleIcon}
                    color="warning"
                />
                <StatsCard
                    title="Total Outstanding"
                    value={isLoading ? '...' : formatMoney(report?.totalOutstanding)}
                    icon={ExclamationTriangleIcon}
                    color="danger"
                />
            </div>

            {/* Breakdown */}
            <Card>
                <CardHeader><CardTitle>Outstanding by Class</CardTitle></CardHeader>
                <CardBody className="space-y-3">
                    {(report?.byClass?.length ?? 0) === 0 ? (
                        <p className="text-sm text-gray-500">{isLoading ? 'Loading…' : 'No defaulters. 🎉'}</p>
                    ) : (
                        report!.byClass.map((c) => (
                            <BarListRow
                                key={c.classId ?? c.className}
                                label={`${c.className} (${c.defaultersCount})`}
                                value={c.outstandingAmount}
                                max={maxClassAmount}
                                display={formatMoney(c.outstandingAmount)}
                            />
                        ))
                    )}
                </CardBody>
            </Card>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end">
                <div className="flex-1 min-w-[200px]">
                    <Input
                        placeholder="Search by name, matricule or class..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        leftIcon={<MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />}
                    />
                </div>
                <div className="sm:w-48">
                    <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} options={classOptions} />
                </div>
                <div className="sm:w-48">
                    <Select
                        value={installmentFilter}
                        onChange={(e) => setInstallmentFilter(e.target.value as 'all' | InstallmentKey)}
                        options={INSTALLMENT_OPTIONS}
                    />
                </div>
                <div className="sm:w-44">
                    <Input
                        type="number"
                        min="0"
                        placeholder="Min amount (FCFA)"
                        value={minAmount}
                        onChange={(e) => setMinAmount(e.target.value)}
                    />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 select-none pb-2">
                    <input
                        type="checkbox"
                        checked={showContacts}
                        onChange={(e) => setShowContacts(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    Parent contacts
                </label>
            </div>

            {/* Students, grouped by class */}
            {isLoading ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 text-sm text-gray-400 text-center">
                    Loading…
                </div>
            ) : groupedByClass.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 text-sm text-gray-400 text-center">
                    No defaulters found.
                </div>
            ) : (
                <div className="space-y-4">
                    {groupedByClass.map((group) => (
                        <div key={group.classId ?? group.className} className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <h2 className="text-base font-bold text-gray-900">{group.className}</h2>
                                <span className="text-xs text-gray-500">
                                    {group.students.length} student{group.students.length === 1 ? '' : 's'}
                                </span>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                                {/* Desktop table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owing by Installment</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Outstanding</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Overdue</th>
                                                {showContacts && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Contact</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {group.students.map((s) => (
                                                <tr key={s.studentId} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2.5">
                                                        <p className="text-sm font-medium text-gray-900">{s.studentName}</p>
                                                        <p className="text-xs text-gray-500">{s.matricule}{s.subClassName ? ` · ${s.subClassName}` : ''}</p>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <InstallmentBadges installments={s.installments} />
                                                    </td>
                                                    <td className="px-4 py-2.5 text-sm font-semibold text-red-700 text-right whitespace-nowrap">{formatMoney(s.outstandingAmount)}</td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <Badge color={overdueColor(s.daysOverdue)} size="sm">{s.daysOverdue}d</Badge>
                                                    </td>
                                                    {showContacts && (
                                                        <td className="px-4 py-2.5 text-sm whitespace-nowrap">
                                                            {s.contactParentPhone ? (
                                                                <a href={`tel:${s.contactParentPhone}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800">
                                                                    <PhoneIcon className="w-3.5 h-3.5" />{s.contactParentPhone}
                                                                </a>
                                                            ) : <span className="text-gray-400">—</span>}
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile cards */}
                                <div className="md:hidden divide-y divide-gray-100">
                                    {group.students.map((s) => (
                                        <div key={s.studentId} className="p-4 space-y-1.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 break-words">{s.studentName}</p>
                                                    <p className="text-xs text-gray-500">{s.matricule}{s.subClassName ? ` · ${s.subClassName}` : ''}</p>
                                                </div>
                                                <Badge color={overdueColor(s.daysOverdue)} size="sm">{s.daysOverdue}d</Badge>
                                            </div>
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-xs text-gray-500 pt-0.5">Owing by installment</span>
                                                <InstallmentBadges installments={s.installments} />
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs text-gray-500">Total Outstanding</span>
                                                <span className="text-sm font-semibold text-red-700">{formatMoney(s.outstandingAmount)}</span>
                                            </div>
                                            {showContacts && s.contactParentPhone && (
                                                <a href={`tel:${s.contactParentPhone}`} className="inline-flex items-center gap-1.5 text-sm text-blue-600">
                                                    <PhoneIcon className="w-4 h-4" />{s.contactParentPhone}
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && filteredStudents.length > 0 && (
                <p className="text-xs text-gray-500">
                    {filteredStudents.length.toLocaleString()} student{filteredStudents.length === 1 ? '' : 's'} shown, grouped by class.
                </p>
            )}
        </div>
    );
}
