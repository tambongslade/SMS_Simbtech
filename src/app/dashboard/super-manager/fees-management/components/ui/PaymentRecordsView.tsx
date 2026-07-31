"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FunnelIcon, PencilIcon } from '@heroicons/react/24/outline';
import { PaymentRecord } from '../../hooks/useFeeManagement';

interface PaymentRecordsViewProps {
    records: PaymentRecord[];
    isLoading: boolean;
    onUpdatePayment: (
        feeId: number | string,
        paymentId: number | string,
        data: { amount: number; paymentDate?: string; paymentMethod?: string; receiptNumber?: string }
    ) => Promise<boolean>;
}

const PAGE_SIZE = 25;
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000; // records are editable for 24h after recording

const PAYMENT_METHODS = ['EXPRESS_UNION', 'CCA', 'F3DC', 'AFRILAND_FIRST_BANK'];

// Plain numbers keep the columns narrow — the header notes amounts are FCFA
const formatMoney = (amount: number) => amount.toLocaleString();

// A record stays editable for 24 hours after it was recorded
const isEditable = (record: PaymentRecord) => {
    if (!record.createdAt) return false;
    return Date.now() - new Date(record.createdAt).getTime() < EDIT_WINDOW_MS;
};

// Ledger of recorded fee payments: every transaction, newest first.
export const PaymentRecordsView: React.FC<PaymentRecordsViewProps> = ({ records, isLoading, onUpdatePayment }) => {
    const [filter, setFilter] = useState('');
    const [page, setPage] = useState(1);

    // Inline edit state
    const [editingId, setEditingId] = useState<number | string | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editMethod, setEditMethod] = useState('');
    const [editReceipt, setEditReceipt] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const startEdit = (record: PaymentRecord) => {
        setEditingId(record.id);
        setEditAmount(String(record.amount ?? ''));
        setEditDate(record.paymentDate ? new Date(record.paymentDate).toISOString().split('T')[0] : '');
        setEditMethod(record.paymentMethod || '');
        setEditReceipt(record.receiptNumber || '');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setIsSavingEdit(false);
    };

    const saveEdit = async (record: PaymentRecord) => {
        const amount = Number(editAmount);
        if (!amount || amount <= 0) return;
        setIsSavingEdit(true);
        const ok = await onUpdatePayment(record.feeId, record.id, {
            amount,
            ...(editDate ? { paymentDate: editDate } : {}),
            ...(editMethod ? { paymentMethod: editMethod } : {}),
            ...(editReceipt ? { receiptNumber: editReceipt } : {}),
        });
        setIsSavingEdit(false);
        if (ok) setEditingId(null);
    };

    const filteredRecords = useMemo(() => {
        const term = filter.trim().toLowerCase();
        if (!term) return records;
        return records.filter(r =>
            r.studentName.toLowerCase().includes(term)
            || r.matricule.toLowerCase().includes(term)
            || r.receiptNumber.toLowerCase().includes(term)
            || r.className.toLowerCase().includes(term)
        );
    }, [records, filter]);

    const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageRecords = filteredRecords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    return (
        <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">Payment Records</h2>
                    <p className="text-xs text-gray-500">
                        {isLoading ? 'Loading…' : `${filteredRecords.length.toLocaleString()} payment(s) · amounts in FCFA`}
                    </p>
                </div>
                <div className="flex-1" />
                <div className="relative">
                    <FunnelIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={filter}
                        onChange={(e) => { setFilter(e.target.value); setPage(1); }}
                        placeholder="Filter records (name, receipt, class)"
                        className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="p-6 space-y-3">
                    {[0, 1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-9 rounded bg-gray-100 animate-pulse" />
                    ))}
                </div>
            ) : filteredRecords.length === 0 ? (
                <p className="p-6 text-sm text-gray-500">
                    {filter ? 'No records match your filter.' : 'No payments recorded yet for this academic year.'}
                </p>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matricule</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt #</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pageRecords.map((record) => (
                                    editingId === record.id ? (
                                        <tr key={`${record.feeId}-${record.id}`} className="bg-blue-50">
                                            <td className="px-4 sm:px-6 py-2">
                                                <input
                                                    type="date"
                                                    value={editDate}
                                                    onChange={(e) => setEditDate(e.target.value)}
                                                    disabled={isSavingEdit}
                                                    className="w-36 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">{record.studentName}</td>
                                            <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">{record.matricule}</td>
                                            <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">{record.className}</td>
                                            <td className="px-4 py-2 text-right">
                                                <input
                                                    type="number"
                                                    value={editAmount}
                                                    onChange={(e) => setEditAmount(e.target.value)}
                                                    min="1"
                                                    disabled={isSavingEdit}
                                                    className="w-28 px-2 py-1 text-sm text-right border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <select
                                                    value={editMethod}
                                                    onChange={(e) => setEditMethod(e.target.value)}
                                                    disabled={isSavingEdit}
                                                    className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                >
                                                    <option value="">Select Method</option>
                                                    {PAYMENT_METHODS.map(m => (
                                                        <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="text"
                                                    value={editReceipt}
                                                    onChange={(e) => setEditReceipt(e.target.value)}
                                                    disabled={isSavingEdit}
                                                    className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap space-x-2">
                                                <button
                                                    onClick={() => saveEdit(record)}
                                                    disabled={isSavingEdit || !editAmount || Number(editAmount) <= 0}
                                                    className="px-2.5 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {isSavingEdit ? 'Saving…' : 'Save'}
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    disabled={isSavingEdit}
                                                    className="px-2.5 py-1.5 text-xs font-medium rounded bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50"
                                                >
                                                    Cancel
                                                </button>
                                            </td>
                                        </tr>
                                    ) : (
                                    <tr key={`${record.feeId}-${record.id}`} className="hover:bg-gray-50">
                                        <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">
                                            {record.paymentDate ? new Date(record.paymentDate).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-3 py-2.5 text-sm font-medium whitespace-nowrap">
                                            {record.studentId ? (
                                                <Link
                                                    href={`/dashboard/super-manager/student-management/${record.studentId}`}
                                                    className="text-gray-900 hover:text-blue-700 hover:underline"
                                                    title="View student profile"
                                                >
                                                    {record.studentName}
                                                </Link>
                                            ) : (
                                                <span className="text-gray-900">{record.studentName}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">{record.matricule}</td>
                                        <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">{record.className}</td>
                                        <td className="px-3 py-2.5 text-sm font-semibold text-green-700 text-right whitespace-nowrap">{formatMoney(record.amount)}</td>
                                        <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">{record.paymentMethod ? record.paymentMethod.replace(/_/g, ' ') : '—'}</td>
                                        <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">{record.receiptNumber || '—'}</td>
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                            {isEditable(record) ? (
                                                <button
                                                    onClick={() => startEdit(record)}
                                                    title="Edit payment (allowed within 24h of recording)"
                                                    className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                                                >
                                                    <PencilIcon className="h-4 w-4 mr-1" /> Edit
                                                </button>
                                            ) : (
                                                <span
                                                    title="Editing is only allowed within 24 hours of recording"
                                                    className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-gray-400 bg-gray-100 cursor-not-allowed"
                                                >
                                                    <PencilIcon className="h-4 w-4 mr-1" /> Locked
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                    )
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="px-4 sm:px-6 py-3 border-t border-gray-200 flex items-center justify-between gap-3">
                            <p className="text-xs text-gray-500">
                                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredRecords.length)} of {filteredRecords.length.toLocaleString()}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={safePage <= 1}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-gray-600">{safePage} / {totalPages}</span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={safePage >= totalPages}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
