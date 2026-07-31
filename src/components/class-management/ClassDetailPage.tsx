'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import {
    AcademicCapIcon,
    ArrowLeftIcon,
    BanknotesIcon,
    BookOpenIcon,
    ChevronRightIcon,
    UsersIcon,
} from '@heroicons/react/24/outline';
import { StatsCard, Badge } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';

type TabKey = 'overview' | 'subjects' | 'finances';

interface SubClassInfo {
    id: number;
    name: string;
    studentCount: number;
    classMasterName?: string | null;
}

interface ClassInfo {
    id: number;
    name: string;
    studentCount: number;
    firstTermFee: number;
    secondTermFee: number;
    thirdTermFee: number;
    newStudentAddFee: number;
    oldStudentAddFee: number;
    miscellaneousFee: number;
    subClasses: SubClassInfo[];
}

interface SubjectRow {
    id: number;
    name: string;
    category: string;
    coefficient: number | null;
    subClassNames: string[];
    teachers: { id: number; name: string }[];
}

interface Teacher {
    id: number;
    name: string;
}

interface FeeRow {
    studentName: string;
    matricule: string;
    subClassName: string;
    expected: number;
    paid: number;
    balance: number;
}

const formatMoney = (amount?: number | null): string => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
    return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(amount);
};

const formatCategory = (category: string) =>
    category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const fetcher = (url: string) => apiService.get(url);

// Pull every fee record for the year (paged) — filtered to this class client-side.
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

