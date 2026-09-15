'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import {
    ExclamationTriangleIcon,
    PhoneIcon,
    MagnifyingGlassIcon,
    ArrowDownTrayIcon,
    ChevronRightIcon,
    ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardBody, StatsCard, Badge, Input, Select, Button } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';
import { sortClassesByLevel } from '@/lib/classOrdering';

// GET /bursar/defaulters-report — the whole year's defaulters, fetched once
// (no installment param: the per-student installments breakdown always
// comes back regardless, so every filter/drill-down below is done client-
// side against this one payload rather than round-tripping the server).
//
// Navigation is Classes -> Sub-classes -> Student list, each level showing
// how many people are owing rather than an amount, per request: a class
// summary sorted by amount reads as "which class owes the most money",
// which isn't the same question as "which class has the most defaulters" --
// the count is what a bursar deciding where to focus actually needs first.

type InstallmentKey = 'first' | 'second' | 'third';
type View = 'classes' | 'subclasses' | 'students';

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
    subClassId: number | null;
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

// A student "owes" under the current installment filter when either no
// filter is set (they're a defaulter at all) or they specifically still owe
// on the selected installment.
const owesUnderFilter = (s: DefaulterStudent, installment: 'all' | InstallmentKey): boolean =>
    installment === 'all' || s.installments[installment].outstanding > 0;

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

