'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { sortClassesByLevel } from '@/lib/classOrdering';
import {
    BanknotesIcon,
    CurrencyDollarIcon,
    PrinterIcon,
    ReceiptPercentIcon,
    ReceiptRefundIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardBody, StatsCard, Badge } from '@/components/ui';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';
import { getExpenditureSummary, CATEGORY_LABELS, ExpenditureSummary } from '@/lib/expendituresApi';

// ── GET /dashboard/financial-overview ──
// Actual shape: { schoolOverview: { totalExpected, totalCollected,
// collectionRate, totalAccounts }, detailedFinancials: { studentsOwingCount,
// totalAmountOwed, recentPayments[] }, paymentAnalytics:
// { paymentMethodBreakdown[], totalTransactions, totalAmount } }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FinancialOverviewResponse = Record<string, any>;

interface RecentPayment {
    id: number;
    amount: number;
    paymentMethod?: string;
    paymentDate?: string;
    receiptNumber?: string;
    studentName?: string;
    studentMatricule?: string;
}

interface ClassFeeReport {
    classId: string;
    className: string;
    totalStudents: number;
    totalExpected: number;
    totalCollected: number;
    outstanding: number;
    collectionRate: number;
}

const formatCurrency = (amount?: number | null) =>
    `FCFA ${(amount ?? 0).toLocaleString()}`;

const formatLabel = (value: string) =>
    value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const collectionRateColor = (rate: number): 'green' | 'yellow' | 'red' => {
    if (rate >= 90) return 'green';
    if (rate >= 75) return 'yellow';
    return 'red';
};

const fetcher = (url: string) => apiService.get(url);

// Pull every fee record for the year (paged) to build the per-class table
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchAllFees = async (academicYearId: number): Promise<any[]> => {
    const limit = 500;
    const maxPages = 20;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let records: any[] = [];
    for (let page = 1; page <= maxPages; page++) {
        const res = await apiService.get(`/fees?academicYearId=${academicYearId}&page=${page}&limit=${limit}`);
        const batch = res?.data?.data ?? [];
        records = records.concat(batch);
        const total = res?.data?.meta?.total ?? records.length;
        if (batch.length === 0 || records.length >= total) break;
    }
    return records;
};

function ProgressBar({ rate }: { rate: number }) {
    const clamped = Math.min(100, Math.max(0, rate));
    return (
        <div className="h-2 w-full rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${clamped}%` }} />
        </div>
    );
}

function BarListRow({ label, value, max, display }: { label: string; value: number; max: number; display?: string }) {
    const width = max > 0 ? Math.max(2, (value / max) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-sm text-gray-600 truncate" title={label}>{label}</span>
            <div className="flex-1 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${width}%` }} />
            </div>
            <span className="w-32 text-right text-sm font-medium text-gray-900 truncate">{display ?? value}</span>
        </div>
    );
}