export default function ClassDetailPage() {
    const params = useParams();
    const pathname = usePathname();
    const classId = Number(params?.id);
    const basePath = pathname.replace(/\/[^/]+$/, ''); // .../classes
    const isSuperManager = pathname.includes('/super-manager/');
    const { selectedAcademicYear } = useAuth();

    const [activeTab, setActiveTab] = useState<TabKey>('overview');
    const [assigningSubject, setAssigningSubject] = useState<SubjectRow | null>(null);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
    const [isAssigningTeacher, setIsAssigningTeacher] = useState(false);

    // --- Class info ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: classesResult, isLoading: isLoadingClass, mutate: mutateClasses } = useSWR<any>('/classes?includeSubClasses=true', fetcher);
    const classInfo = useMemo<ClassInfo | null>(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = (classesResult?.data || []).find((c: any) => Number(c.id) === classId);
        if (!raw) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subClasses: SubClassInfo[] = (raw.subClasses || raw.sub_classes || []).map((sub: any) => ({
            id: sub.id,
            name: sub.name,
            studentCount: sub.student_count ?? sub.studentCount ?? 0,
            classMasterName: sub.classMasterName ?? sub.class_master_name ?? sub.classMaster?.name ?? null,
        }));
        return {
            id: raw.id,
            name: raw.name,
            studentCount: raw.student_count ?? raw.studentCount ?? subClasses.reduce((sum, s) => sum + s.studentCount, 0),
            firstTermFee: raw.firstTermFee ?? raw.first_term_fee ?? 0,
            secondTermFee: raw.secondTermFee ?? raw.second_term_fee ?? 0,
            thirdTermFee: raw.thirdTermFee ?? raw.third_term_fee ?? 0,
            newStudentAddFee: raw.newStudentAddFee ?? raw.new_student_add_fee ?? 0,
            oldStudentAddFee: raw.oldStudentAddFee ?? raw.old_student_add_fee ?? 0,
            miscellaneousFee: raw.miscellaneousFee ?? raw.miscellaneous_fee ?? 0,
            subClasses,
        };
    }, [classesResult, classId]);

    // --- Subjects (with assignments + teachers) ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subjectsResult, isLoading: isLoadingSubjects, mutate: mutateSubjects } = useSWR<any>(
        '/subjects?include_sub_classes=true&include_teachers=true',
        fetcher
    );
    const subjectRows = useMemo<SubjectRow[]>(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (subjectsResult?.data || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((s: any): SubjectRow | null => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const classAssignments = (s.subClasses || []).filter((a: any) => Number(a.classId) === classId);
                if (classAssignments.length === 0) return null;
                // Coefficients are class-wide by convention; surface the first one
                const coefficient = classAssignments[0]?.coefficient ?? null;
                return {
                    id: s.id,
                    name: s.name,
                    category: s.category || '',
                    coefficient,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    subClassNames: classAssignments.map((a: any) => a.name),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    teachers: (s.teachers || []).map((t: any) => ({ id: t.id, name: t.name || 'N/A' })),
                };
            })
            .filter(Boolean) as SubjectRow[];
    }, [subjectsResult, classId]);

    // --- Teachers list (for assignment modal) ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teachersResult } = useSWR<any>('/users?role=TEACHER', fetcher);
    const teachers = useMemo<Teacher[]>(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (teachersResult?.data || []).map((t: any) => ({ id: t.id, name: t.name })),
        [teachersResult]
    );

    // --- Academic year (fall back to current) ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: yearsResult } = useSWR<any>(selectedAcademicYear ? null : '/academic-years', fetcher);
    const effectiveYearId = selectedAcademicYear?.id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ?? (yearsResult?.data || []).find((y: any) => y.isCurrent)?.id;

    // --- Fees (lazy: only fetched once the finances tab is opened) ---
    const { data: feeRecords, isLoading: isLoadingFees } = useSWR(
        activeTab === 'finances' && effectiveYearId ? ['class-fees', effectiveYearId] : null,
        ([, yearId]) => fetchAllFees(yearId as number)
    );

    const classFees = useMemo(() => {
        const rows: FeeRow[] = (feeRecords ?? [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((r: any) => Number(r.enrollment?.classId) === classId)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((r: any): FeeRow => {
                const expected = r.amountExpected || 0;
                const paid = r.amountPaid || 0;
                return {
                    studentName: r.enrollment?.student?.name || 'Unknown Student',
                    matricule: r.enrollment?.student?.matricule || 'N/A',
                    subClassName: r.enrollment?.subClass?.name || r.enrollment?.sub_class?.name || '—',
                    expected,
                    paid,
                    balance: Math.max(0, expected - paid),
                };
            });
        const expected = rows.reduce((sum, r) => sum + r.expected, 0);
        const collected = rows.reduce((sum, r) => sum + r.paid, 0);
        const owing = rows.reduce((sum, r) => sum + r.balance, 0);
        const owingRows = rows.filter(r => r.balance > 0).sort((a, b) => b.balance - a.balance);
        const rate = expected > 0 ? (collected / expected) * 100 : 100;
        return { rows, expected, collected, owing, owingRows, rate };
    }, [feeRecords, classId]);

    // --- Assign teacher ---
    const openAssignTeacher = (subject: SubjectRow) => {
        setAssigningSubject(subject);
        setSelectedTeacherId('');
    };

    const handleAssignTeacher = async () => {
        if (!assigningSubject || !selectedTeacherId) return;
        setIsAssigningTeacher(true);
        try {
            await apiService.post(`/users/${selectedTeacherId}/assignments/TEACHER`, { subjectId: assigningSubject.id });
            toast.success(`Teacher assigned to ${assigningSubject.name}.`);
            setAssigningSubject(null);
            mutateSubjects();
        } catch (error) {
            console.error('Teacher assignment failed:', error);
            toast.error('Failed to assign teacher.');
        } finally {
            setIsAssigningTeacher(false);
        }
    };

    const totalFeeNew = classInfo
        ? classInfo.firstTermFee + classInfo.secondTermFee + classInfo.thirdTermFee + classInfo.newStudentAddFee + classInfo.miscellaneousFee
        : 0;
    const totalFeeOld = classInfo
        ? classInfo.firstTermFee + classInfo.secondTermFee + classInfo.thirdTermFee + classInfo.oldStudentAddFee + classInfo.miscellaneousFee
        : 0;

    const tabs: { key: TabKey; label: string }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'subjects', label: 'Subjects & Teachers' },
        { key: 'finances', label: 'Finances' },
    ];

    if (!isLoadingClass && !classInfo) {
        return (
            <div className="p-6">
                <Link href={basePath} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800">
                    <ArrowLeftIcon className="h-4 w-4" /> Back to Classes
                </Link>
                <p className="mt-6 text-center text-gray-500">Class not found.</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-5">
            {/* Breadcrumb + back */}
            <div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Link href={basePath} className="hover:text-blue-600">Classes</Link>
                    <ChevronRightIcon className="h-4 w-4" />
                    <span className="text-gray-900 font-medium">{classInfo?.name ?? '…'}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold">{classInfo?.name ?? 'Loading…'}</h1>
                    <Link href={basePath} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800">
                        <ArrowLeftIcon className="h-4 w-4" /> Back to Classes
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex gap-6 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === tab.key
                                    ? 'border-blue-600 text-blue-700'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* ── Overview tab ── */}
            {activeTab === 'overview' && (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                        <StatsCard title="Total Students" value={isLoadingClass ? '...' : String(classInfo?.studentCount ?? 0)} icon={UsersIcon} color="primary" />
                        <StatsCard title="Subclasses" value={isLoadingClass ? '...' : String(classInfo?.subClasses.length ?? 0)} icon={AcademicCapIcon} color="secondary" />
                        <StatsCard title="Subjects" value={isLoadingSubjects ? '...' : String(subjectRows.length)} icon={BookOpenIcon} color="success" />
                        <StatsCard title="Total Fee (New)" value={isLoadingClass ? '...' : formatMoney(totalFeeNew)} icon={BanknotesIcon} color="warning" />
                    </div>

                    {/* Subclasses */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-medium text-gray-900">Subclasses</h2>
                        </div>
                        {(classInfo?.subClasses.length ?? 0) === 0 ? (
                            <p className="p-6 text-sm text-gray-500">{isLoadingClass ? 'Loading…' : 'No subclasses defined.'}</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subclass</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Master</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {classInfo!.subClasses.map((sub) => (
                                            <tr key={sub.id} className="hover:bg-gray-50">
                                                <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900">{sub.name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600 text-right">{sub.studentCount}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{sub.classMasterName || <span className="italic text-gray-400">Not assigned</span>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Fee structure */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-3">Fee Structure</h2>
                        <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            {[
                                ['Registration (New)', classInfo?.newStudentAddFee],
                                ['Registration (Old)', classInfo?.oldStudentAddFee],
                                ['1st Term Fee', classInfo?.firstTermFee],
                                ['2nd Term Fee', classInfo?.secondTermFee],
                                ['3rd Term Fee', classInfo?.thirdTermFee],
                                ['Miscellaneous', classInfo?.miscellaneousFee],
                            ].map(([label, amount]) => (
                                <div key={label as string} className="flex flex-col bg-gray-50 p-2.5 rounded">
                                    <dt className="text-gray-500">{label}</dt>
                                    <dd className="text-gray-900 font-medium">{formatMoney(amount as number)}</dd>
                                </div>
                            ))}
                        </dl>
                        <div className="mt-3 pt-2 border-t border-dashed text-right space-y-0.5">
                            <p className="text-sm text-gray-600">Total (New Student): <span className="font-semibold text-blue-700">{formatMoney(totalFeeNew)}</span></p>
                            <p className="text-sm text-gray-600">Total (Old Student): <span className="font-semibold text-blue-700">{formatMoney(totalFeeOld)}</span></p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Subjects & Teachers tab ── */}
            {activeTab === 'subjects' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <h2 className="text-lg font-medium text-gray-900">Subjects, Coefficients & Teachers</h2>
                        <span className="text-xs text-gray-500">{subjectRows.length} subject(s)</span>
                    </div>
                    {isLoadingSubjects ? (
                        <p className="p-6 text-sm text-gray-500">Loading subjects…</p>
                    ) : subjectRows.length === 0 ? (
                        <p className="p-6 text-sm text-gray-500">No subjects assigned to this class yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Coefficient</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher(s)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {subjectRows.map((subject) => (
                                        <tr key={subject.id} className="hover:bg-gray-50">
                                            <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{subject.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{subject.category ? formatCategory(subject.category) : '—'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{subject.coefficient ?? '—'}</td>
                                            <td className="px-4 py-3 text-sm">
                                                {subject.teachers.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {subject.teachers.map((t) => (
                                                            <Badge key={t.id} color="blue" size="sm">{t.name}</Badge>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <Badge color="red" size="sm">No teacher</Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                <button
                                                    onClick={() => openAssignTeacher(subject)}
                                                    className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                                        subject.teachers.length === 0
                                                            ? 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                                                            : 'text-blue-700 bg-blue-100 hover:bg-blue-200 focus:ring-blue-500'
                                                    }`}
                                                >
                                                    {subject.teachers.length === 0 ? 'Assign Teacher' : 'Add Teacher'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Finances tab ── */}
            {activeTab === 'finances' && (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                        <StatsCard title="Expected" value={isLoadingFees ? '...' : formatMoney(classFees.expected)} icon={BanknotesIcon} color="primary" />
                        <StatsCard title="Collected" value={isLoadingFees ? '...' : formatMoney(classFees.collected)} icon={BanknotesIcon} color="success" />
                        <StatsCard title="Owing" value={isLoadingFees ? '...' : formatMoney(classFees.owing)} icon={BanknotesIcon} color="danger" />
                        <StatsCard title="Students Owing" value={isLoadingFees ? '...' : `${classFees.owingRows.length} / ${classFees.rows.length}`} icon={UsersIcon} color="warning" />
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-sm font-medium text-gray-500">Collection rate</h2>
                            <span className="text-sm font-semibold text-gray-900">{classFees.rate.toFixed(1)}%</span>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, classFees.rate))}%` }} />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-lg font-medium text-gray-900">Students Owing</h2>
                            {isSuperManager && (
                                <Link
                                    href={`/dashboard/super-manager/fees-overview?classId=${classId}`}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                                >
                                    Full breakdown →
                                </Link>
                            )}
                        </div>
                        {isLoadingFees ? (
                            <p className="p-6 text-sm text-gray-500">Loading fee data…</p>
                        ) : classFees.owingRows.length === 0 ? (
                            <p className="p-6 text-sm text-gray-500">No students owing in this class. 🎉</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matricule</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expected</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Owing</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {classFees.owingRows.map((row, i) => (
                                            <tr key={`${row.matricule}-${i}`} className="hover:bg-gray-50">
                                                <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{row.studentName}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{row.matricule}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatMoney(row.expected)}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatMoney(row.paid)}</td>
                                                <td className="px-4 py-3 text-sm font-semibold text-red-600 text-right whitespace-nowrap">{formatMoney(row.balance)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Assign teacher modal */}
            {assigningSubject && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
                    <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
                        <button
                            onClick={() => setAssigningSubject(null)}
                            disabled={isAssigningTeacher}
                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-bold disabled:opacity-50"
                        >
                            &times;
                        </button>
                        <h2 className="text-lg font-semibold mb-1">Assign Teacher</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Subject: <span className="font-medium">{assigningSubject.name}</span>
                        </p>
                        {assigningSubject.teachers.length > 0 && (
                            <p className="text-xs text-gray-500 mb-3">
                                Currently assigned: {assigningSubject.teachers.map(t => t.name).join(', ')}
                            </p>
                        )}
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="teacherSelect" className="block text-sm font-medium text-gray-700">Teacher</label>
                                <select
                                    id="teacherSelect"
                                    value={selectedTeacherId}
                                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                                    disabled={isAssigningTeacher}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                                >
                                    <option value="" disabled>-- Select a Teacher --</option>
                                    {teachers
                                        .filter(t => !assigningSubject.teachers.some(existing => existing.id === t.id))
                                        .map((t) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                </select>
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setAssigningSubject(null)}
                                    disabled={isAssigningTeacher}
                                    className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAssignTeacher}
                                    disabled={isAssigningTeacher || !selectedTeacherId}
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:bg-blue-300"
                                >
                                    {isAssigningTeacher ? 'Assigning...' : 'Assign Teacher'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
