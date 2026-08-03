'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { PencilIcon } from '@heroicons/react/24/outline';
import { Modal, Button } from '@/components/ui';
import apiService from '@/lib/apiService';
import { sortClassesByLevel } from '@/lib/classOrdering';

// Fee structure per class — the Super Manager configures fees here (Class
// Management only creates classes/subclasses). Saved via PUT /classes/:id.

interface ClassFees {
    id: number;
    name: string;
    firstTermFee?: number;
    secondTermFee?: number;
    thirdTermFee?: number;
    newStudentFee?: number;
    oldStudentFee?: number;
    miscellaneousFee?: number;
    studentCount?: number;
}

const FEE_FIELDS = [
    { key: 'firstTermFee', label: '1st Installment', payload: 'first_term_fee' },
    { key: 'secondTermFee', label: '2nd Installment', payload: 'second_term_fee' },
    { key: 'thirdTermFee', label: '3rd Installment', payload: 'third_term_fee' },
    { key: 'newStudentFee', label: 'Registration (New)', payload: 'new_student_fee' },
    { key: 'oldStudentFee', label: 'Registration (Old)', payload: 'old_student_fee' },
    { key: 'miscellaneousFee', label: 'Miscellaneous', payload: 'miscellaneous_fee' },
] as const;

const fetcher = (url: string) => apiService.get(url);

const money = (n?: number | null) => `FCFA ${(n ?? 0).toLocaleString()}`;

const totalNew = (c: ClassFees) =>
    (c.firstTermFee ?? 0) + (c.secondTermFee ?? 0) + (c.thirdTermFee ?? 0)
    + (c.newStudentFee ?? 0) + (c.miscellaneousFee ?? 0);

export function ClassFeesEditor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: classesRes, isLoading, mutate } = useSWR<{ data: any[] }>('/classes', fetcher, {
        onError: (err) => { if (err?.message !== 'Unauthorized') toast.error('Failed to load classes.'); },
    });
    const classes: ClassFees[] = sortClassesByLevel(classesRes?.data ?? []);

    const [editing, setEditing] = useState<ClassFees | null>(null);
    const [form, setForm] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    const openEdit = (cls: ClassFees) => {
        setEditing(cls);
        const initial: Record<string, string> = {};
        FEE_FIELDS.forEach(f => { initial[f.key] = String(cls[f.key] ?? 0); });
        setForm(initial);
    };

    const save = async () => {
        if (!editing) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: Record<string, any> = { name: editing.name };
        for (const f of FEE_FIELDS) {
            const value = Number(form[f.key]);
            if (Number.isNaN(value) || value < 0) {
                toast.error(`${f.label} must be a valid amount.`);
                return;
            }
            payload[f.payload] = value;
        }
        setIsSaving(true);
        try {
            await apiService.put(`/classes/${editing.id}`, payload);
            toast.success(`Fees updated for ${editing.name}.`);
            setEditing(null);
            mutate();
        } catch (err) {
            console.error('Class fees update failed:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                            {FEE_FIELDS.map(f => (
                                <th key={f.key} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{f.label}</th>
                            ))}
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total (New)</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {isLoading ? (
                            <tr><td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-400">Loading classes…</td></tr>
                        ) : classes.length === 0 ? (
                            <tr><td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-400">No classes found.</td></tr>
                        ) : classes.map(cls => (
                            <tr key={cls.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-sm font-medium text-gray-900 whitespace-nowrap">{cls.name}</td>
                                {FEE_FIELDS.map(f => (
                                    <td key={f.key} className="px-4 py-2.5 text-sm text-gray-700 text-right whitespace-nowrap">{money(cls[f.key])}</td>
                                ))}
                                <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">{money(totalNew(cls))}</td>
                                <td className="px-4 py-2.5 text-right">
                                    <button
                                        onClick={() => openEdit(cls)}
                                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                                    >
                                        <PencilIcon className="h-4 w-4 mr-1" /> Edit Fees
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
                {isLoading ? (
                    <p className="p-4 text-sm text-gray-400 text-center">Loading classes…</p>
                ) : classes.length === 0 ? (
                    <p className="p-4 text-sm text-gray-400 text-center">No classes found.</p>
                ) : classes.map(cls => (
                    <div key={cls.id} className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900">{cls.name}</p>
                            <button
                                onClick={() => openEdit(cls)}
                                className="shrink-0 inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-blue-700 bg-blue-100"
                            >
                                <PencilIcon className="h-3.5 w-3.5 mr-1" /> Edit
                            </button>
                        </div>
                        {FEE_FIELDS.map(f => (
                            <div key={f.key} className="flex items-center justify-between gap-3">
                                <span className="text-xs text-gray-500">{f.label}</span>
                                <span className="text-sm text-gray-900">{money(cls[f.key])}</span>
                            </div>
                        ))}
                        <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-100">
                            <span className="text-xs font-medium text-gray-600">Total (New student)</span>
                            <span className="text-sm font-semibold text-gray-900">{money(totalNew(cls))}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit modal */}
            <Modal isOpen={!!editing} onClose={() => !isSaving && setEditing(null)} title={editing ? `Fee Structure — ${editing.name}` : ''} size="md">
                {editing && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {FEE_FIELDS.map(f => (
                                <div key={f.key}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label} (FCFA)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form[f.key] ?? ''}
                                        onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500">
                            New total (new student): <span className="font-semibold text-gray-900">
                                {money(FEE_FIELDS.filter(f => f.key !== 'oldStudentFee').reduce((s, f) => s + (Number(form[f.key]) || 0), 0))}
                            </span>
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setEditing(null)}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <Button onClick={save} isLoading={isSaving}>Save Fees</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