// Rows of {label, count} sorted highest-first, click to drill in. Used for
// both the class list and the sub-class list -- same shape, same behaviour.
function CountList({ rows, onSelect, emptyText }: {
    rows: { key: string; label: string; count: number }[];
    onSelect: (key: string) => void;
    emptyText: string;
}) {
    if (rows.length === 0) {
        return <p className="text-sm text-gray-500 p-4 text-center">{emptyText}</p>;
    }
    const maxCount = Math.max(1, ...rows.map(r => r.count));
    return (
        <div className="divide-y divide-gray-100">
            {rows.map(r => (
                <button
                    key={r.key}
                    type="button"
                    onClick={() => onSelect(r.key)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                >
                    <span className="flex-1 min-w-0 truncate text-sm font-medium text-gray-900">{r.label}</span>
                    <div className="w-32 h-2 rounded-full bg-gray-100 hidden sm:block">
                        <div className="h-2 rounded-full bg-red-500" style={{ width: `${Math.max(4, (r.count / maxCount) * 100)}%` }} />
                    </div>
                    <span className="w-24 text-right text-sm font-semibold text-red-700">
                        {r.count} owing
                    </span>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
            ))}
        </div>
    );
}

// Simple manual table -- no autotable plugin in this project, and a
// defaulters list is a plain enough grid that hand-drawn rows are fine.
function exportStudentsPdf(opts: {
    students: DefaulterStudent[];
    className: string;
    subClassName: string;
    installmentLabel: string;
    academicYearName?: string;
}) {
    const { students, className, subClassName, installmentLabel, academicYearName } = opts;
    if (students.length === 0) {
        toast.error('Nothing to export.');
        return;
    }
    const toastId = toast.loading('Preparing PDF...');
    try {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = 210;
        const marginX = 12;
        const usableWidth = pageWidth - marginX * 2;
        let y = 16;

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Fee Defaulters', marginX, y);
        y += 6;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(
            `${className} · ${subClassName}${academicYearName ? ` · ${academicYearName}` : ''} · ${installmentLabel}`,
            marginX, y,
        );
        y += 4;
        pdf.text(`${students.length} student${students.length === 1 ? '' : 's'} owing`, marginX, y);
        y += 6;

        // Columns: # | Student | Matricule | 1st | 2nd | 3rd | Total | Overdue
        const cols = [
            { label: '#', width: 8 },
            { label: 'Student', width: 52 },
            { label: 'Matricule', width: 24 },
            { label: '1st', width: 24 },
            { label: '2nd', width: 24 },
            { label: '3rd', width: 24 },
            { label: 'Total', width: 26 },
            { label: 'Overdue', width: usableWidth - (8 + 52 + 24 + 24 + 24 + 26) },
        ];
        const colX: number[] = [];
        let cursorX = marginX;
        for (const c of cols) { colX.push(cursorX); cursorX += c.width; }

        const rowHeight = 7;
        const pageHeight = 297;
        const bottomMargin = 16;

        const drawHeader = () => {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            cols.forEach((c, i) => pdf.text(c.label, colX[i], y));
            y += 2;
            pdf.setDrawColor(180);
            pdf.line(marginX, y, marginX + usableWidth, y);
            y += 5;
            pdf.setFont('helvetica', 'normal');
        };

        drawHeader();

        students.forEach((s, i) => {
            if (y > pageHeight - bottomMargin) {
                pdf.addPage();
                y = 16;
                drawHeader();
            }
            const cells = [
                String(i + 1),
                s.studentName.length > 32 ? `${s.studentName.slice(0, 30)}…` : s.studentName,
                s.matricule,
                s.installments.first.outstanding > 0 ? formatMoney(s.installments.first.outstanding) : '—',
                s.installments.second.outstanding > 0 ? formatMoney(s.installments.second.outstanding) : '—',
                s.installments.third.outstanding > 0 ? formatMoney(s.installments.third.outstanding) : '—',
                formatMoney(s.outstandingAmount),
                `${s.daysOverdue}d`,
            ];
            cells.forEach((cell, ci) => pdf.text(cell, colX[ci], y));
            y += rowHeight;
        });

        const slug = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        pdf.save(`fee-defaulters-${slug(className)}-${slug(subClassName)}.pdf`);
        toast.success('PDF downloaded.', { id: toastId });
    } catch (err) {
        toast.error(err instanceof Error ? err.message : 'PDF generation failed', { id: toastId });
    }
}

export default function DefaultersReport() {
    const { selectedAcademicYear } = useAuth();

    const [installmentFilter, setInstallmentFilter] = useState<'all' | InstallmentKey>('all');
    const [view, setView] = useState<View>('classes');
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    const [selectedSubClassKey, setSelectedSubClassKey] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [showContacts, setShowContacts] = useState(true);

    const params = new URLSearchParams();
    if (selectedAcademicYear?.id) params.set('academicYearId', String(selectedAcademicYear.id));
    params.set('includeDetails', 'true');

    const { data: reportRes, error, isLoading } = useSWR<{ data?: DefaultersReportData }>(
        `/bursar/defaulters-report?${params.toString()}`,
        fetcher,
        { onError: (err) => { if (err?.message !== 'Unauthorized') toast.error('Failed to load defaulters report.'); } }
    );
    const allStudents = reportRes?.data?.students ?? [];

    const installmentLabel = INSTALLMENT_OPTIONS.find(o => o.value === installmentFilter)!.label;

    // Level 1: one row per class, count = distinct students owing under the
    // current installment filter.
    const classRows = useMemo(() => {
        const byClass = new Map<string, { key: string; label: string; count: number; sortName: string }>();
        for (const s of allStudents) {
            if (!owesUnderFilter(s, installmentFilter)) continue;
            const key = String(s.classId ?? `name:${s.className}`);
            const bucket = byClass.get(key) ?? { key, label: s.className, count: 0, sortName: s.className };
            bucket.count += 1;
            byClass.set(key, bucket);
        }
        const list = Array.from(byClass.values());
        const ordered = sortClassesByLevel(list.map(r => ({ id: r.key, name: r.sortName })));
        const byKey = new Map(list.map(r => [r.key, r]));
        return ordered.map(o => byKey.get(String(o.id))!).filter(Boolean);
    }, [allStudents, installmentFilter]);

    const selectedClassLabel = classRows.find(c => c.key === selectedClassKey)?.label
        ?? allStudents.find(s => String(s.classId ?? `name:${s.className}`) === selectedClassKey)?.className
        ?? '';

    // Level 2: sub-classes within the selected class.
    const subClassRows = useMemo(() => {
        if (!selectedClassKey) return [];
        const byKey = new Map<string, { key: string; label: string; count: number }>();
        for (const s of allStudents) {
            if (String(s.classId ?? `name:${s.className}`) !== selectedClassKey) continue;
            if (!owesUnderFilter(s, installmentFilter)) continue;
            const key = String(s.subClassId ?? `name:${s.subClassName}`);
            const bucket = byKey.get(key) ?? { key, label: s.subClassName || 'Unassigned', count: 0 };
            bucket.count += 1;
            byKey.set(key, bucket);
        }
        return Array.from(byKey.values()).sort((a, b) => b.count - a.count);
    }, [allStudents, installmentFilter, selectedClassKey]);

    const selectedSubClassLabel = subClassRows.find(sc => sc.key === selectedSubClassKey)?.label ?? '';

    // Level 3: the actual student list for the selected class + sub-class.
    const studentRows = useMemo(() => {
        if (!selectedClassKey || !selectedSubClassKey) return [];
        let list = allStudents.filter(s =>
            String(s.classId ?? `name:${s.className}`) === selectedClassKey &&
            String(s.subClassId ?? `name:${s.subClassName}`) === selectedSubClassKey &&
            owesUnderFilter(s, installmentFilter)
        );
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(s => `${s.studentName} ${s.matricule}`.toLowerCase().includes(q));
        }
        return list.sort((a, b) => b.outstandingAmount - a.outstandingAmount);
    }, [allStudents, installmentFilter, selectedClassKey, selectedSubClassKey, search]);

    const goToClasses = () => {
        setView('classes');
        setSelectedClassKey(null);
        setSelectedSubClassKey(null);
        setSearch('');
    };
    const goToSubClasses = (classKey: string) => {
        setSelectedClassKey(classKey);
        setSelectedSubClassKey(null);
        setSearch('');
        setView('subclasses');
    };
    const goToStudents = (subClassKey: string) => {
        setSelectedSubClassKey(subClassKey);
        setView('students');
    };
    const backToSubClasses = () => {
        setView('subclasses');
        setSelectedSubClassKey(null);
        setSearch('');
    };

    const totalDefaultersUnderFilter = useMemo(
        () => allStudents.filter(s => owesUnderFilter(s, installmentFilter)).length,
        [allStudents, installmentFilter],
    );

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

            {/* Summary + installment filter -- the filter lives here, above the
                drill-down, since it changes the counts at every level below it. */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
                <div className="grid grid-cols-2 gap-3 sm:gap-6 flex-1">
                    <StatsCard
                        title={installmentFilter === 'all' ? 'Students Owing' : `Owing ${installmentLabel}`}
                        value={isLoading ? '...' : totalDefaultersUnderFilter.toLocaleString()}
                        icon={ExclamationTriangleIcon}
                        color="warning"
                    />
                    <StatsCard
                        title="Total Outstanding"
                        value={isLoading ? '...' : formatMoney(reportRes?.data?.totalOutstanding)}
                        icon={ExclamationTriangleIcon}
                        color="danger"
                    />
                </div>
                <div className="sm:w-52">
                    <Select
                        value={installmentFilter}
                        onChange={(e) => setInstallmentFilter(e.target.value as 'all' | InstallmentKey)}
                        options={INSTALLMENT_OPTIONS}
                    />
                </div>
            </div>

            {/* Breadcrumb */}
            {view !== 'classes' && (
                <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                    <button type="button" onClick={goToClasses} className="text-blue-600 hover:underline">Classes</button>
                    <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400" />
                    {view === 'subclasses' ? (
                        <span className="font-medium text-gray-900">{selectedClassLabel}</span>
                    ) : (
                        <>
                            <button type="button" onClick={backToSubClasses} className="text-blue-600 hover:underline">{selectedClassLabel}</button>
                            <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span className="font-medium text-gray-900">{selectedSubClassLabel}</span>
                        </>
                    )}
                </div>
            )}

            {/* Level 1: Classes */}
            {view === 'classes' && (
                <Card>
                    <CardHeader><CardTitle>Owing by Class</CardTitle></CardHeader>
                    <CardBody className="p-0">
                        {isLoading ? (
                            <p className="text-sm text-gray-500 p-4 text-center">Loading…</p>
                        ) : (
                            <CountList
                                rows={classRows}
                                onSelect={goToSubClasses}
                                emptyText="No defaulters. 🎉"
                            />
                        )}
                    </CardBody>
                </Card>
            )}

            {/* Level 2: Sub-classes within the selected class */}
            {view === 'subclasses' && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={goToClasses} className="p-1 -ml-1 text-gray-400 hover:text-gray-700">
                                <ArrowLeftIcon className="w-4 h-4" />
                            </button>
                            <CardTitle>{selectedClassLabel} — Owing by Sub-class</CardTitle>
                        </div>
                    </CardHeader>
                    <CardBody className="p-0">
                        <CountList
                            rows={subClassRows}
                            onSelect={goToStudents}
                            emptyText="No defaulters in this class."
                        />
                    </CardBody>
                </Card>
            )}

            {/* Level 3: Student list for the selected class + sub-class */}
            {view === 'students' && (
                <>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end sm:justify-between">
                        <div className="flex flex-col sm:flex-row gap-3 flex-1">
                            <div className="flex-1 min-w-[200px]">
                                <Input
                                    placeholder="Search by name or matricule..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    leftIcon={<MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />}
                                />
                            </div>
                            <label className="flex items-center gap-2 text-sm text-gray-600 select-none pb-2 sm:pb-0 sm:self-center">
                                <input
                                    type="checkbox"
                                    checked={showContacts}
                                    onChange={(e) => setShowContacts(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                Parent contacts
                            </label>
                        </div>
                        <Button
                            variant="outline"
                            leftIcon={ArrowDownTrayIcon}
                            onClick={() => exportStudentsPdf({
                                students: studentRows,
                                className: selectedClassLabel,
                                subClassName: selectedSubClassLabel,
                                installmentLabel,
                                academicYearName: selectedAcademicYear?.name,
                            })}
                            disabled={studentRows.length === 0}
                        >
                            Export PDF
                        </Button>
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
                                    {studentRows.length === 0 ? (
                                        <tr><td colSpan={5} className="px-4 py-6 text-sm text-gray-400 text-center">No defaulters found.</td></tr>
                                    ) : studentRows.map((s) => (
                                        <tr key={s.studentId} className="hover:bg-gray-50">
                                            <td className="px-4 py-2.5">
                                                <p className="text-sm font-medium text-gray-900">{s.studentName}</p>
                                                <p className="text-xs text-gray-500">{s.matricule}</p>
                                            </td>
                                            <td className="px-4 py-2.5"><InstallmentBadges installments={s.installments} /></td>
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
                            {studentRows.length === 0 ? (
                                <p className="p-4 text-sm text-gray-400 text-center">No defaulters found.</p>
                            ) : studentRows.map((s) => (
                                <div key={s.studentId} className="p-4 space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 break-words">{s.studentName}</p>
                                            <p className="text-xs text-gray-500">{s.matricule}</p>
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

                    {studentRows.length > 0 && (
                        <p className="text-xs text-gray-500">
                            {studentRows.length.toLocaleString()} student{studentRows.length === 1 ? '' : 's'} shown, sorted by highest outstanding first.
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
