'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { saveFile } from '@/lib/download';
import {
    ExclamationTriangleIcon,
    PhoneIcon,
    MagnifyingGlassIcon,
    ArrowDownTrayIcon,
    ChevronRightIcon,
    ArrowLeftIcon,
    PrinterIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardBody, StatsCard, Badge, Input, Select, Button, Modal } from '@/components/ui';
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
    /** What should have been paid in all by this installment (registration and earlier ones included). */
    cumulativeExpected?: number;
    /** How much of that is still missing. */
    cumulativeOutstanding?: number;
}

interface DefaulterStudent {
    studentId: number;
    studentName: string;
    matricule: string;
    classId: number | null;
    className: string;
    subClassId: number | null;
    subClassName: string;
    totalPaid?: number;
    outstandingAmount: number;
    installments: Record<InstallmentKey, InstallmentAmount>;
    dueDate: string | null;
    daysOverdue: number;
    contactParentPhone?: string;
}

interface DefaultersReportData {
    totalDefaulters: number;
    totalOutstanding: number;
    // Whole-year totals with the shared outstanding rule (same as Overview / Fee Statistics / Reports)
    summary?: {
        studentCount: number;
        totalExpected: number;
        totalCollected: number;
        totalOverpayments: number;
        totalOutstanding: number;
        reconciliation?: { formula: string };
    };
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

// A student "owes" under the current installment filter when either no
// filter is set (they're a defaulter at all) or they specifically still owe
// on the selected installment.
const owesUnderFilter = (s: DefaulterStudent, installment: 'all' | InstallmentKey): boolean =>
    installment === 'all' || displayOutstanding(s, installment) > 0;

// The amount to show/sum/export under the current filter. Filtered to one
// installment, it is what is still missing of everything due by then
// (registration and earlier installments included), the same figure as the PDF.
function displayOutstanding(s: DefaulterStudent, installment: 'all' | InstallmentKey): number {
    if (installment === 'all') return s.outstandingAmount;
    const inst = s.installments[installment];
    return inst.cumulativeOutstanding ?? inst.outstanding;
}

// What the student should have paid in all by the selected installment
// (registration + 1st + ... up to it); "all" = the whole year's fees.
function displayExpected(s: DefaulterStudent, installment: 'all' | InstallmentKey): number {
    if (installment === 'all') {
        return s.installments?.third?.cumulativeExpected ?? ((s.totalPaid ?? 0) + s.outstandingAmount);
    }
    const inst = s.installments[installment];
    return inst.cumulativeExpected ?? inst.expected;
}

// Everything the student has paid so far this year.
const displayPaid = (s: DefaulterStudent): number => s.totalPaid ?? 0;

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

// Backend-rendered PDF: one subclass per page, five columns
// (Name, Status, Total Paid, Expected 1st Installment, Remaining).
// See GET /bursar/defaulters-report/pdf.
async function downloadDefaultersPdf(opts: {
    academicYearId?: number;
    academicYearName?: string;
    installmentFilter: 'all' | InstallmentKey;
    /** Only these classes; undefined prints every class. */
    classIds?: number[];
    fileSuffix?: string;
}): Promise<boolean> {
    const { academicYearId, academicYearName, installmentFilter, classIds, fileSuffix } = opts;
    const params = new URLSearchParams();
    if (academicYearId) params.set('academicYearId', String(academicYearId));
    if (installmentFilter !== 'all') params.set('installment', installmentFilter);
    if (classIds?.length) params.set('classIds', classIds.join(','));

    const toastId = toast.loading('Preparing PDF...');
    try {
        const blob = await apiService.get<Blob>(
            `/bursar/defaulters-report/pdf?${params.toString()}`,
            undefined,
            'blob',
        );
        const slug = (v?: string) => (v || 'current').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'current';
        await saveFile(blob, `fee-defaulters-${slug(academicYearName)}${fileSuffix ? '-' + slug(fileSuffix) : ''}.pdf`, 'application/pdf');
        toast.success('PDF downloaded.', { id: toastId });
        return true;
    } catch (err) {
        toast.error(err instanceof Error ? err.message : 'PDF download failed', { id: toastId });
        return false;
    }
}

// Pick which classes go into the printed PDF. Lists the classes that have
// someone owing under the current installment filter, all ticked by default
// (or just the class being viewed, when opened from inside one).
function PrintClassesModal({ isOpen, onClose, classRows, initialKeys, installmentLabel, onPrint }: {
    isOpen: boolean;
    onClose: () => void;
    classRows: { key: string; label: string; count: number }[];
    initialKeys: string[] | null;
    installmentLabel: string;
    onPrint: (keys: string[]) => Promise<void>;
}) {
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [wasOpen, setWasOpen] = useState(false);
    // Reset the ticks each time the dialog opens.
    if (isOpen !== wasOpen) {
        setWasOpen(isOpen);
        if (isOpen) setPicked(new Set(initialKeys ?? classRows.map(r => r.key)));
    }

    const toggle = (key: string) => setPicked(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
    });
    const chosen = classRows.filter(r => picked.has(r.key));
    const students = chosen.reduce((n, r) => n + r.count, 0);

