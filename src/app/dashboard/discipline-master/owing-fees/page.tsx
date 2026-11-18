'use client';

// Owing Fees (discipline department): fee defaulters of the sub-classes the
// signed-in Discipline Master / Dean is assigned to. Pick a class from the
// drop-down to list who owes; installment defaults to the 2nd. No PDF here.
// Shared by dean-of-discipline/owing-fees via re-export.

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { CurrencyDollarIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { StatsCard, Input } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';

type InstallmentKey = 'first' | 'second' | 'third';
type InstallmentFilter = 'all' | InstallmentKey;

interface AssignedSubClass { id: number; name: string; classId: number | null; className: string }

interface InstallmentAmount { expected: number; paid: number; outstanding: number; cumulativeOutstanding?: number }

interface OwingStudent {
    studentId: number;
    studentName: string;
    matricule: string;
    totalPaid?: number;
    outstandingAmount: number;
    installments: Record<InstallmentKey, InstallmentAmount>;
    contactParentPhone?: string;
}

interface OwingData { installment: InstallmentFilter; totalDefaulters: number; totalOutstanding: number; students: OwingStudent[] }

const fetcher = (url: string) => apiService.get(url);
const money = (n?: number | null) => `FCFA ${(n ?? 0).toLocaleString()}`;

const INSTALLMENTS: { value: InstallmentFilter; label: string }[] = [
    { value: 'first', label: '1st Installment' },
    { value: 'second', label: '2nd Installment' },
    { value: 'third', label: '3rd Installment' },
    { value: 'all', label: 'Whole year' },
];
const SHORT: Record<InstallmentKey, string> = { first: '1st', second: '2nd', third: '3rd' };

const owing = (s: OwingStudent, f: InstallmentFilter) =>
    f === 'all' ? s.outstandingAmount : (s.installments?.[f]?.cumulativeOutstanding ?? s.installments?.[f]?.outstanding ?? 0);

function Badges({ installments }: { installments: Record<InstallmentKey, InstallmentAmount> }) {
    const keys = (['first', 'second', 'third'] as InstallmentKey[]).filter(k => (installments?.[k]?.outstanding ?? 0) > 0);
    if (keys.length === 0) return <span className="text-gray-400">—</span>;
    return (
        <div className="flex flex-wrap gap-1">
            {keys.map(k => (
                <span key={k} className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                    {SHORT[k]} {money(installments[k].outstanding)}
                </span>
            ))}
        </div>
    );
}

export default function OwingFeesPage() {
    const { selectedAcademicYear } = useAuth();
    const yearQs = selectedAcademicYear?.id ? `academicYearId=${selectedAcademicYear.id}` : '';

    const [subClassId, setSubClassId] = useState<number | null>(null);
    const [installment, setInstallment] = useState<InstallmentFilter>('second');
    const [search, setSearch] = useState('');

    const { data: subsRes, isLoading: subsLoading, error: subsError } = useSWR<{ data?: AssignedSubClass[] }>(
        `/discipline-profiles/fee-defaulters/sub-classes${yearQs ? `?${yearQs}` : ''}`,
        fetcher,
    );
    const subs = useMemo(() => subsRes?.data ?? [], [subsRes]);

    // Pick the first assigned class once the list arrives (or if the year changes it away).
    useEffect(() => {
        if (subs.length && !subs.some(s => s.id === subClassId)) setSubClassId(subs[0].id);
    }, [subs, subClassId]);

    const listKey = subClassId
        ? `/discipline-profiles/fee-defaulters?subClassId=${subClassId}${installment !== 'all' ? `&installment=${installment}` : ''}${yearQs ? `&${yearQs}` : ''}`
        : null;
    const { data: listRes, isLoading: listLoading, error: listError } = useSWR<{ data?: OwingData }>(listKey, fetcher);

    const groups = useMemo(() => {
        const m = new Map<string, AssignedSubClass[]>();
        for (const s of subs) m.set(s.className, [...(m.get(s.className) ?? []), s]);
        return Array.from(m.entries());
    }, [subs]);

    const rows = useMemo(() => {
        let list = listRes?.data?.students ?? [];
        const q = search.trim().toLowerCase();
        if (q) list = list.filter(s => `${s.studentName} ${s.matricule}`.toLowerCase().includes(q));
        return [...list].sort((a, b) => owing(b, installment) - owing(a, installment));
    }, [listRes, search, installment]);

    const current = subs.find(s => s.id === subClassId);
    const instLabel = INSTALLMENTS.find(i => i.value === installment)!.label;
    const amountTitle = installment === 'all' ? 'Balance for the year' : `Still to pay by ${instLabel}`;

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Owing Fees</h1>
                <p className="text-gray-600">
                    Students owing fees in the classes assigned to you{selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}
                </p>
            </div>

            {subsError && subsError.message !== 'Unauthorized' && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
                    Could not load your classes. Please try again.
                </div>
            )}

            {!subsLoading && !subsError && subs.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-100 p-6 text-center text-sm text-gray-600">
                    No classes are assigned to you for this academic year. Ask the Dean of Discipline to assign you classes under DM Assignments.
                </div>
            ) : (
                <>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <label className="flex-1 min-w-[200px] text-sm">
                            <span className="block text-gray-600 mb-1">Class</span>
                            <select
                                value={subClassId ?? ''}
                                onChange={e => { setSubClassId(Number(e.target.value)); setSearch(''); }}
                                disabled={subsLoading}
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                {subsLoading && <option value="">Loading…</option>}
                                {groups.map(([className, list]) => (
                                    <optgroup key={className} label={className}>
                                        {list.map(s => <option key={s.id} value={s.id}>{className} {s.name}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                        </label>
                        <label className="sm:w-52 text-sm">
                            <span className="block text-gray-600 mb-1">Installment</span>
                            <select
                                value={installment}
                                onChange={e => setInstallment(e.target.value as InstallmentFilter)}
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                {INSTALLMENTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                            </select>
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-6">
                        <StatsCard
                            title={current ? `Owing in ${current.className} ${current.name}` : 'Students owing'}
                            value={listLoading || !listRes ? '...' : (listRes.data?.totalDefaulters ?? 0).toLocaleString()}
                            icon={ExclamationTriangleIcon}
                            color="warning"
                        />
                        <StatsCard
                            title={installment === 'all' ? 'Total outstanding' : `Owed by ${instLabel}`}
                            value={listLoading || !listRes ? '...' : money(listRes.data?.totalOutstanding)}
                            icon={CurrencyDollarIcon}
                            color="danger"
                        />
                    </div>

                    <Input
                        placeholder="Search by name or matricule..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        leftIcon={<MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />}
                    />

                    {listError && listError.message !== 'Unauthorized' && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
                            {listError.message || 'Could not load the list.'}
                        </div>
                    )}

                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owing by installment</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{amountTitle}</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent contact</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {listLoading ? (
                                        <tr><td colSpan={5} className="px-4 py-6 text-sm text-gray-400 text-center">Loading…</td></tr>
                                    ) : rows.length === 0 ? (
                                        <tr><td colSpan={5} className="px-4 py-6 text-sm text-gray-400 text-center">Nobody owing in this class.</td></tr>
                                    ) : rows.map((s, i) => (
                                        <tr key={s.studentId} className="hover:bg-gray-50">
                                            <td className="px-4 py-2.5 text-sm text-gray-500">{i + 1}</td>
                                            <td className="px-4 py-2.5">
                                                <p className="text-sm font-medium text-gray-900">{s.studentName}</p>
                                                <p className="text-xs text-gray-500">{s.matricule}</p>
                                            </td>
                                            <td className="px-4 py-2.5"><Badges installments={s.installments} /></td>
                                            <td className="px-4 py-2.5 text-sm font-semibold text-red-700 text-right whitespace-nowrap">{money(owing(s, installment))}</td>
                                            <td className="px-4 py-2.5 text-sm whitespace-nowrap">
                                                {s.contactParentPhone ? (
                                                    <a href={`tel:${s.contactParentPhone}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800">
                                                        <PhoneIcon className="w-3.5 h-3.5" />{s.contactParentPhone}
                                                    </a>
                                                ) : <span className="text-gray-400">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {listLoading ? (
                                <p className="p-4 text-sm text-gray-400 text-center">Loading…</p>
                            ) : rows.length === 0 ? (
                                <p className="p-4 text-sm text-gray-400 text-center">Nobody owing in this class.</p>
                            ) : rows.map((s, i) => (
                                <div key={s.studentId} className="p-4 space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 break-words">{i + 1}. {s.studentName}</p>
                                            <p className="text-xs text-gray-500">{s.matricule}</p>
                                        </div>
                                        <span className="text-sm font-semibold text-red-700 whitespace-nowrap">{money(owing(s, installment))}</span>
                                    </div>
                                    <Badges installments={s.installments} />
                                    {s.contactParentPhone && (
                                        <a href={`tel:${s.contactParentPhone}`} className="inline-flex items-center gap-1.5 text-sm text-blue-600">
                                            <PhoneIcon className="w-4 h-4" />{s.contactParentPhone}
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {!listLoading && rows.length > 0 && (
                        <p className="text-xs text-gray-500">
                            {rows.length.toLocaleString()} student{rows.length === 1 ? '' : 's'}, highest amount first.
                            {installment !== 'all' && ' Amounts include registration and earlier installments not yet paid.'}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
