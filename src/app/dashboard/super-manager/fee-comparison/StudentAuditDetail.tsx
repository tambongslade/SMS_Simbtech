"use client";

import useSWR from 'swr';
import { XMarkIcon } from '@heroicons/react/24/outline';
import controlFeeService, { AuditRosterRow } from '@/lib/controlFeeService';
import { formatDOB } from '@/lib/formatDate';

interface PaymentRow {
    id: number;
    amount: number;
    paymentDate?: string | null;
    payment_date?: string | null;
    receiptNumber?: string | null;
    receipt_number?: string | null;
    paymentMethod?: string | null;
    payment_method?: string | null;
    notes?: string | null;
    recordedBy?: { id: number; name: string; matricule?: string | null } | null;
    recorded_by?: { id: number; name: string; matricule?: string | null } | null;
}

interface StudentComparisonResponse {
    student?: { id: number; name: string; matricule: string };
    class?: { name?: string; subClassName?: string };
    primaryFee?: {
        id: number;
        amountExpected: number;
        amountPaid: number;
        paymentsCount: number;
        payments: PaymentRow[];
    } | null;
    controlFee?: {
        id: number;
        amountExpected?: number;
        amountPaid: number;
        paymentsCount: number;
        payments: PaymentRow[];
    } | null;
}

const formatCurrency = (amount?: number | null) =>
    new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 })
        .format(amount ?? 0);

// Pick either camelCase or snake_case fields — the API middleware usually
// converts to camelCase, but we stay tolerant so hand-written callers work too.
const pick = <T,>(a: T | null | undefined, b: T | null | undefined): T | null | undefined =>
    a ?? b ?? null;

function PaymentList({
    title,
    subtitle,
    payments,
    emptyLabel,
    accent,
}: {
    title: string;
    subtitle: string;
    payments: PaymentRow[];
    emptyLabel: string;
    accent: 'green' | 'blue';
}) {
    const total = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
    const headerColor = accent === 'green' ? 'text-green-800' : 'text-blue-800';
    const badgeColor = accent === 'green' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700';

    return (
        <div className="flex-1 min-w-0 border border-gray-200 rounded-lg overflow-hidden">
            <div className={`px-4 py-3 border-b border-gray-200 ${accent === 'green' ? 'bg-green-50/60' : 'bg-blue-50/60'}`}>
                <p className={`text-sm font-semibold ${headerColor}`}>{title}</p>
                <p className="text-xs text-gray-600">{subtitle}</p>
                <p className={`mt-1 inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>
                    {payments.length} payment{payments.length === 1 ? '' : 's'} · {formatCurrency(total)}
                </p>
            </div>
            {payments.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">{emptyLabel}</div>
            ) : (
                <ul className="divide-y divide-gray-100">
                    {payments.map((p, idx) => {
                        const date = pick(p.paymentDate, p.payment_date);
                        const receipt = pick(p.receiptNumber, p.receipt_number);
                        const method = pick(p.paymentMethod, p.payment_method);
                        const recorded = pick(p.recordedBy, p.recorded_by);
                        return (
                            <li key={p.id ?? idx} className="p-4 space-y-1">
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="text-sm font-semibold text-gray-900">
                                        {formatCurrency(p.amount)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {date ? formatDOB(date) : 'No date'}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-600 space-y-0.5">
                                    <p>Method: <span className="font-medium text-gray-800">{method || '—'}</span></p>
                                    {receipt && <p>Receipt: <span className="font-medium text-gray-800">{receipt}</span></p>}
                                    {recorded?.name && (
                                        <p>
                                            Recorded by: <span className="font-medium text-gray-800">{recorded.name}</span>
                                            {recorded.matricule ? <span className="text-gray-400"> ({recorded.matricule})</span> : null}
                                        </p>
                                    )}
                                    {p.notes && <p className="italic text-gray-500">“{p.notes}”</p>}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

export default function StudentAuditDetail({
    row,
    academicYearId,
    onClose,
}: {
    row: AuditRosterRow | null;
    academicYearId?: number;
    onClose: () => void;
}) {
    const open = !!row;

    const { data, error, isLoading } = useSWR(
        open && row ? ['student-fee-comparison', row.studentId, academicYearId] : null,
        ([, studentId, yearId]) =>
            controlFeeService.getStudentComparison(studentId as number, yearId ? { academicYearId: yearId } : undefined),
        { revalidateOnFocus: false },
    );

    if (!open || !row) return null;

    const detail = (data?.data ?? null) as StudentComparisonResponse | null;

    const primaryPayments = detail?.primaryFee?.payments ?? [];
    const controlPayments = detail?.controlFee?.payments ?? [];

    const primaryTotal = primaryPayments.reduce((s, p) => s + (p.amount ?? 0), 0);
    const controlTotal = controlPayments.reduce((s, p) => s + (p.amount ?? 0), 0);
    const diff = primaryTotal - controlTotal;

    return (
        <div className="fixed inset-0 z-50 flex">
            <div
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
                aria-hidden
            />
            <aside className="relative ml-auto w-full max-w-3xl h-full bg-white shadow-xl flex flex-col">
                <header className="flex items-start justify-between gap-3 border-b border-gray-200 p-4">
                    <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Fee audit detail</p>
                        <h2 className="text-lg font-bold text-gray-900 truncate">{row.studentName}</h2>
                        <p className="text-sm text-gray-600">
                            {row.studentMatricule} · {row.className} — {row.subClassName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="text-gray-500 hover:text-gray-800 p-1 rounded hover:bg-gray-100"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-lg border border-gray-200 p-3">
                            <p className="text-xs text-gray-500">Bursar total</p>
                            <p className="text-base font-semibold text-green-700">{formatCurrency(primaryTotal)}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 p-3">
                            <p className="text-xs text-gray-500">Controller total</p>
                            <p className="text-base font-semibold text-blue-700">{formatCurrency(controlTotal)}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 p-3">
                            <p className="text-xs text-gray-500">Difference</p>
                            <p className={`text-base font-semibold ${Math.abs(diff) < 0.01 ? 'text-gray-500' : 'text-amber-700'}`}>
                                {Math.abs(diff) < 0.01 ? '—' : formatCurrency(Math.abs(diff))}
                            </p>
                        </div>
                    </div>

                    {isLoading && (
                        <p className="text-sm text-gray-500">Loading payment history…</p>
                    )}
                    {error && !isLoading && (
                        <p className="text-sm text-red-600">Failed to load payment history.</p>
                    )}

                    {!isLoading && !error && (
                        <div className="flex flex-col md:flex-row gap-4">
                            <PaymentList
                                title="Bursar ledger"
                                subtitle="Recorded by the Bursar / Fee Auditor"
                                payments={primaryPayments}
                                emptyLabel="No payments recorded by the bursar side."
                                accent="green"
                            />
                            <PaymentList
                                title="Controller ledger"
                                subtitle="Recorded by the Fee Controller"
                                payments={controlPayments}
                                emptyLabel="No payments recorded by the controller side."
                                accent="blue"
                            />
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}