    return (
        <Modal isOpen={isOpen} onClose={busy ? () => undefined : onClose} title="Print fee defaulters" size="md">
            <div className="space-y-3">
                <p className="text-sm text-gray-600">
                    Choose the classes to include ({installmentLabel}). Each sub-class prints on its own page.
                </p>
                <div className="flex items-center gap-3 text-sm">
                    <button type="button" className="text-blue-600 hover:underline" onClick={() => setPicked(new Set(classRows.map(r => r.key)))}>Select all</button>
                    <span className="text-gray-300">|</span>
                    <button type="button" className="text-blue-600 hover:underline" onClick={() => setPicked(new Set())}>Clear</button>
                </div>
                <div className="max-h-80 overflow-y-auto border border-gray-100 rounded divide-y divide-gray-100">
                    {classRows.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500 text-center">No classes with defaulters.</p>
                    ) : classRows.map(r => (
                        <label key={r.key} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={picked.has(r.key)}
                                onChange={() => toggle(r.key)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="flex-1 text-sm text-gray-900">{r.label}</span>
                            <span className="text-xs text-red-700 font-medium">{r.count} owing</span>
                        </label>
                    ))}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <span className="text-xs text-gray-500">
                        {chosen.length} class{chosen.length === 1 ? '' : 'es'} · {students.toLocaleString()} student{students === 1 ? '' : 's'}
                    </span>
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
                        <Button
                            leftIcon={ArrowDownTrayIcon}
                            disabled={busy || chosen.length === 0}
                            onClick={async () => {
                                setBusy(true);
                                try { await onPrint(chosen.map(r => r.key)); } finally { setBusy(false); }
                            }}
                        >
                            {busy ? 'Preparing…' : 'Download PDF'}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

export default function DefaultersReport() {
    const { selectedAcademicYear } = useAuth();

    const [installmentFilter, setInstallmentFilter] = useState<'all' | InstallmentKey>('all');
    const [view, setView] = useState<View>('classes');
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    const [selectedSubClassKey, setSelectedSubClassKey] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [showContacts, setShowContacts] = useState(true);
    const [printOpen, setPrintOpen] = useState(false);

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
    const expectedTitle = installmentFilter === 'all' ? 'Expected (Year)' : `Expected by ${installmentLabel}`;

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
        return list.sort((a, b) => displayOutstanding(b, installmentFilter) - displayOutstanding(a, installmentFilter));
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

    // Computed client-side (not the server's report.totalOutstanding, which
    // is always the grand total across every installment) so filtering to
    // e.g. "2nd Installment" shows what's actually outstanding on the 2nd
    // installment across the students who owe on it, not their full balance.
    const totalOutstandingUnderFilter = useMemo(
        () => allStudents
            .filter(s => owesUnderFilter(s, installmentFilter))
            .reduce((sum, s) => sum + displayOutstanding(s, installmentFilter), 0),
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
                drill-down, since it changes the counts at every level below it.
                The "Download All Classes" button always sits here too so the
                bursar can print the full-school PDF from any view. */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
                <div className="grid grid-cols-2 gap-3 sm:gap-6 flex-1">
                    <StatsCard
                        title={installmentFilter === 'all' ? 'Students Owing' : `Owing ${installmentLabel}`}
                        value={isLoading ? '...' : totalDefaultersUnderFilter.toLocaleString()}
                        icon={ExclamationTriangleIcon}
                        color="warning"
                    />
                    <StatsCard
                        title={installmentFilter === 'all' ? 'Total Outstanding' : `${installmentLabel} Outstanding`}
                        value={isLoading ? '...' : formatMoney(totalOutstandingUnderFilter)}
                        icon={ExclamationTriangleIcon}
                        color="danger"
                    />
                    {installmentFilter === 'all' && reportRes?.data?.summary?.reconciliation?.formula && (
                        <p className="col-span-2 text-xs text-gray-500">
                            {reportRes.data.summary.reconciliation.formula} (FCFA)
                        </p>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <div className="sm:w-52">
                        <Select
                            value={installmentFilter}
                            onChange={(e) => setInstallmentFilter(e.target.value as 'all' | InstallmentKey)}
                            options={INSTALLMENT_OPTIONS}
                        />
                    </div>
                    <Button
                        variant="outline"
                        leftIcon={PrinterIcon}
                        onClick={() => setPrintOpen(true)}
                        disabled={isLoading || totalDefaultersUnderFilter === 0}
                    >
                        Print Classes…
                    </Button>
                </div>
            </div>

            <PrintClassesModal
                isOpen={printOpen}
                onClose={() => setPrintOpen(false)}
                classRows={classRows}
                initialKeys={selectedClassKey && classRows.some(r => r.key === selectedClassKey) ? [selectedClassKey] : null}
                installmentLabel={installmentLabel}
                onPrint={async (keys) => {
                    const all = keys.length === classRows.length;
                    // Rows without a class id (key "name:...") can only be printed as part of "all".
                    const classIds = keys.map(Number).filter(n => Number.isInteger(n) && n > 0);
                    const labels = classRows.filter(r => keys.includes(r.key)).map(r => r.label);
                    if (!all && classIds.length === 0) {
                        toast.error('These rows have no class assigned; print all classes instead.');
                        return;
                    }
                    const ok = await downloadDefaultersPdf({
                        academicYearId: selectedAcademicYear?.id,
                        academicYearName: selectedAcademicYear?.name,
                        installmentFilter,
                        classIds: all ? undefined : classIds,
                        fileSuffix: all ? undefined : (labels.length <= 3 ? labels.join(' ') : `${labels.length} classes`),
                    });
                    if (ok) setPrintOpen(false);
                }}
            />

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
                    <div className="flex flex-col sm:flex-row gap-3">
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

                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{expectedTitle}</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Overdue</th>
                                        {showContacts && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Contact</th>}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {studentRows.length === 0 ? (
                                        <tr><td colSpan={showContacts ? 6 : 5} className="px-4 py-6 text-sm text-gray-400 text-center">No defaulters found.</td></tr>
                                    ) : studentRows.map((s) => (
                                        <tr key={s.studentId} className="hover:bg-gray-50">
                                            <td className="px-4 py-2.5">
                                                <p className="text-sm font-medium text-gray-900">{s.studentName}</p>
                                                <p className="text-xs text-gray-500">{s.matricule}</p>
                                            </td>
                                            <td className="px-4 py-2.5 text-sm text-gray-900 text-right whitespace-nowrap">{formatMoney(displayExpected(s, installmentFilter))}</td>
                                            <td className="px-4 py-2.5 text-sm text-green-700 text-right whitespace-nowrap">{formatMoney(displayPaid(s))}</td>
                                            <td className="px-4 py-2.5 text-sm font-semibold text-red-700 text-right whitespace-nowrap">{formatMoney(displayOutstanding(s, installmentFilter))}</td>
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
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-gray-500">{expectedTitle}</span>
                                        <span className="text-sm text-gray-900">{formatMoney(displayExpected(s, installmentFilter))}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-gray-500">Paid</span>
                                        <span className="text-sm text-green-700">{formatMoney(displayPaid(s))}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-gray-500">Remaining</span>
                                        <span className="text-sm font-semibold text-red-700">{formatMoney(displayOutstanding(s, installmentFilter))}</span>
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
