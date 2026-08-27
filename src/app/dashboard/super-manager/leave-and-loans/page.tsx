'use client';

// Super-manager approval queue for staff loans and leave.

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import {
    Card, CardHeader, CardTitle, CardBody, Button, Modal, Badge,
} from '@/components/ui';
import {
    loansApi, leaveApi, LOAN_REPAYMENT_METHODS,
    type StaffLoan, type LeaveRequest, type LoanRepaymentMethod,
} from '@/lib/staffRequestsApi';
import { formatDOB } from '@/lib/formatDate';

const formatMoney = (n?: number | null) => `FCFA ${(n ?? 0).toLocaleString()}`;

function ApproveLoanModal({
    loan,
    onClose,
    onDone,
}: {
    loan: StaffLoan | null;
    onClose: () => void;
    onDone: () => void;
}) {
    const [method, setMethod] = useState<LoanRepaymentMethod>('SALARY_DEDUCTION');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    if (!loan) return null;

    const approve = async () => {
        setSaving(true);
        try {
            await loansApi.approve(loan.id, { repaymentMethod: method, note: note || undefined });
            toast.success('Loan approved');
            onDone();
            onClose();
            setNote('');
        } catch (e: any) {
            toast.error(e?.message || 'Failed to approve');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={!!loan} onClose={onClose} title={`Approve loan for ${loan.borrower?.name ?? 'staff'}`}>
            <div className="space-y-3">
                <div className="text-sm text-gray-700">
                    <p><strong>Amount:</strong> {formatMoney(loan.amount)}</p>
                    <p><strong>Duration:</strong> {loan.durationMonths} months</p>
                    <p><strong>Monthly:</strong> {formatMoney(loan.monthlyInstallment)}</p>
                    {loan.reason && <p className="italic text-gray-500 mt-1">“{loan.reason}”</p>}
                </div>
                <label className="block">
                    <span className="text-sm font-medium text-gray-700">Repayment method</span>
                    <select
                        value={method}
                        onChange={e => setMethod(e.target.value as LoanRepaymentMethod)}
                        className="mt-1 w-full input-field"
                    >
                        {LOAN_REPAYMENT_METHODS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </label>
                <label className="block">
                    <span className="text-sm font-medium text-gray-700">Note (optional)</span>
                    <textarea
                        rows={2}
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        className="mt-1 w-full input-field"
                    />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button color="success" onClick={approve} disabled={saving}>
                        {saving ? 'Approving…' : 'Approve'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

function RejectModal({
    open,
    title,
    onClose,
    onSubmit,
}: {
    open: boolean;
    title: string;
    onClose: () => void;
    onSubmit: (note: string) => Promise<void>;
}) {
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!note.trim()) return toast.error('A note is required');
        setSaving(true);
        try {
            await onSubmit(note.trim());
            setNote('');
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={open} onClose={onClose} title={title}>
            <div className="space-y-3">
                <label className="block">
                    <span className="text-sm font-medium text-gray-700">Reason</span>
                    <textarea
                        rows={3}
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        className="mt-1 w-full input-field"
                        placeholder="Why is this being rejected?"
                    />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button color="danger" onClick={submit} disabled={saving}>{saving ? 'Rejecting…' : 'Reject'}</Button>
                </div>
            </div>
        </Modal>
    );
}

export default function SuperManagerLeaveAndLoansPage() {
    const { data: loansData, isLoading: loansLoading, mutate: mutateLoans } = useSWR(
        'admin-loans-pending', () => loansApi.list(), { revalidateOnFocus: false },
    );
    const { data: leaveData, isLoading: leaveLoading, mutate: mutateLeave } = useSWR(
        'admin-leave-pending', () => leaveApi.list(), { revalidateOnFocus: false },
    );

    const loans = loansData?.data ?? [];
    const leave = leaveData?.data ?? [];

    const pendingLoans = useMemo(() => loans.filter(l => l.status === 'PENDING'), [loans]);
    const otherLoans = useMemo(() => loans.filter(l => l.status !== 'PENDING'), [loans]);
    const pendingLeave = useMemo(() => leave.filter(l => l.status === 'PENDING'), [leave]);
    const otherLeave = useMemo(() => leave.filter(l => l.status !== 'PENDING'), [leave]);

    const [approvingLoan, setApprovingLoan] = useState<StaffLoan | null>(null);
    const [rejectingLoan, setRejectingLoan] = useState<StaffLoan | null>(null);
    const [rejectingLeave, setRejectingLeave] = useState<LeaveRequest | null>(null);

    const approveLeave = async (item: LeaveRequest) => {
        try {
            await leaveApi.approve(item.id);
            toast.success('Leave approved');
            mutateLeave();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to approve');
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Leave &amp; loans — approvals</h1>
                <p className="text-sm text-gray-600 mt-0.5">
                    Approve or reject staff requests. Pick the repayment method when you approve a loan.
                </p>
            </div>

            {/* ── Pending loans ─────────────────────────────────────── */}
            <Card>
                <CardHeader><CardTitle>Pending loan requests ({pendingLoans.length})</CardTitle></CardHeader>
                <CardBody>
                    {loansLoading ? (
                        <p className="text-sm text-gray-500">Loading…</p>
                    ) : pendingLoans.length === 0 ? (
                        <p className="text-sm text-gray-500">Nothing to approve.</p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {pendingLoans.map(loan => (
                                <li key={loan.id} className="py-3 flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {loan.borrower?.name ?? 'Staff'}
                                            <span className="text-gray-500 font-normal"> · {formatMoney(loan.amount)} over {loan.durationMonths} months</span>
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatMoney(loan.monthlyInstallment)}/mo · requested {formatDOB(loan.createdAt)}
                                        </p>
                                        {loan.reason && <p className="text-xs text-gray-600 italic mt-1">“{loan.reason}”</p>}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button size="sm" color="success" onClick={() => setApprovingLoan(loan)}>Approve</Button>
                                        <Button size="sm" color="danger" variant="outline" onClick={() => setRejectingLoan(loan)}>Reject</Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardBody>
            </Card>

            {/* ── Pending leave ─────────────────────────────────────── */}
            <Card>
                <CardHeader><CardTitle>Pending leave requests ({pendingLeave.length})</CardTitle></CardHeader>
                <CardBody>
                    {leaveLoading ? (
                        <p className="text-sm text-gray-500">Loading…</p>
                    ) : pendingLeave.length === 0 ? (
                        <p className="text-sm text-gray-500">Nothing to approve.</p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {pendingLeave.map(item => (
                                <li key={item.id} className="py-3 flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {item.requester?.name ?? 'Staff'}
                                            <span className="text-gray-500 font-normal"> · {item.leaveType.replace('_', ' ')}</span>
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatDOB(item.startDate)} → {formatDOB(item.endDate)} · requested {formatDOB(item.createdAt)}
                                        </p>
                                        {item.reason && <p className="text-xs text-gray-600 italic mt-1">“{item.reason}”</p>}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button size="sm" color="success" onClick={() => approveLeave(item)}>Approve</Button>
                                        <Button size="sm" color="danger" variant="outline" onClick={() => setRejectingLeave(item)}>Reject</Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardBody>
            </Card>

            {/* ── History ───────────────────────────────────────────── */}
            <Card>
                <CardHeader><CardTitle>Recent decisions</CardTitle></CardHeader>
                <CardBody className="space-y-4">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Loans</p>
                        {otherLoans.length === 0 ? (
                            <p className="text-sm text-gray-500">No history.</p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {otherLoans.slice(0, 10).map(loan => (
                                    <li key={loan.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                                        <span className="truncate">
                                            {loan.borrower?.name} · {formatMoney(loan.amount)}
                                        </span>
                                        <Badge color={loan.status === 'APPROVED' ? 'green' : loan.status === 'REJECTED' ? 'red' : 'gray'} size="sm">
                                            {loan.status.replace('_', ' ')}
                                        </Badge>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Leave</p>
                        {otherLeave.length === 0 ? (
                            <p className="text-sm text-gray-500">No history.</p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {otherLeave.slice(0, 10).map(item => (
                                    <li key={item.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                                        <span className="truncate">
                                            {item.requester?.name} · {item.leaveType.replace('_', ' ')} · {formatDOB(item.startDate)} → {formatDOB(item.endDate)}
                                        </span>
                                        <Badge color={item.status === 'APPROVED' ? 'green' : item.status === 'REJECTED' ? 'red' : 'gray'} size="sm">
                                            {item.status}
                                        </Badge>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </CardBody>
            </Card>

            <ApproveLoanModal
                loan={approvingLoan}
                onClose={() => setApprovingLoan(null)}
                onDone={() => mutateLoans()}
            />
            <RejectModal
                open={!!rejectingLoan}
                title={`Reject loan for ${rejectingLoan?.borrower?.name ?? 'staff'}`}
                onClose={() => setRejectingLoan(null)}
                onSubmit={async (note) => {
                    try {
                        await loansApi.reject(rejectingLoan!.id, note);
                        toast.success('Loan rejected');
                        mutateLoans();
                    } catch (e: any) {
                        toast.error(e?.message || 'Failed to reject');
                    }
                }}
            />
            <RejectModal
                open={!!rejectingLeave}
                title={`Reject leave for ${rejectingLeave?.requester?.name ?? 'staff'}`}
                onClose={() => setRejectingLeave(null)}
                onSubmit={async (note) => {
                    try {
                        await leaveApi.reject(rejectingLeave!.id, note);
                        toast.success('Leave rejected');
                        mutateLeave();
                    } catch (e: any) {
                        toast.error(e?.message || 'Failed to reject');
                    }
                }}
            />
        </div>
    );
}
