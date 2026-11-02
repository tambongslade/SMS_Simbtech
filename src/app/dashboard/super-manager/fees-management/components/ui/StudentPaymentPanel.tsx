"use client";

import { useState } from 'react';
import { appDateLocale } from '@/lib/formatDate';
import { XMarkIcon, PencilIcon, PlusIcon } from '@heroicons/react/24/outline';
import { PaymentRecord } from '../../hooks/useFeeManagement';
import { Student } from '../../types';
import { PAYMENT_METHODS, paymentMethodLabel } from '@/lib/paymentMethods';

export interface AuditLogEntry {
    id: number | string;
    action: string;
    oldValues?: Record<string, any> | null;
    newValues?: Record<string, any> | null;
    createdAt?: string;
    created_at?: string;
    user?: { id: number; name: string; matricule?: string } | null;
}

interface StudentPaymentPanelProps {
    student: Student;
    records: PaymentRecord[];
    auditLog: AuditLogEntry[];
    isLoadingAuditLog: boolean;
    onUpdatePayment: (
        feeId: number | string,
        paymentId: number | string,
        data: { amount: number; paymentDate?: string; paymentMethod?: string; receiptNumber?: string }
    ) => Promise<boolean>;
    onAddPayment: (
        feeId: number | string,
        data: { amount: number; paymentDate?: string; paymentMethod?: string; receiptNumber?: string }
    ) => Promise<boolean>;
    onClose: () => void;
}

const formatMoney = (amount: number) => (amount ?? 0).toLocaleString();

const fieldLabel = (key: string) =>
    ({ amount: 'Amount', payment_date: 'Date', payment_method: 'Method', receipt_number: 'Receipt #', notes: 'Notes' }[key] || key);

