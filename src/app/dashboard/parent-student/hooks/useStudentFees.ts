import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { fetchChildDetails } from '@/lib/parentPortalApi';

// Public parent portal fee data — sourced from
// GET /parents/:matricule/details (fees section) so no JWT is required.

export interface PaymentHistory {
    id: number;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    receiptNumber?: string;
    recordedBy: string;
}

export interface OutstandingFeeItem {
    id: number;
    feeType: string;
    amountDue: number;
    dueDate?: string;
    description?: string;
}

export interface StudentFeeData {
    matricule: string;
    studentName: string;
    totalExpected: number;
    totalPaid: number;
    outstandingBalance: number;
    urgency?: 'PAID' | 'OK' | 'DUE_SOON' | 'OVERDUE';
    daysOverdue?: number;
    dueDate?: string | null;
    lastPaymentDate?: string;
    paymentHistory: PaymentHistory[];
    outstandingFees: OutstandingFeeItem[];
    items?: Array<{
        id: number;
        name: string;
        description?: string | null;
        amountExpected: number;
        amountPaid: number;
        outstanding: number;
        status: 'PAID' | 'PARTIAL' | 'UNPAID';
    }>;
}

export function useStudentFees(matricule: string | null) {
    const [data, setData] = useState<StudentFeeData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!matricule) { setIsLoading(false); return; }
        setIsLoading(true);
        setError(null);
        try {
            const details: any = await fetchChildDetails(matricule);
            const fees = details?.fees;
            if (!fees) {
                setData(null);
                return;
            }
            const processed: StudentFeeData = {
                matricule: details.matricule || matricule,
                studentName: details.name,
                totalExpected: Number(fees.totalExpected ?? 0),
                totalPaid: Number(fees.totalPaid ?? 0),
                outstandingBalance: Number(fees.outstandingBalance ?? 0),
                urgency: fees.urgency,
                daysOverdue: fees.daysOverdue,
                dueDate: fees.dueDate ?? null,
                lastPaymentDate: fees.lastPaymentDate,
                paymentHistory: (fees.paymentHistory || []).map((p: any) => ({
                    id: p.id,
                    amount: p.amount,
                    paymentDate: p.paymentDate,
                    paymentMethod: p.paymentMethod,
                    receiptNumber: p.receiptNumber,
                    recordedBy: p.recordedBy || 'Unknown',
                })),
                outstandingFees: (fees.items || [])
                    .filter((it: any) => (it.outstanding ?? 0) > 0)
                    .map((it: any) => ({
                        id: it.id,
                        feeType: it.name,
                        amountDue: it.outstanding,
                        description: it.description,
                    })),
                items: (fees.items || []).map((it: any) => ({
                    id: it.id,
                    name: it.name,
                    description: it.description,
                    amountExpected: it.amountExpected,
                    amountPaid: it.amountPaid,
                    outstanding: it.outstanding,
                    status: it.status,
                })),
            };
            setData(processed);
        } catch (err: any) {
            const message = err?.message || 'Failed to load fees.';
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }, [matricule]);

    useEffect(() => { fetchData(); }, [fetchData]);

    return { data, isLoading, error, refetch: fetchData };
}
