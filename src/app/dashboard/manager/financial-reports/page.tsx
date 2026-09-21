'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import {
    CurrencyDollarIcon,
    ReceiptPercentIcon,
    ReceiptRefundIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardBody, StatsCard } from '@/components/ui';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';
import { getExpenditureSummary, CATEGORY_LABELS, ExpenditureSummary } from '@/lib/expendituresApi';
import { saveFile } from '@/lib/download';

// ── GET /dashboard/financial-overview ──
// Actual shape: { schoolOverview: { totalExpected, totalCollected,
// collectionRate, totalAccounts }, detailedFinancials: { studentsOwingCount,
// totalAmountOwed, recentPayments[] }, paymentAnalytics:
// { paymentMethodBreakdown[], totalTransactions, totalAmount } }
// Fees-collected fields are intentionally not surfaced for the MANAGER —
// only outstanding-balance / receivable stats are kept below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FinancialOverviewResponse = Record<string, any>;

const formatCurrency = (amount?: number | null) =>
    `FCFA ${(amount ?? 0).toLocaleString()}`;

const formatLabel = (value: string) =>
    value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const fetcher = (url: string) => apiService.get(url);

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

    // Financial overview — the MANAGER role is blocked from this endpoint on the
    // backend (403). We keep the call so any legacy access still shows outstanding
    // receivables, but fees-collected values are never rendered.
    const { data: overviewRes, error: overviewError, isLoading: isLoadingOverview } = useSWR<{ data?: FinancialOverviewResponse }>(
        `/dashboard/financial-overview${yearParam}`,
        fetcher,
        {
            shouldRetryOnError: false,
            onError: (err) => {
                // 403 for MANAGER is expected — stay silent
                if (err?.status !== 403 && err?.message !== 'Unauthorized') {
                    toast.error('Failed to load financial overview');
                }
            },
        }
    );
    const receivables = useMemo(() => {
        const raw = overviewRes?.data;
        if (!raw) return null;
        const so = raw.schoolOverview ?? raw;
        const df = raw.detailedFinancials ?? {};
        const collected = so.totalCollected ?? raw.collected ?? 0;
        const expected = so.totalExpected ?? raw.expected ?? 0;
        return {
            outstanding: df.totalAmountOwed ?? raw.outstanding ?? Math.max(0, expected - collected),
            studentsOwing: df.studentsOwingCount ?? null,
            totalAccounts: so.totalAccounts ?? df.totalAccounts ?? null,
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
            const reportTypeNames = { summary: 'Fee-Summary', detailed: 'Detailed-Fees', analytics: 'Payment-Analytics' };
            await saveFile(blob, `${reportTypeNames[reportType]}_${new Date().toISOString().split('T')[0]}.${exportFormat}`);
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
                    Outstanding balances and expenditures
                    {effectiveYear ? ` · ${effectiveYear.name}` : ''}
                </p>
            </div>

            {overviewError && overviewError.status !== 403 && overviewError.message !== 'Unauthorized' && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline"> Failed to load financial data. Please try again.</span>
                </div>
            )}

            {/* Overview cards — receivables + expenditure only */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                <StatsCard title="Outstanding Fees" value={isLoadingOverview ? '...' : formatCurrency(receivables?.outstanding)} icon={CurrencyDollarIcon} color="danger" />
                <StatsCard
                    title="Students Owing"
                    value={isLoadingOverview ? '...' : receivables?.studentsOwing != null
                        ? `${receivables.studentsOwing.toLocaleString()}${receivables.totalAccounts ? ` / ${receivables.totalAccounts.toLocaleString()}` : ''}`
                        : '—'}
                    icon={ReceiptPercentIcon}
                    color="warning"
                />
                <StatsCard title="Spent This Month" value={formatCurrency(expenditureSummary?.totalAmount)} icon={ReceiptRefundIcon} color="primary" />
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

            {/* Quick links to sibling finance pages */}
            <Card>
                <CardHeader>
                    <CardTitle>Related</CardTitle>
                </CardHeader>
                <CardBody>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <Link href="/dashboard/manager/expenditures" className="rounded-lg border border-gray-100 p-3 hover:border-blue-300 hover:shadow-sm transition">
                            <p className="text-sm font-semibold text-gray-900">Expenditure ledger</p>
                            <p className="text-xs text-gray-500">Review school spending</p>
                        </Link>
                        <Link href="/dashboard/manager/finance-requests" className="rounded-lg border border-gray-100 p-3 hover:border-blue-300 hover:shadow-sm transition">
                            <p className="text-sm font-semibold text-gray-900">Expense requisitions</p>
                            <p className="text-xs text-gray-500">Approvals &amp; verifications</p>
                        </Link>
                        <Link href="/dashboard/manager/salaries" className="rounded-lg border border-gray-100 p-3 hover:border-blue-300 hover:shadow-sm transition">
                            <p className="text-sm font-semibold text-gray-900">Salary management</p>
                            <p className="text-xs text-gray-500">Payroll overview</p>
                        </Link>
                        <Link href="/dashboard/manager/defaulters" className="rounded-lg border border-gray-100 p-3 hover:border-blue-300 hover:shadow-sm transition">
                            <p className="text-sm font-semibold text-gray-900">Fee defaulters</p>
                            <p className="text-xs text-gray-500">Who has outstanding balances</p>
                        </Link>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
