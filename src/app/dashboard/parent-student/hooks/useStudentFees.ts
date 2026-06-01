
import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface PaymentHistory {
    id: number;
    amount: number;
    paymentDate: string;
    paymentMethod: string; // Allow any payment method string
    receiptNumber?: string;
    recordedBy: string;
    notes?: string;
}

export interface OutstandingFee {
    id: number;
    feeType: string;
    amountDue: number;
    dueDate: string;
    daysOverdue?: number;
    description?: string;
}

export interface StudentFeeData {
    studentId: number;
    studentName: string;
    studentMatricule: string;
    academicYear: string;
    totalExpected: number;
    totalPaid: number;
    outstandingBalance: number;
    lastPaymentDate?: string;
    nextDueDate?: string;
    feeSummary: {
        schoolFees: number;
        miscellaneousFees: number;
        newStudentFees?: number;
        termFees: {
            firstTerm: number;
            secondTerm: number;
            thirdTerm: number;
        };
    };
    paymentHistory: PaymentHistory[];
    outstandingFees: OutstandingFee[];
    paymentMethodBreakdown: {
        method: string;
        totalAmount: number;
        transactionCount: number;
        percentage: number;
    }[];
}

export function useStudentFees(studentId: number) {
    const [data, setData] = useState<StudentFeeData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!studentId) return;

        setIsLoading(true);
        setError(null);

        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('Authentication token not found.');
            }

            const response = await fetch(`${API_BASE_URL}/fees/student/${studentId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch fee data.');
            }

            const result = await response.json();

            // Process the raw API data into the expected format
            const feeRecords = result.data;
            if (!feeRecords || feeRecords.length === 0) {
                setData(null);
                return;
            }

            // Calculate totals across all academic years
            const totalExpected = feeRecords.reduce((sum: number, record: any) => sum + record.amountExpected, 0);
            const totalPaid = feeRecords.reduce((sum: number, record: any) => sum + record.amountPaid, 0);
            const outstandingBalance = totalExpected - totalPaid;

            // Get student info from first record
            const studentInfo = feeRecords[0].enrollment.student;
            const currentAcademicYear = feeRecords.find((r: any) => r.academicYear.isCurrent)?.academicYear.name ||
                feeRecords[0].academicYear.name;

            // Collect all payment transactions
            const allPayments: PaymentHistory[] = [];
            feeRecords.forEach((record: any) => {
                record.paymentTransactions.forEach((payment: any) => {
                    allPayments.push({
                        id: payment.id,
                        amount: payment.amount,
                        paymentDate: payment.paymentDate,
                        paymentMethod: payment.paymentMethod,
                        receiptNumber: payment.receiptNumber,
                        recordedBy: `User ${payment.recordedById}`,
                        notes: payment.notes
                    });
                });
            });

            // Sort payments by date (most recent first)
            allPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

            // Get outstanding fees (records with outstanding balance)
            const outstandingFees: OutstandingFee[] = feeRecords
                .filter((record: any) => record.amountExpected > record.amountPaid)
                .map((record: any) => ({
                    id: record.id,
                    feeType: `${record.academicYear.name} Academic Fees`,
                    amountDue: record.amountExpected - record.amountPaid,
                    dueDate: record.dueDate,
                    description: `Outstanding fees for ${record.academicYear.name}`
                }));

            // Calculate payment method breakdown
            const methodBreakdown: { [key: string]: { totalAmount: number; transactionCount: number } } = {};
            allPayments.forEach(payment => {
                if (!methodBreakdown[payment.paymentMethod]) {
                    methodBreakdown[payment.paymentMethod] = { totalAmount: 0, transactionCount: 0 };
                }
                methodBreakdown[payment.paymentMethod].totalAmount += payment.amount;
                methodBreakdown[payment.paymentMethod].transactionCount++;
            });

            const paymentMethodBreakdown = Object.entries(methodBreakdown).map(([method, data]) => ({
                method,
                totalAmount: data.totalAmount,
                transactionCount: data.transactionCount,
                percentage: totalPaid > 0 ? (data.totalAmount / totalPaid) * 100 : 0
            }));

            // Get fee structure from class info (if available)
            const classInfo = feeRecords[0].enrollment.subClass.class;

            const processedData: StudentFeeData = {
                studentId: studentInfo.id,
                studentName: studentInfo.name,
                studentMatricule: studentInfo.matricule,
                academicYear: currentAcademicYear,
                totalExpected,
                totalPaid,
                outstandingBalance,
                lastPaymentDate: allPayments.length > 0 ? allPayments[0].paymentDate : undefined,
                nextDueDate: outstandingFees.length > 0 ? outstandingFees[0].dueDate : undefined,
                feeSummary: {
                    schoolFees: classInfo.baseFee || 0,
                    miscellaneousFees: classInfo.miscellaneousFee || 0,
                    newStudentFees: classInfo.newStudentFee || 0,
                    termFees: {
                        firstTerm: classInfo.firstTermFee || 0,
                        secondTerm: classInfo.secondTermFee || 0,
                        thirdTerm: classInfo.thirdTermFee || 0
                    }
                },
                paymentHistory: allPayments,
                outstandingFees,
                paymentMethodBreakdown
            };

            setData(processedData);
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, isLoading, error, refetch: fetchData };
} 