// Per-student view inside the "Payment Records" tab: appears once a student is
// searched and selected. Lets a Super Manager edit any of this student's
// payments (no 24h lock -- that restriction is Bursar-only on the backend) or
// add a new one, and shows the edit history for full traceability.
export const StudentPaymentPanel: React.FC<StudentPaymentPanelProps> = ({
    student, records, auditLog, isLoadingAuditLog, onUpdatePayment, onAddPayment, onClose,
}) => {
    const [editingId, setEditingId] = useState<number | string | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editMethod, setEditMethod] = useState('');
    const [editReceipt, setEditReceipt] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [showAddForm, setShowAddForm] = useState(false);
    const [addAmount, setAddAmount] = useState('');
    const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0]);
    const [addMethod, setAddMethod] = useState('');
    const [addReceipt, setAddReceipt] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const startEdit = (record: PaymentRecord) => {
        setEditingId(record.id);
        setEditAmount(String(record.amount ?? ''));
        setEditDate(record.paymentDate ? new Date(record.paymentDate).toISOString().split('T')[0] : '');
        setEditMethod(record.paymentMethod || '');
        setEditReceipt(record.receiptNumber || '');
    };
    const cancelEdit = () => { setEditingId(null); setIsSaving(false); };

    const saveEdit = async (record: PaymentRecord) => {
        const amount = Number(editAmount);
        if (!amount || amount <= 0) return;
        setIsSaving(true);
        const ok = await onUpdatePayment(record.feeId, record.id, {
            amount,
            ...(editDate ? { paymentDate: editDate } : {}),
            ...(editMethod ? { paymentMethod: editMethod } : {}),
            ...(editReceipt ? { receiptNumber: editReceipt } : {}),
        });
        setIsSaving(false);
        if (ok) setEditingId(null);
    };

    const submitAdd = async () => {
        const amount = Number(addAmount);
        if (!amount || amount <= 0 || !student.feeId) return;
        setIsAdding(true);
        const ok = await onAddPayment(student.feeId, {
            amount,
            paymentDate: addDate,
            paymentMethod: addMethod,
            ...(addReceipt ? { receiptNumber: addReceipt } : {}),
        });
        setIsAdding(false);
        if (ok) {
            setAddAmount(''); setAddMethod(''); setAddReceipt('');
            setShowAddForm(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md border border-blue-200 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-wrap items-center gap-3 bg-blue-50">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">{student.name}</h2>
                    <p className="text-xs text-gray-500">{student.admissionNumber} · {student.class}</p>
                </div>
                <div className="flex-1" />
                <button
                    onClick={() => setShowAddForm(v => !v)}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700"
                >
                    <PlusIcon className="h-4 w-4 mr-1" /> Add Payment
                </button>
                <button
                    onClick={onClose}
                    title="Close"
                    className="inline-flex items-center p-1.5 rounded text-gray-500 hover:bg-gray-200"
                >
                    <XMarkIcon className="h-5 w-5" />
                </button>
            </div>

            {showAddForm && (
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-green-50 flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Amount</label>
                        <input type="number" min="1" value={addAmount} onChange={e => setAddAmount(e.target.value)}
                            disabled={isAdding} className="w-32 px-2 py-1.5 text-sm border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Date</label>
                        <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)}
                            disabled={isAdding} className="w-36 px-2 py-1.5 text-sm border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Method</label>
                        <select value={addMethod} onChange={e => setAddMethod(e.target.value)} disabled={isAdding}
                            className="px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white">
                            <option value="">Select Method</option>
                            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Receipt # (optional)</label>
                        <input type="text" value={addReceipt} onChange={e => setAddReceipt(e.target.value)}
                            disabled={isAdding} className="w-36 px-2 py-1.5 text-sm border border-gray-300 rounded-md" />
                    </div>
                    <button
                        onClick={submitAdd}
                        disabled={isAdding || !addAmount || Number(addAmount) <= 0 || !addMethod}
                        className="px-3 py-1.5 text-sm font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                        {isAdding ? 'Recording…' : 'Record Payment'}
                    </button>
                    <button onClick={() => setShowAddForm(false)} disabled={isAdding}
                        className="px-3 py-1.5 text-sm font-medium rounded bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50">
                        Cancel
                    </button>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt #</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {records.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-6 text-sm text-gray-500">No payments recorded yet for this student.</td></tr>
                        ) : records.map(record => (
                            editingId === record.id ? (
                                <tr key={`${record.feeId}-${record.id}`} className="bg-blue-50">
                                    <td className="px-3 py-2">
                                        <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} disabled={isSaving}
                                            className="w-36 px-2 py-1 text-sm border border-gray-300 rounded-md" />
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <input type="number" min="1" value={editAmount} onChange={e => setEditAmount(e.target.value)} disabled={isSaving}
                                            className="w-28 px-2 py-1 text-sm text-right border border-gray-300 rounded-md" />
                                    </td>
                                    <td className="px-3 py-2">
                                        <select value={editMethod} onChange={e => setEditMethod(e.target.value)} disabled={isSaving}
                                            className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white">
                                            <option value="">Select Method</option>
                                            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-3 py-2">
                                        <input type="text" value={editReceipt} onChange={e => setEditReceipt(e.target.value)} disabled={isSaving}
                                            className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-md" />
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap space-x-2">
                                        <button onClick={() => saveEdit(record)} disabled={isSaving || !editAmount || Number(editAmount) <= 0}
                                            className="px-2.5 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                                            {isSaving ? 'Saving…' : 'Save'}
                                        </button>
                                        <button onClick={cancelEdit} disabled={isSaving}
                                            className="px-2.5 py-1.5 text-xs font-medium rounded bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50">
                                            Cancel
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                <tr key={`${record.feeId}-${record.id}`} className="hover:bg-gray-50">
                                    <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">
                                        {record.paymentDate ? new Date(record.paymentDate).toLocaleDateString(appDateLocale()) : '—'}
                                    </td>
                                    <td className="px-3 py-2.5 text-sm font-semibold text-green-700 text-right whitespace-nowrap">{formatMoney(record.amount)}</td>
                                    <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">{paymentMethodLabel(record.paymentMethod)}</td>
                                    <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">{record.receiptNumber || '—'}</td>
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                        <button onClick={() => startEdit(record)}
                                            className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200">
                                            <PencilIcon className="h-4 w-4 mr-1" /> Edit
                                        </button>
                                    </td>
                                </tr>
                            )
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Edit log</h3>
                {isLoadingAuditLog ? (
                    <p className="text-xs text-gray-500">Loading…</p>
                ) : auditLog.length === 0 ? (
                    <p className="text-xs text-gray-500">No edits have been made to this student's payment records.</p>
                ) : (
                    <ul className="space-y-2">
                        {auditLog.map(entry => {
                            const when = entry.createdAt || entry.created_at;
                            const changedKeys = Object.keys(entry.newValues || {});
                            return (
                                <li key={entry.id} className="text-xs text-gray-700 bg-white border border-gray-200 rounded-md px-3 py-2">
                                    <span className="font-medium">{entry.user?.name || 'Unknown user'}</span>
                                    {' '}{entry.action === 'UPDATE_PAYMENT' ? 'edited a payment' : entry.action.toLowerCase()}
                                    {when && <span className="text-gray-400"> · {new Date(when).toLocaleString(appDateLocale())}</span>}
                                    {changedKeys.length > 0 && (
                                        <ul className="mt-1 ml-3 list-disc space-y-0.5">
                                            {changedKeys.map(k => (
                                                <li key={k}>
                                                    {fieldLabel(k)}: <span className="text-gray-500">{String(entry.oldValues?.[k] ?? '—')}</span>
                                                    {' → '}
                                                    <span className="text-gray-900 font-medium">{String(entry.newValues?.[k] ?? '—')}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};
