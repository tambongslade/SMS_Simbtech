'use client'
import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import {
    ArrowLeftIcon,
    BanknotesIcon,
    ChevronRightIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { StatsCard, Badge } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';

interface FeeStudentRow {
    studentId: string;
    name: string;
    matricule: string;
    classId: string;
    subClassId: number | null;
    className: string;
    expected: number;
    paid: number;
    balance: number;
    status: 'Paid' | 'Partial' | 'Unpaid';
}

interface ClassAggregate {
    classId: string;
    className: string;
    studentCount: number;
    owingCount: number;
    expected: number;
    collected: number;
    owing: number;
    collectionRate: number;
}

const formatMoney = (amount?: number | null) =>
    `FCFA ${(amount ?? 0).toLocaleString()}`;

const statusColor = (status: FeeStudentRow['status']): 'green' | 'yellow' | 'red' => {
    if (status === 'Paid') return 'green';
    if (status === 'Partial') return 'yellow';
    return 'red';
};

// Pull every fee record for the year (paged); the dataset is small enough
// (one record per enrollment) to aggregate client-side.
const fetchAllFees = async (academicYearId: number): Promise<FeeStudentRow[]> => {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return records.map((feeRecord: any): FeeStudentRow => {
        const student = feeRecord.enrollment?.student;
        const expected = feeRecord.amountExpected || 0;
        const paid = feeRecord.amountPaid || 0;
        return {
            studentId: student?.id?.toString() || feeRecord.id.toString(),
            name: student?.name || 'Unknown Student',
            matricule: student?.matricule || 'N/A',
            classId: feeRecord.enrollment?.classId ? String(feeRecord.enrollment.classId) : 'unknown',
            subClassId: feeRecord.enrollment?.subClassId ?? feeRecord.enrollment?.subClass?.id ?? null,
            // Fee records usually omit the nested class object; the component
            // resolves missing names from /classes.
            className: feeRecord.enrollment?.class?.name || '',
            expected,
            paid,
            balance: Math.max(0, expected - paid),
            status: paid >= expected ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid',
        };
    });
};

function FeesOverviewContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedClassId = searchParams.get('classId');
    const { selectedAcademicYear } = useAuth();

    // Fall back to the current academic year when none is selected in the sidebar
    const { data: yearsResult } = useSWR<{ data: { id: number; name: string; isCurrent: boolean }[] }>(
        selectedAcademicYear ? null : '/academic-years',
        (url: string) => apiService.get(url)
    );
    const effectiveYearId = selectedAcademicYear?.id
        ?? yearsResult?.data?.find(y => y.isCurrent)?.id;

    const { data: rawRows, error, isLoading } = useSWR(
        effectiveYearId ? ['all-fees', effectiveYearId] : null,
        ([, yearId]) => fetchAllFees(yearId as number),
        { onError: (err) => { if (err?.message !== 'Unauthorized') toast.error('Failed to load fee data'); } }
    );

    // Resolve class names/ids from /classes — fee records usually carry only ids
    const { data: classesResult } = useSWR<{ data: { id: number; name: string; subClasses?: { id: number }[] }[] }>(
        '/classes',
        (url: string) => apiService.get(url)
    );
    const rows = useMemo<FeeStudentRow[] | undefined>(() => {
        if (!rawRows) return rawRows;
        const nameById = new Map<string, string>();
        const classBySubClass = new Map<number, { id: string; name: string }>();
        (classesResult?.data ?? []).forEach(c => {
            nameById.set(String(c.id), c.name);
            (c.subClasses ?? []).forEach(sc => classBySubClass.set(sc.id, { id: String(c.id), name: c.name }));
        });
        return rawRows.map(row => {
            if (row.className) return row;
            let classId = row.classId;
            let className = classId !== 'unknown' ? nameById.get(classId) : undefined;
            if (!className && row.subClassId != null) {
                const viaSub = classBySubClass.get(Number(row.subClassId));
                if (viaSub) { classId = viaSub.id; className = viaSub.name; }
            }
            return { ...row, classId, className: className || 'Unassigned' };
        });
    }, [rawRows, classesResult]);

    const [showOwingOnly, setShowOwingOnly] = useState(true);
    const [search, setSearch] = useState('');

    const classAggregates = useMemo<ClassAggregate[]>(() => {
        const byClass = new Map<string, ClassAggregate>();
        (rows ?? []).forEach((row) => {
            let agg = byClass.get(row.classId);
            if (!agg) {
                agg = {
                    classId: row.classId,
                    className: row.className,
                    studentCount: 0,
                    owingCount: 0,
                    expected: 0,
                    collected: 0,
                    owing: 0,
                    collectionRate: 0,
                };
                byClass.set(row.classId, agg);
            }
            agg.studentCount += 1;
            agg.expected += row.expected;
            agg.collected += row.paid;
            agg.owing += row.balance;
            if (row.balance > 0) agg.owingCount += 1;
        });
        return Array.from(byClass.values())
            .map(agg => ({
                ...agg,
                collectionRate: agg.expected > 0 ? (agg.collected / agg.expected) * 100 : 100,
            }))
            .sort((a, b) => b.owing - a.owing);
    }, [rows]);

    const totals = useMemo(() => {
        const expected = classAggregates.reduce((sum, c) => sum + c.expected, 0);
        const collected = classAggregates.reduce((sum, c) => sum + c.collected, 0);
        const owing = classAggregates.reduce((sum, c) => sum + c.owing, 0);
        const owingCount = classAggregates.reduce((sum, c) => sum + c.owingCount, 0);
        return { expected, collected, owing, owingCount };
    }, [classAggregates]);

    const selectedClass = selectedClassId
        ? classAggregates.find(c => c.classId === selectedClassId)
        : null;

    const classStudents = useMemo(() => {
        if (!selectedClassId) return [];
        const term = search.trim().toLowerCase();
        return (rows ?? [])
            .filter(row => row.classId === selectedClassId)
            .filter(row => !showOwingOnly || row.balance > 0)
            .filter(row =>
                !term
                || row.name.toLowerCase().includes(term)
                || row.matricule.toLowerCase().includes(term)
            )
            .sort((a, b) => b.balance - a.balance);
    }, [rows, selectedClassId, showOwingOnly, search]);

    return (
        <div className="flex-1 p-4 space-y-6">
            {/* Header / breadcrumb */}
            <div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Link href="/dashboard/super-manager/overview" className="hover:text-blue-600">Overview</Link>
                    <ChevronRightIcon className="h-4 w-4" />
                    {selectedClass ? (
                        <>
                            <button
                                onClick={() => router.push('/dashboard/super-manager/fees-overview')}
                                className="hover:text-blue-600"
                            >
                                Fees by Class
                            </button>
                            <ChevronRightIcon className="h-4 w-4" />
                            <span className="text-gray-900 font-medium">{selectedClass.className}</span>
                        </>
                    ) : (
                        <span className="text-gray-900 font-medium">Fees by Class</span>
                    )}
                </div>
                <h1 className="mt-1 text-xl sm:text-2xl font-bold">
                    {selectedClass ? `${selectedClass.className} — Student Balances` : 'Fees by Class'}
                    {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}
                </h1>
            </div>

            {error && error.message !== 'Unauthorized' && !isLoading && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline"> Failed to load fee data. Please try again.</span>
                </div>
            )}

            {!selectedClass ? (
                <>
                    {/* Totals */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                        <StatsCard title="Total Expected" value={isLoading ? '...' : formatMoney(totals.expected)} icon={BanknotesIcon} color="primary" />
                        <StatsCard title="Total Collected" value={isLoading ? '...' : formatMoney(totals.collected)} icon={BanknotesIcon} color="success" />
                        <StatsCard title="Total Owing" value={isLoading ? '...' : formatMoney(totals.owing)} icon={BanknotesIcon} color="danger" />
                        <StatsCard title="Students Owing" value={isLoading ? '...' : String(totals.owingCount)} icon={BanknotesIcon} color="warning" />
                    </div>

                    {/* Class table */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-lg font-medium text-gray-900">Owing by Class</h2>
                            <span className="text-xs text-gray-500">Click a class to see its students</span>
                        </div>
                        {isLoading ? (
                            <div className="p-6 space-y-3">
                                {[0, 1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-10 rounded bg-gray-100 animate-pulse" />
                                ))}
                            </div>
                        ) : classAggregates.length === 0 ? (
                            <p className="p-6 text-sm text-gray-500">No fee records found for this academic year.</p>
                        ) : (
                            <>
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Owing Students</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expected</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Collected</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Owing</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Collection</th>
                                            <th className="px-2 py-3" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {classAggregates.map((agg) => {
                                            const rate = Math.min(100, Math.max(0, agg.collectionRate));
                                            return (
                                                <tr
                                                    key={agg.classId}
                                                    onClick={() => router.push(`/dashboard/super-manager/fees-overview?classId=${agg.classId}`)}
                                                    className="cursor-pointer hover:bg-blue-50/50 transition-colors"
                                                >
                                                    <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{agg.className}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{agg.studentCount}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{agg.owingCount}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatMoney(agg.expected)}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatMoney(agg.collected)}</td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-red-600 text-right whitespace-nowrap">{formatMoney(agg.owing)}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-2 rounded-full bg-gray-100">
                                                                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${rate}%` }} />
                                                            </div>
                                                            <span className="text-xs font-medium text-gray-700 w-11 text-right">{rate.toFixed(1)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-3 text-gray-400"><ChevronRightIcon className="h-4 w-4" /></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="md:hidden divide-y divide-gray-100">
                                {classAggregates.map((agg) => {
                                    const rate = Math.min(100, Math.max(0, agg.collectionRate));
                                    return (
                                        <div
                                            key={agg.classId}
                                            onClick={() => router.push(`/dashboard/super-manager/fees-overview?classId=${agg.classId}`)}
                                            className="p-4 space-y-1.5 cursor-pointer hover:bg-blue-50/50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-sm font-semibold text-gray-900 break-words">{agg.className}</span>
                                                <ChevronRightIcon className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                                            </div>
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-xs text-gray-500">Students</span>
                                                <span className="text-sm text-gray-900 text-right break-words">{agg.studentCount}</span>
                                            </div>
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-xs text-gray-500">Owing Students</span>
                                                <span className="text-sm text-gray-900 text-right break-words">{agg.owingCount}</span>
                                            </div>
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-xs text-gray-500">Expected</span>
                                                <span className="text-sm text-gray-900 text-right break-words">{formatMoney(agg.expected)}</span>
                                            </div>
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-xs text-gray-500">Collected</span>
                                                <span className="text-sm text-gray-900 text-right break-words">{formatMoney(agg.collected)}</span>
                                            </div>
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-xs text-gray-500">Owing</span>
                                                <span className="text-sm font-semibold text-red-600 text-right break-words">{formatMoney(agg.owing)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 rounded-full bg-gray-100">
                                                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${rate}%` }} />
                                                </div>
                                                <span className="text-xs font-medium text-gray-700 w-11 text-right">{rate.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            </>
                        )}
                    </div>
                </>
            ) : (
                <>
                    {/* Class-level summary */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                        <StatsCard title="Expected" value={formatMoney(selectedClass.expected)} icon={BanknotesIcon} color="primary" />
                        <StatsCard title="Collected" value={formatMoney(selectedClass.collected)} icon={BanknotesIcon} color="success" />
                        <StatsCard title="Owing" value={formatMoney(selectedClass.owing)} icon={BanknotesIcon} color="danger" />
                        <StatsCard title="Students Owing" value={`${selectedClass.owingCount} / ${selectedClass.studentCount}`} icon={BanknotesIcon} color="warning" />
                    </div>

                    {/* Student table */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => router.push('/dashboard/super-manager/fees-overview')}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                                <ArrowLeftIcon className="h-4 w-4" /> All classes
                            </button>
                            <div className="flex-1" />
                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showOwingOnly}
                                    onChange={(e) => setShowOwingOnly(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                Owing only
                            </label>
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search name or matricule"
                                    className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        {classStudents.length === 0 ? (
                            <p className="p-6 text-sm text-gray-500">
                                {showOwingOnly ? 'No students owing in this class.' : 'No students found.'}
                            </p>
                        ) : (
                            <>
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matricule</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expected</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Owing</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {classStudents.map((row) => (
                                            <tr key={`${row.studentId}-${row.matricule}`} className="hover:bg-gray-50">
                                                <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{row.name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{row.matricule}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatMoney(row.expected)}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatMoney(row.paid)}</td>
                                                <td className={`px-4 py-3 text-sm text-right whitespace-nowrap ${row.balance > 0 ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
                                                    {formatMoney(row.balance)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge color={statusColor(row.status)} size="sm">{row.status}</Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="md:hidden divide-y divide-gray-100">
                                {classStudents.map((row) => (
                                    <div key={`${row.studentId}-${row.matricule}`} className="p-4 space-y-1.5">
                                        <div className="text-sm font-semibold text-gray-900 break-words">{row.name}</div>
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="text-xs text-gray-500">Matricule</span>
                                            <span className="text-sm text-gray-900 text-right break-words">{row.matricule}</span>
                                        </div>
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="text-xs text-gray-500">Expected</span>
                                            <span className="text-sm text-gray-900 text-right break-words">{formatMoney(row.expected)}</span>
                                        </div>
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="text-xs text-gray-500">Paid</span>
                                            <span className="text-sm text-gray-900 text-right break-words">{formatMoney(row.paid)}</span>
                                        </div>
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="text-xs text-gray-500">Owing</span>
                                            <span className={`text-sm text-right break-words ${row.balance > 0 ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
                                                {formatMoney(row.balance)}
                                            </span>
                                        </div>
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="text-xs text-gray-500">Status</span>
                                            <Badge color={statusColor(row.status)} size="sm">{row.status}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default function FeesOverviewPage() {
    return (
        <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
            <FeesOverviewContent />
        </Suspense>
    );
}
