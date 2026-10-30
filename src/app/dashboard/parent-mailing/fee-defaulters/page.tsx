'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { saveFile } from '@/lib/download';
import {
    ArrowLeftIcon,
    MagnifyingGlassIcon,
    PaperAirplaneIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardBody, Input, TextArea, Select, Button } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';

type InstallmentKey = 'first' | 'second' | 'third';
const INSTALLMENT_OPTIONS: Array<{ value: '' | InstallmentKey; label: string }> = [
    { value: '', label: 'Total outstanding (all installments)' },
    { value: 'first', label: '1st Installment' },
    { value: 'second', label: '2nd Installment' },
    { value: 'third', label: '3rd Installment' },
];
const INSTALLMENT_LABELS: Record<InstallmentKey, string> = {
    first: '1st Installment',
    second: '2nd Installment',
    third: '3rd Installment',
};

interface DefaulterStudent {
    studentId: number;
    studentName: string;
    matricule: string;
    className: string;
    subClassName: string;
    outstandingAmount: number;
    installments?: Record<InstallmentKey, { expected: number; paid: number; outstanding: number }>;
}

interface DefaultersReportData {
    students: DefaulterStudent[];
}

const fetcher = (url: string) => apiService.get(url);
const formatMoney = (amount?: number | null) => `FCFA ${(amount ?? 0).toLocaleString()}`;

