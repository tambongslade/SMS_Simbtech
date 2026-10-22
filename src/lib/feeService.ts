import apiService from './apiService';
import type { PaymentMethodCode } from './paymentMethods';

// Types for normal fees
export interface FeeRequest {
    studentId: number;
    amountExpected: number;
    amountPaid?: number;
    dueDate: string;
    academicYearId?: number;
}

export interface FeeResponse {
    id: number;
    amountExpected: number;
    amountPaid: number;
    dueDate: string;
    enrollmentId: number;
    academicYearId: number;
    student: {
        id: number;
        name: string;
        matricule: string;
    };
    enrollment: {
        id: number;
        studentId: number;
        subClassId: number;
        subClass: {
            id: number;
            name: string;
            classId: number;
            class: {
                id: number;
                name: string;
            };
        };
    };
    paymentTransactions: Array<{
        amount: number;
        paymentMethod: string;
        paymentDate?: string;
    }>;
    createdAt: string;
    updatedAt: string;
}

export interface PaymentRequest {
    amount: number;
    paymentMethod: 'EXPRESS_UNION' | 'CCA' | 'F3DC' | string;
    paymentDate?: string;
    description?: string;
}

// NEW: Unified payment request for the new endpoints
export interface UnifiedPaymentRequest {
    amount: number;
    /** YYYY-MM-DD; must not be in the future */
    paymentDate: string;
    paymentMethod: PaymentMethodCode | string;
    /** Optional manual receipt number; omitted -> server assigns the next sequential one */
    receiptNumber?: string;
    studentId: number;
    academicYearId?: number;
    notes?: string;
    /** Send true after the user confirms an overpayment warning (409 OVERPAYMENT_CONFIRMATION_REQUIRED) */
    confirmOverpayment?: boolean;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    message?: string;
}

// Fee Service
export const feeService = {
    // Fee Management
    getAllFees: (params?: any): Promise<ApiResponse<FeeResponse[]>> =>
        apiService.get('/fees', { params }),

    getFeeById: (id: number): Promise<ApiResponse<FeeResponse>> =>
        apiService.get(`/fees/${id}`),

    createFee: (data: FeeRequest): Promise<ApiResponse<FeeResponse>> =>
        apiService.post('/fees', data),

    updateFee: (id: number, data: Partial<FeeRequest>): Promise<ApiResponse<FeeResponse>> =>
        apiService.put(`/fees/${id}`, data),

    deleteFee: (id: number): Promise<ApiResponse<void>> =>
        apiService.delete(`/fees/${id}`),

    // Student-specific fees
    getFeesByStudent: (studentId: number, params?: any): Promise<ApiResponse<FeeResponse[]>> =>
        apiService.get(`/fees/student/${studentId}`, { params }),

    // Subclass fee summary
    getFeeSubclassSummary: (subClassId: number, params?: any): Promise<ApiResponse<any>> =>
        apiService.get(`/fees/sub_class/${subClassId}/summary`, { params }),

    // Fee Payments
    getFeePayments: (feeId: number): Promise<ApiResponse<any[]>> =>
        apiService.get(`/fees/${feeId}/payments`),

    // Legacy payment method (for existing fees)
    recordFeePayment: (feeId: number, paymentData: PaymentRequest): Promise<ApiResponse<any>> =>
        apiService.post(`/fees/${feeId}/payments`, paymentData),

    // NEW: Unified primary payment endpoint (auto-creates fee if needed)
    // silent: the caller shows its own message (and handles the overpayment confirmation code)
    recordUnifiedPrimaryPayment: (paymentData: UnifiedPaymentRequest): Promise<ApiResponse<any>> =>
        apiService.post('/payments/primary', paymentData, { silent: true }),

    /** Printable receipt PDF for one payment (reprint=true stamps "DUPLICATE"). */
    getReceiptPdf: (paymentId: number | string, reprint = false): Promise<Blob> =>
        apiService.get(`/fees/payments/${paymentId}/receipt/pdf${reprint ? '?reprint=true' : ''}`, {}, 'blob'),

    // Fee Export
    exportFees: (params?: any): Promise<Blob> =>
        apiService.get('/fees/export', { params }, 'blob'),
};

export default feeService;