export default function ManagerFinancialReportsPage() {
    const { selectedAcademicYear } = useAuth();

    // Fall back to the current academic year when none is selected in the sidebar
    const { data: yearsResult } = useSWR<{ data: { id: number; name: string; isCurrent: boolean }[] }>(
        selectedAcademicYear ? null : '/academic-years',
        fetcher
    );
    const effectiveYear = selectedAcademicYear ?? yearsResult?.data?.find(y => y.isCurrent) ?? null;
    const yearParam = effectiveYear?.id ? `?academicYearId=${effectiveYear.id}` : '';

    // Financial overview — mapped tolerantly from the nested backend shape
    const { data: overviewRes, error: overviewError, isLoading: isLoadingOverview } = useSWR<{ data?: FinancialOverviewResponse }>(
        `/dashboard/financial-overview${yearParam}`,
        fetcher,
        { onError: (err) => { if (err?.message !== 'Unauthorized') toast.error('Failed to load financial overview'); } }
    );
    const overview = useMemo(() => {
        const raw = overviewRes?.data;
        if (!raw) return null;
        const so = raw.schoolOverview ?? raw;
        const df = raw.detailedFinancials ?? {};
        const pa = raw.paymentAnalytics ?? {};
        const collected = so.totalCollected ?? raw.collected ?? 0;
        const expected = so.totalExpected ?? raw.expected ?? 0;
        return {
            collected,
            expected,
            outstanding: df.totalAmountOwed ?? raw.outstanding ?? Math.max(0, expected - collected),
            collectionRate: so.collectionRate ?? raw.collectionRate ?? (expected > 0 ? (collected / expected) * 100 : 0),
            studentsOwing: df.studentsOwingCount ?? null,
            totalAccounts: so.totalAccounts ?? df.totalAccounts ?? null,
            totalTransactions: pa.totalTransactions ?? null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            byMethod: (pa.paymentMethodBreakdown ?? raw.byMethod ?? []).map((m: any) => ({
                method: m.method,
                amount: m.totalAmount ?? m.amount ?? 0,
                count: m.transactionCount ?? null,
            })) as { method: string; amount: number; count: number | null }[],
            recentPayments: (df.recentPayments ?? []) as RecentPayment[],
        };
    }, [overviewRes]);

    // This month's expenditures by category
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: expenditureSummary } = useSWR<ExpenditureSummary>(
        ['expenditure-summary', currentMonth],
        () => getExpenditureSummary(currentMonth),
        { onError: () => { /* section simply stays empty */ } }
    );

    // Classes for name lookups and the export filter. Fee records usually carry
    // only enrollment.classId / subClassId, so names are resolved from here.
    const { data: classesResult } = useSWR<{ data: { id: number; name: string; subClasses?: { id: number; classId: number }[] }[] }>('/classes', fetcher);
    const classNameById = useMemo(() => {
        const map = new Map<number, string>();
        (classesResult?.data ?? []).forEach(c => map.set(c.id, c.name));
        return map;
    }, [classesResult]);
    const classIdBySubClassId = useMemo(() => {
        const map = new Map<number, number>();
        (classesResult?.data ?? []).forEach(c => (c.subClasses ?? []).forEach(sc => map.set(sc.id, c.id)));
        return map;
    }, [classesResult]);

    // Per-class fee collection, aggregated from fee records
    const { data: feeRecords, isLoading: isLoadingFees } = useSWR(
        effectiveYear?.id ? ['manager-fee-records', effectiveYear.id] : null,
        ([, yearId]) => fetchAllFees(yearId as number)
    );

    const classReports = useMemo<ClassFeeReport[]>(() => {
        const byClass = new Map<string, ClassFeeReport>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (feeRecords ?? []).forEach((record: any) => {
            const enr = record.enrollment ?? {};
            let cid: number | null = enr.classId ?? enr.class?.id ?? null;
            if (cid == null && enr.subClassId != null) cid = classIdBySubClassId.get(Number(enr.subClassId)) ?? null;
            if (cid == null && enr.subClass?.classId != null) cid = enr.subClass.classId;
            const classId = cid != null ? String(cid) : 'unknown';
            const className = enr.class?.name
                || (cid != null ? classNameById.get(Number(cid)) : undefined)
                || 'Unassigned';
            let agg = byClass.get(classId);
            if (!agg) {
                agg = { classId, className, totalStudents: 0, totalExpected: 0, totalCollected: 0, outstanding: 0, collectionRate: 0 };
                byClass.set(classId, agg);
            }
            const expected = record.amountExpected || 0;
            const paid = record.amountPaid || 0;
            agg.totalStudents += 1;
            agg.totalExpected += expected;
            agg.totalCollected += paid;
            agg.outstanding += Math.max(0, expected - paid);
        });
        // Classes with no fee records at all still get a zero-row, so nothing
        // silently disappears from the report.
        classNameById.forEach((name, id) => {
            const key = String(id);
            if (!byClass.has(key)) {
                byClass.set(key, { classId: key, className: name, totalStudents: 0, totalExpected: 0, totalCollected: 0, outstanding: 0, collectionRate: 0 });
            }
        });
        return Array.from(byClass.values())
            .map(agg => ({
                ...agg,
                collectionRate: agg.totalExpected > 0 ? (agg.totalCollected / agg.totalExpected) * 100 : 0,
            }))
            .sort((a, b) => b.outstanding - a.outstanding || b.totalExpected - a.totalExpected);
    }, [feeRecords, classNameById, classIdBySubClassId]);

    // Classes for the export filter
    const classes = useMemo(
        () => sortClassesByLevel(classesResult?.data || []),
        [classesResult]
    );

    // ── Export panel state ──
    const [reportType, setReportType] = useState<'summary' | 'detailed' | 'analytics'>('detailed');
    const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'pdf' | 'docx'>('xlsx');
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [isExporting, setIsExporting] = useState(false);

    const generateReport = async () => {
        if (!effectiveYear?.id) {
            toast.error('No academic year available.');
            return;
        }
        setIsExporting(true);
        try {
            const params = new URLSearchParams({
                reportType,
                format: exportFormat,
                academicYearId: String(effectiveYear.id),
            });
            if (selectedClass !== 'all') params.append('classId', selectedClass);

            const blob = await apiService.get(`/fees/export?${params.toString()}`, {}, 'blob');
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const reportTypeNames = { summary: 'Fee-Summary', detailed: 'Detailed-Fees', analytics: 'Payment-Analytics' };
            link.download = `${reportTypeNames[reportType]}_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success(`${reportTypeNames[reportType]} exported as ${exportFormat.toUpperCase()}`);
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export report. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const maxMethodAmount = Math.max(0, ...(overview?.byMethod ?? []).map(m => m.amount));
    const maxCategoryAmount = Math.max(0, ...(expenditureSummary?.byCategory ?? []).map(c => c.amount));

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
                <p className="text-gray-600">
                    Live financial position
                    {effectiveYear ? ` · ${effectiveYear.name}` : ''}
                </p>
            </div>

            {overviewError && overviewError.message !== 'Unauthorized' && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline"> Failed to load financial data. Please try again.</span>
                </div>
            )}

            {/* Overview cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <StatsCard title="Fees Collected" value={isLoadingOverview ? '...' : formatCurrency(overview?.collected)} icon={BanknotesIcon} color="success" />
                <StatsCard title="Outstanding Fees" value={isLoadingOverview ? '...' : formatCurrency(overview?.outstanding)} icon={CurrencyDollarIcon} color="danger" />
                <StatsCard
                    title="Students Owing"
                    value={isLoadingOverview ? '...' : overview?.studentsOwing != null
                        ? `${overview.studentsOwing.toLocaleString()}${overview.totalAccounts ? ` / ${overview.totalAccounts.toLocaleString()}` : ''}`
                        : '—'}
                    icon={ReceiptPercentIcon}
                    color="warning"
                />
                <StatsCard title="Spent This Month" value={formatCurrency(expenditureSummary?.totalAmount)} icon={ReceiptRefundIcon} color="primary" />
            </div>

            {/* Collection rate */}
            <Card>
                <CardBody>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-gray-500">
                            Collection rate · {formatCurrency(overview?.collected)} of {formatCurrency(overview?.expected)} expected
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{(overview?.collectionRate ?? 0).toFixed(1)}%</span>
                    </div>
                    <div className="mt-2">
                        <ProgressBar rate={overview?.collectionRate ?? 0} />
                    </div>
                </CardBody>
            </Card>

            {/* Recent payments + method breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Payments</CardTitle>
                    </CardHeader>
                    <CardBody>
                        {(overview?.recentPayments?.length ?? 0) === 0 ? (
                            <p className="text-sm text-gray-500">{isLoadingOverview ? 'Loading…' : 'No recent payments.'}</p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {overview!.recentPayments.slice(0, 8).map((p) => (
                                    <li key={p.id} className="py-2 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{p.studentName || p.studentMatricule || 'Unknown student'}</p>
                                            <p className="text-[11px] text-gray-500 truncate">
                                                {p.paymentMethod ? formatLabel(p.paymentMethod) : ''}
                                                {p.paymentDate ? ` · ${new Date(p.paymentDate).toLocaleDateString()}` : ''}
                                                {p.receiptNumber ? ` · ${p.receiptNumber}` : ''}
                                            </p>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900 shrink-0">{formatCurrency(p.amount)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Collections by Payment Method</CardTitle>
                    </CardHeader>
                    <CardBody className="space-y-2">
                        {(overview?.byMethod?.length ?? 0) === 0 ? (
                            <p className="text-sm text-gray-500">{isLoadingOverview ? 'Loading…' : 'No payment data yet.'}</p>
                        ) : (
                            <>
                                {overview!.byMethod.map((m) => (
                                    <BarListRow
                                        key={m.method}
                                        label={`${formatLabel(m.method)}${m.count != null ? ` (${m.count})` : ''}`}
                                        value={m.amount}
                                        max={maxMethodAmount}
                                        display={formatCurrency(m.amount)}
                                    />
                                ))}
                                {overview?.totalTransactions != null && (
                                    <p className="pt-2 text-xs text-gray-500 border-t border-gray-100">
                                        {overview.totalTransactions.toLocaleString()} transactions · {formatCurrency(overview.collected)} total
                                    </p>
                                )}
                            </>
                        )}
                    </CardBody>
                </Card>
            </div>

            {/* This month's expenditures by category */}
            <Card>
                <CardHeader className="flex items-center justify-between">
                    <CardTitle>Expenditures This Month ({currentMonth})</CardTitle>
                    <Link href="/dashboard/manager/expenditures" className="text-xs font-medium text-blue-600 hover:text-blue-800">View ledger →</Link>
                </CardHeader>
                <CardBody className="space-y-2">
                    {(expenditureSummary?.byCategory?.length ?? 0) === 0 ? (
                        <p className="text-sm text-gray-500">No expenditures recorded this month.</p>
                    ) : (
                        <>
                            {expenditureSummary!.byCategory.map((cat) => (
                                <BarListRow
                                    key={cat.category}
                                    label={CATEGORY_LABELS[cat.category] ?? formatLabel(cat.category)}
                                    value={cat.amount}
                                    max={maxCategoryAmount}
                                    display={formatCurrency(cat.amount)}
                                />
                            ))}
                            <p className="pt-2 text-sm text-gray-600 text-right">
                                Total: <span className="font-semibold text-gray-900">{formatCurrency(expenditureSummary!.totalAmount)}</span>
                                {' '}across {expenditureSummary!.count} entries
                            </p>
                        </>
                    )}
                </CardBody>
            </Card>

            {/* Fee collection by class */}
            <Card>
                <CardHeader>
                    <CardTitle>Fee Collection by Class</CardTitle>
                </CardHeader>
                <CardBody className="p-0">
                    {isLoadingFees ? (
                        <p className="p-6 text-sm text-gray-500">Loading fee data…</p>
                    ) : classReports.length === 0 ? (
                        <p className="p-6 text-sm text-gray-500">No fee records found for this academic year.</p>
                    ) : (
                        <>
                        <div className="hidden md:block overflow-x-auto">
                            <p className="px-4 pt-2 text-right text-[11px] text-gray-400">Amounts in FCFA</p>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expected</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Collected</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {classReports.map((report) => (
                                        <tr key={report.classId} className="hover:bg-gray-50">
                                            <td className="px-3 py-2.5 text-sm font-medium text-gray-900 whitespace-nowrap">{report.className}</td>
                                            <td className="px-3 py-2.5 text-sm text-gray-600 text-right">{report.totalStudents}</td>
                                            <td className="px-3 py-2.5 text-sm text-gray-900 text-right whitespace-nowrap">{report.totalExpected.toLocaleString()}</td>
                                            <td className="px-3 py-2.5 text-sm text-gray-900 text-right whitespace-nowrap">{report.totalCollected.toLocaleString()}</td>
                                            <td className="px-3 py-2.5 text-sm font-semibold text-red-600 text-right whitespace-nowrap">{report.outstanding.toLocaleString()}</td>
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <Badge color={report.totalExpected === 0 ? 'gray' : collectionRateColor(report.collectionRate)} size="sm">
                                                    {report.totalExpected === 0 ? 'No fee records' : `${report.collectionRate.toFixed(1)}%`}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="md:hidden divide-y divide-gray-100">
                            <p className="px-4 pt-2 text-right text-[11px] text-gray-400">Amounts in FCFA</p>
                            {classReports.map((report) => (
                                <div key={report.classId} className="p-4 space-y-1.5">
                                    <div className="text-sm font-semibold text-gray-900 break-words">{report.className}</div>
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-xs text-gray-500">Students</span>
                                        <span className="text-sm text-gray-900 text-right break-words">{report.totalStudents}</span>
                                    </div>
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-xs text-gray-500">Expected</span>
                                        <span className="text-sm text-gray-900 text-right break-words">{report.totalExpected.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-xs text-gray-500">Collected</span>
                                        <span className="text-sm text-gray-900 text-right break-words">{report.totalCollected.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-xs text-gray-500">Outstanding</span>
                                        <span className="text-sm font-semibold text-red-600 text-right break-words">{report.outstanding.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-xs text-gray-500">Rate</span>
                                        <Badge color={report.totalExpected === 0 ? 'gray' : collectionRateColor(report.collectionRate)} size="sm">
                                            {report.totalExpected === 0 ? 'No fee records' : `${report.collectionRate.toFixed(1)}%`}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                        </>
                    )}
                </CardBody>
            </Card>

            {/* Export panel */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <PrinterIcon className="h-5 w-5 mr-2" />
                        Export Financial Reports
                    </CardTitle>
                </CardHeader>
                <CardBody>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                            <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value as typeof reportType)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="detailed">By Student (Detailed Fees)</option>
                                <option value="summary">By Class (Fee Summary)</option>
                                <option value="analytics">By Payment Method (Analytics)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                            <select
                                value={exportFormat}
                                onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="xlsx">Excel (.xlsx)</option>
                                <option value="pdf">PDF (.pdf)</option>
                                <option value="docx">Word (.docx)</option>
                                <option value="csv">CSV (.csv)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Classes</option>
                                {classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={generateReport}
                                disabled={isExporting}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                {isExporting ? 'Exporting…' : 'Export Report'}
                            </button>
                        </div>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
