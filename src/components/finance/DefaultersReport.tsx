'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import {
    ExclamationTriangleIcon,
    PhoneIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardBody, StatsCard, Badge, Input, Select } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';
import { sortClassesByLevel } from '@/lib/classOrdering';

// GET /bursar/defaulters-report — students owing fees, with class and
// amount-range breakdowns. Available to BURSAR / SUPER_MANAGER / PRINCIPAL / MANAGER.

interface DefaulterStudent {
    studentId: number;
    studentName: string;
    matricule: string;
    className: string;
    subClassName: string;
    outstandingAmount: number;
    dueDate: string | null;
    daysOverdue: number;
    contactParentPhone?: string;
}

interface DefaultersReportData {
    totalDefaulters: number;
    totalOutstanding: number;
    byClass: { classId: number | null; className: string; defaultersCount: number; outstandingAmount: number }[];
    byAmountRange: { range: string; count: number; totalAmount: number }[];
    students: DefaulterStudent[];
}

const fetcher = (url: string) => apiService.get(url);

const formatMoney = (amount?: number | null) => `FCFA ${(amount ?? 0).toLocaleString()}`;

const overdueColor = (days: number): 'red' | 'yellow' | 'gray' => {
    if (days > 60) return 'red';
    if (days > 14) return 'yellow';
    return 'gray';
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

export default function DefaultersReport() {
    const { selectedAcademicYear } = useAuth();

    const [classFilter, setClassFilter] = useState('all');
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
    if (minAmount && Number(minAmount) > 0) params.set('minimumAmount', minAmount);
    if (showContacts) params.set('includeDetails', 'true');

    const { data: reportRes, error, isLoading } = useSWR<{ data?: DefaultersReportData }>(
        `/bursar/defaulters-report?${params.toString()}`,
        fetcher,
        { onError: (err) => { if (err?.message !== 'Unauthorized') toast.error('Failed to load defaulters report.'); } }
    );
    const report = reportRes?.data;

    const students = useMemo(() => {
        const list = report?.students ?? [];
        if (!search.trim()) return list;
        const q = search.trim().toLowerCase();
        return list.filter(s =>
            `${s.studentName} ${s.matricule} ${s.className} ${s.subClassName}`.toLowerCase().includes(q));
    }, [report, search]);

    const maxClassAmount = Math.max(0, ...(report?.byClass ?? []).map(c => c.outstandingAmount));
    const maxRangeAmount = Math.max(0, ...(report?.byAmountRange ?? []).map(r => r.totalAmount));

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Fee Defaulters</h1>
                <p className="text-gray-600">
                    Students with outstanding fees
                    {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}
                </p>
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

            {/* Breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
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
                <Card>
                    <CardHeader><CardTitle>Outstanding by Amount</CardTitle></CardHeader>
                    <CardBody className="space-y-3">
                        {(report?.byAmountRange?.length ?? 0) === 0 ? (
                            <p className="text-sm text-gray-500">{isLoading ? 'Loading…' : 'No data.'}</p>
                        ) : (
                            report!.byAmountRange.map((r) => (
                                <BarListRow
                                    key={r.range}
                                    label={`FCFA ${r.range} (${r.count})`}
                                    value={r.totalAmount}
                                    max={maxRangeAmount}
                                    display={formatMoney(r.totalAmount)}
                                />
                            ))
                        )}
                    </CardBody>
                </Card>
            </div>

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

            {/* Students */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Overdue</th>
                                {showContacts && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Contact</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={5} className="px-4 py-6 text-sm text-gray-400 text-center">Loading…</td></tr>
                            ) : students.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-6 text-sm text-gray-400 text-center">No defaulters found.</td></tr>
                            ) : students.map((s) => (
                                <tr key={s.studentId} className="hover:bg-gray-50">
                                    <td className="px-4 py-2.5">
                                        <p className="text-sm font-medium text-gray-900">{s.studentName}</p>
                                        <p className="text-xs text-gray-500">{s.matricule}</p>
                                    </td>
                                    <td className="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap">{s.className}{s.subClassName ? ` ${s.subClassName}` : ''}</td>
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
                    {isLoading ? (
                        <p className="p-4 text-sm text-gray-400 text-center">Loading…</p>
                    ) : students.length === 0 ? (
                        <p className="p-4 text-sm text-gray-400 text-center">No defaulters found.</p>
                    ) : students.map((s) => (
                        <div key={s.studentId} className="p-4 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 break-words">{s.studentName}</p>
                                    <p className="text-xs text-gray-500">{s.matricule} · {s.className}{s.subClassName ? ` ${s.subClassName}` : ''}</p>
                                </div>
                                <Badge color={overdueColor(s.daysOverdue)} size="sm">{s.daysOverdue}d</Badge>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs text-gray-500">Outstanding</span>
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

            {!isLoading && students.length > 0 && (
                <p className="text-xs text-gray-500">
                    {students.length.toLocaleString()} student{students.length === 1 ? '' : 's'} shown, sorted by highest outstanding first.
                </p>
            )}
        </div>
    );
}
