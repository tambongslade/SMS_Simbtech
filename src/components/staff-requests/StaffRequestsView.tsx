'use client';

// Shared staff-facing page for loans + leave. Any role sees the same UI:
// request a loan, request leave, and see the status of everything they've asked
// for. Cancel/modify only works while a request is still PENDING.

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import {
    Card, CardHeader, CardTitle, CardBody, Button, Modal, Badge,
} from '@/components/ui';
import {
    loansApi,
    leaveApi,
    LEAVE_TYPES,
    type StaffLoan,
    type LeaveRequest,
    type LoanStatus,
    type LeaveStatus,
    type LeaveType,
} from '@/lib/staffRequestsApi';
import { formatDOB } from '@/lib/formatDate';

const formatMoney = (n?: number | null) =>
    `FCFA ${(n ?? 0).toLocaleString()}`;

const LOAN_BADGE: Record<LoanStatus, 'yellow' | 'green' | 'red' | 'gray' | 'blue'> = {
    PENDING: 'yellow',
    APPROVED: 'green',
    REJECTED: 'red',
    CANCELLED: 'gray',
    PAID_OFF: 'blue',
};

const LEAVE_BADGE: Record<LeaveStatus, 'yellow' | 'green' | 'red' | 'gray'> = {
    PENDING: 'yellow',
    APPROVED: 'green',
    REJECTED: 'red',
    CANCELLED: 'gray',
};

// ── Loan form modal ────────────────────────────────────────────────────────

function LoanFormModal({
    open,
    initial,
    onClose,
    onSaved,
}: {
    open: boolean;
    initial?: StaffLoan | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '');
    const [duration, setDuration] = useState(initial?.durationMonths ? String(initial.durationMonths) : '');
    const [reason, setReason] = useState(initial?.reason ?? '');
    const [saving, setSaving] = useState(false);

    const monthly = useMemo(() => {
        const a = parseFloat(amount);
        const d = parseInt(duration, 10);
        if (!a || !d || d <= 0) return null;
        return a / d;
    }, [amount, duration]);

    const submit = async () => {
        const a = parseFloat(amount);
        const d = parseInt(duration, 10);
        if (!a || a <= 0) return toast.error('Enter a positive amount');
        if (!d || d <= 0) return toast.error('Enter a duration in months');
        setSaving(true);
        try {
            if (initial) {
                await loansApi.update(initial.id, { amount: a, durationMonths: d, reason: reason || null });
                toast.success('Loan request updated');
            } else {
                await loansApi.create({ amount: a, durationMonths: d, reason: reason || undefined });
                toast.success('Loan request submitted');
            }
            onSaved();
            onClose();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to save loan request');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={open} onClose={onClose} title={initial ? 'Modify loan request' : 'Request a loan'}>
            <div className="space-y-3">
                <label className="block">
                    <span className="text-sm font-medium text-gray-700">Amount (FCFA)</span>
                    <input
                        type="number"
                        min={1}
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="mt-1 w-full input-field"
                        placeholder="e.g. 100000"
                    />
                </label>
                <label className="block">
                    <span className="text-sm font-medium text-gray-700">Duration (months)</span>
                    <input
                        type="number"
                        min={1}
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                        className="mt-1 w-full input-field"
                        placeholder="e.g. 10"
                    />
                </label>
                {monthly != null && (
                    <p className="text-xs text-gray-600">
                        Monthly instalment: <span className="font-semibold text-gray-900">{formatMoney(monthly)}</span>
                    </p>
                )}
                <label className="block">
                    <span className="text-sm font-medium text-gray-700">Reason (optional)</span>
                    <textarea
                        rows={3}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        className="mt-1 w-full input-field"
                        placeholder="Anything the super manager should know"
                    />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : (initial ? 'Save changes' : 'Submit request')}</Button>
                </div>
            </div>
        </Modal>
    );
}

// ── Leave form modal ──────────────────────────────────────────────────────