export default function FeeDefaultersMailingPage() {
    const { selectedAcademicYear } = useAuth();

    const [search, setSearch] = useState('');
    const [installment, setInstallment] = useState<'' | InstallmentKey>('');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [customMessage, setCustomMessage] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [exclusionDate, setExclusionDate] = useState('');
    const [generating, setGenerating] = useState(false);

    const params = new URLSearchParams();
    if (selectedAcademicYear?.id) params.set('academicYearId', String(selectedAcademicYear.id));
    if (installment) params.set('installment', installment);

    const { data: reportRes, error, isLoading } = useSWR<{ data?: DefaultersReportData }>(
        `/bursar/defaulters-report?${params.toString()}`,
        fetcher,
        { onError: (err) => { if (err?.message !== 'Unauthorized') toast.error('Failed to load fee defaulters.'); } }
    );
    const allStudents = reportRes?.data?.students ?? [];

    // The amount quoted for each student: their balance on the chosen installment,
    // or their total outstanding balance when no installment is selected.
    const amountFor = (s: DefaulterStudent) =>
        installment ? (s.installments?.[installment]?.outstanding ?? 0) : s.outstandingAmount;

    // Switching the academic year or installment can drop students from the list;
    // selections that no longer apply are silently dropped too.
    useEffect(() => {
        setSelected(prev => {
            const validIds = new Set(allStudents.map(s => s.studentId));
            const next = new Set(Array.from(prev).filter(id => validIds.has(id)));
            return next.size === prev.size ? prev : next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reportRes]);

    const filtered = useMemo(() => {
        if (!search.trim()) return allStudents;
        const q = search.trim().toLowerCase();
        return allStudents.filter(s =>
            `${s.studentName} ${s.matricule} ${s.className} ${s.subClassName}`.toLowerCase().includes(q)
        );
    }, [allStudents, search]);

    // Distinct classes present in the current (installment-filtered) defaulters
    // list, each with the student IDs it covers, so a whole class can be
    // selected/deselected for mailing in one click.
    const classGroups = useMemo(() => {
        const map = new Map<string, { className: string; studentIds: number[] }>();
        for (const s of allStudents) {
            const g = map.get(s.className) || { className: s.className, studentIds: [] };
            g.studentIds.push(s.studentId);
            map.set(s.className, g);
        }
        return Array.from(map.values()).sort((a, b) =>
            a.className.localeCompare(b.className, undefined, { numeric: true, sensitivity: 'base' })
        );
    }, [allStudents]);

    const toggle = (id: number) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleClass = (studentIds: number[]) => {
        setSelected(prev => {
            const next = new Set(prev);
            const allIn = studentIds.every(id => next.has(id));
            studentIds.forEach(id => allIn ? next.delete(id) : next.add(id));
            return next;
        });
    };

    const allFilteredSelected = filtered.length > 0 && filtered.every(s => selected.has(s.studentId));
    const toggleAllFiltered = () => {
        setSelected(prev => {
            const next = new Set(prev);
            if (allFilteredSelected) {
                filtered.forEach(s => next.delete(s.studentId));
            } else {
                filtered.forEach(s => next.add(s.studentId));
            }
            return next;
        });
    };

    const selectedTotal = useMemo(
        () => allStudents.filter(s => selected.has(s.studentId)).reduce((sum, s) => sum + amountFor(s), 0),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [allStudents, selected, installment],
    );

    // Preview uses the first selected student's real data once something is
    // picked, else a placeholder sample, so the letter wording can be checked
    // before any PDF is generated.
    const previewStudent = useMemo(() => {
        const first = allStudents.find(s => selected.has(s.studentId));
        if (first) {
            return { studentName: first.studentName, className: first.className, subClassName: first.subClassName, amount: amountFor(first) };
        }
        return { studentName: 'Student Name', className: 'Form 1', subClassName: 'A', amount: 25000 };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allStudents, selected, installment]);
    const previewDate = useMemo(
        () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        [],
    );

    const handleGenerate = async () => {
        if (selected.size === 0) return;
        setGenerating(true);
        const toastId = toast.loading(`Generating ${selected.size} letter${selected.size === 1 ? '' : 's'}...`);
        try {
            const blob = await apiService.post<Blob>(
                '/bursar/defaulters-report/letters-pdf',
                {
                    studentIds: Array.from(selected),
                    academicYearId: selectedAcademicYear?.id,
                    customMessage: customMessage.trim() || undefined,
                    dueDate: dueDate.trim() || undefined,
                    exclusionDate: exclusionDate.trim() || undefined,
                    installment: installment || undefined,
                },
                undefined,
                'blob',
            );
            await saveFile(blob, `fee-defaulter-letters-${Date.now()}.pdf`, 'application/pdf');
            toast.success('Letters generated.', { id: toastId });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not generate letters.', { id: toastId });
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div>
                <Link href="/dashboard/parent-mailing" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline mb-2">
                    <ArrowLeftIcon className="w-3.5 h-3.5" /> Parent Mailing
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Fee Defaulters Mailings</h1>
                <p className="text-gray-600">
                    Select the parents to notify &mdash; each letter is filled in automatically with the child&apos;s name, class and outstanding amount
                    {selectedAcademicYear ? `, for ${selectedAcademicYear.name}` : ''}.
                </p>
            </div>

            {error && error.message !== 'Unauthorized' && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
                    Could not load the fee defaulters list. Please try again.
                </div>
            )}

            <Card>
                <CardHeader><CardTitle>Message</CardTitle></CardHeader>
                <CardBody className="space-y-4">
                    <Select
                        label="Installment being chased"
                        value={installment}
                        onChange={(e) => setInstallment(e.target.value as '' | InstallmentKey)}
                        options={INSTALLMENT_OPTIONS}
                        helperText="When an installment is chosen, only parents still owing on it are listed, and the letter states the amount owed on that installment."
                    />
                    <TextArea
                        label="Custom message (optional)"
                        placeholder="Any additional note for this batch of letters, shown under &quot;Dear Parent,&quot; and before the fee details."
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        rows={3}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Fee due date (optional)"
                            placeholder="e.g. 31st October 2026"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                        <Input
                            label="Campus exclusion date (optional)"
                            placeholder="e.g. Monday 10th November 2026"
                            value={exclusionDate}
                            onChange={(e) => setExclusionDate(e.target.value)}
                        />
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader><CardTitle>Letter Preview</CardTitle></CardHeader>
                <CardBody>
                    <div className="mx-auto max-w-md rounded-md border border-gray-300 bg-white p-4 text-[11px] leading-snug text-gray-900 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/letterhead.png"
                            alt="School letterhead"
                            className="mb-3 max-h-14 w-full border-b border-blue-900 object-contain pb-1"
                        />
                        <p className="mb-3 text-right text-gray-500">{previewDate}</p>
                        <p className="mb-2">Dear Parent,</p>
                        {customMessage.trim() && (
                            <p className="mb-2 whitespace-pre-wrap">{customMessage}</p>
                        )}
                        <p className="mb-2">
                            We will like to inform you that your child <b>{previewStudent.studentName}</b> of{' '}
                            <b>{previewStudent.className} {previewStudent.subClassName}</b> is owing{' '}
                            <b>{formatMoney(previewStudent.amount)}</b>
                            {installment && <> for the <b>{INSTALLMENT_LABELS[installment]}</b></>}
                            {dueDate.trim() && <> which was expected before <b>{dueDate}</b></>}.{' '}
                            {exclusionDate.trim() && <>Your child will not be allowed on campus as of <b>{exclusionDate}</b>.</>}
                        </p>
                        <p className="mb-2">Endeavour to pay and send justification of payment.</p>
                        <p className="mt-4 font-bold">The Principal</p>
                    </div>
                    <p className="mt-2 text-center text-xs text-gray-500">
                        {selected.size > 0 ? "Showing the first selected student." : 'Showing a sample — select students below to preview real data.'}{' '}
                        Each letter prints like this, 3 per A4 page.
                    </p>
                </CardBody>
            </Card>

            {classGroups.length > 0 && (
                <Card>
                    <CardHeader><CardTitle>Select whole classes</CardTitle></CardHeader>
                    <CardBody className="flex flex-wrap gap-2">
                        {classGroups.map((g) => {
                            const active = g.studentIds.every(id => selected.has(id));
                            return (
                                <button
                                    key={g.className}
                                    type="button"
                                    onClick={() => toggleClass(g.studentIds)}
                                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                        active
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    {g.className} <span className={active ? 'text-blue-100' : 'text-gray-400'}>({g.studentIds.length})</span>
                                </button>
                            );
                        })}
                    </CardBody>
                </Card>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="flex-1 min-w-[200px]">
                    <Input
                        placeholder="Search by name, matricule or class..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        leftIcon={<MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />}
                    />
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span>{selected.size.toLocaleString()} selected &middot; {formatMoney(selectedTotal)}</span>
                    <Button
                        leftIcon={PaperAirplaneIcon}
                        onClick={handleGenerate}
                        disabled={selected.size === 0 || generating}
                    >
                        Generate Letters (PDF)
                    </Button>
                </div>
            </div>

            <Card>
                <CardBody className="p-0">
                    {isLoading ? (
                        <p className="text-sm text-gray-500 p-4 text-center">Loading…</p>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm text-gray-400 p-6 text-center">No fee defaulters found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left w-10">
                                            <input
                                                type="checkbox"
                                                checked={allFilteredSelected}
                                                onChange={toggleAllFiltered}
                                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                aria-label="Select all visible"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {installment ? 'Owed (this installment)' : 'Outstanding'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {filtered.map((s) => (
                                        <tr
                                            key={s.studentId}
                                            className="hover:bg-gray-50 cursor-pointer"
                                            onClick={() => toggle(s.studentId)}
                                        >
                                            <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(s.studentId)}
                                                    onChange={() => toggle(s.studentId)}
                                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <p className="text-sm font-medium text-gray-900">{s.studentName}</p>
                                                <p className="text-xs text-gray-500">{s.matricule}</p>
                                            </td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700">{s.className} {s.subClassName}</td>
                                            <td className="px-4 py-2.5 text-sm font-semibold text-red-700 text-right whitespace-nowrap">{formatMoney(amountFor(s))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardBody>
            </Card>

            {selected.size > 0 && (
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-500" />
                    One PDF will be generated with all {selected.size.toLocaleString()} letter{selected.size === 1 ? '' : 's'}, 3 per A4 page, in the same order as the list above.
                </p>
            )}
        </div>
    );
}