function LeaveFormModal({
    open,
    onClose,
    onSaved,
}: {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [type, setType] = useState<LeaveType>('ANNUAL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!startDate || !endDate) return toast.error('Pick both start and end dates');
        if (!reason.trim()) return toast.error('Reason is required');
        setSaving(true);
        try {
            await leaveApi.create({ leaveType: type, startDate, endDate, reason: reason.trim() });
            toast.success('Leave request submitted');
            onSaved();
            onClose();
            setStartDate(''); setEndDate(''); setReason(''); setType('ANNUAL');
        } catch (e: any) {
            toast.error(e?.message || 'Failed to submit leave request');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={open} onClose={onClose} title="Request leave">
            <div className="space-y-3">
                <label className="block">
                    <span className="text-sm font-medium text-gray-700">Leave type</span>
                    <select
                        value={type}
                        onChange={e => setType(e.target.value as LeaveType)}
                        className="mt-1 w-full input-field"
                    >
                        {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                        <span className="text-sm font-medium text-gray-700">Start date</span>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full input-field" />
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium text-gray-700">End date</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full input-field" />
                    </label>
                </div>
                <label className="block">
                    <span className="text-sm font-medium text-gray-700">Reason</span>
                    <textarea
                        rows={3}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        className="mt-1 w-full input-field"
                        placeholder="Family event, medical, ..."
                    />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Submit request'}</Button>
                </div>
            </div>
        </Modal>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function StaffRequestsView() {
    const { data: loansData, error: loansError, isLoading: loansLoading, mutate: mutateLoans } = useSWR(
        'my-loans',
        () => loansApi.listMine(),
        { revalidateOnFocus: false },
    );
    const { data: leaveData, error: leaveError, isLoading: leaveLoading, mutate: mutateLeave } = useSWR(
        'my-leave',
        () => leaveApi.listMine(),
        { revalidateOnFocus: false },
    );

    const loans = loansData?.data ?? [];
    const leave = leaveData?.data ?? [];

    const [showLoanForm, setShowLoanForm] = useState(false);
    const [editingLoan, setEditingLoan] = useState<StaffLoan | null>(null);
    const [showLeaveForm, setShowLeaveForm] = useState(false);

    const cancelLoan = async (loan: StaffLoan) => {
        if (!confirm(`Cancel loan request for ${formatMoney(loan.amount)}?`)) return;
        try {
            await loansApi.cancel(loan.id);
            toast.success('Loan request cancelled');
            mutateLoans();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to cancel');
        }
    };

    const cancelLeave = async (item: LeaveRequest) => {
        if (!confirm('Cancel this leave request?')) return;
        try {
            await leaveApi.cancel(item.id);
            toast.success('Leave request cancelled');
            mutateLeave();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to cancel');
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Leave &amp; loans</h1>
                <p className="text-sm text-gray-600 mt-0.5">
                    Request a loan or time off. The super manager approves and picks the repayment method.
                </p>
            </div>

            {/* ── Loans ───────────────────────────────────────────────── */}
            <Card>
                <CardHeader className="flex items-center justify-between">
                    <CardTitle>My loan requests</CardTitle>
                    <Button onClick={() => { setEditingLoan(null); setShowLoanForm(true); }}>
                        + Request loan
                    </Button>
                </CardHeader>
                <CardBody>
                    {loansLoading ? (
                        <p className="text-sm text-gray-500">Loading…</p>
                    ) : loansError ? (
                        <p className="text-sm text-red-600">Failed to load loans.</p>
                    ) : loans.length === 0 ? (
                        <p className="text-sm text-gray-500">No loan requests yet.</p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {loans.map(loan => {
                                const paid = (loan.repayments ?? []).reduce((s, r) => s + r.amount, 0);
                                const outstanding = Math.max(0, loan.amount - paid);
                                return (
                                    <li key={loan.id} className="py-3 flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900">
                                                {formatMoney(loan.amount)} · {loan.durationMonths} months
                                                <span className="text-gray-500 font-normal"> — {formatMoney(loan.monthlyInstallment)}/mo</span>
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Requested {formatDOB(loan.createdAt)}
                                                {loan.approvedAt ? ` · decided ${formatDOB(loan.approvedAt)}` : ''}
                                            </p>
                                            {loan.reason && <p className="text-xs text-gray-600 mt-1 italic">“{loan.reason}”</p>}
                                            {loan.status === 'APPROVED' && (
                                                <p className="text-xs text-gray-600 mt-1">
                                                    Method: <span className="font-medium text-gray-800">{loan.repaymentMethod ?? '—'}</span>
                                                    {paid > 0 && <> · Paid {formatMoney(paid)} · Outstanding {formatMoney(outstanding)}</>}
                                                </p>
                                            )}
                                            {loan.approverNote && loan.status !== 'PENDING' && (
                                                <p className="text-xs text-gray-600 mt-1">
                                                    Note: <span className="italic">{loan.approverNote}</span>
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge color={LOAN_BADGE[loan.status]} size="sm">{loan.status.replace('_', ' ')}</Badge>
                                            {loan.status === 'PENDING' && (
                                                <>
                                                    <Button size="sm" variant="outline" onClick={() => { setEditingLoan(loan); setShowLoanForm(true); }}>
                                                        Modify
                                                    </Button>
                                                    <Button size="sm" variant="outline" color="danger" onClick={() => cancelLoan(loan)}>
                                                        Cancel
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardBody>
            </Card>

            {/* ── Leave ───────────────────────────────────────────────── */}
            <Card>
                <CardHeader className="flex items-center justify-between">
                    <CardTitle>My leave requests</CardTitle>
                    <Button onClick={() => setShowLeaveForm(true)}>+ Request leave</Button>
                </CardHeader>
                <CardBody>
                    {leaveLoading ? (
                        <p className="text-sm text-gray-500">Loading…</p>
                    ) : leaveError ? (
                        <p className="text-sm text-red-600">Failed to load leave requests.</p>
                    ) : leave.length === 0 ? (
                        <p className="text-sm text-gray-500">No leave requests yet.</p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {leave.map(item => (
                                <li key={item.id} className="py-3 flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {item.leaveType.replace('_', ' ')} · {formatDOB(item.startDate)} → {formatDOB(item.endDate)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Requested {formatDOB(item.createdAt)}
                                            {item.decidedAt ? ` · decided ${formatDOB(item.decidedAt)}` : ''}
                                        </p>
                                        {item.reason && <p className="text-xs text-gray-600 mt-1 italic">“{item.reason}”</p>}
                                        {item.approverNote && item.status !== 'PENDING' && (
                                            <p className="text-xs text-gray-600 mt-1">
                                                Note: <span className="italic">{item.approverNote}</span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge color={LEAVE_BADGE[item.status]} size="sm">{item.status}</Badge>
                                        {item.status === 'PENDING' && (
                                            <Button size="sm" variant="outline" color="danger" onClick={() => cancelLeave(item)}>
                                                Cancel
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardBody>
            </Card>

            <LoanFormModal
                open={showLoanForm}
                initial={editingLoan}
                onClose={() => { setShowLoanForm(false); setEditingLoan(null); }}
                onSaved={() => mutateLoans()}
            />
            <LeaveFormModal
                open={showLeaveForm}
                onClose={() => setShowLeaveForm(false)}
                onSaved={() => mutateLeave()}
            />
        </div>
    );
}
