import apiService from './apiService';

// Types for control fees (identical to regular fees)
export interface ControlFeeRequest {
    studentId: number;
    amountExpected: number;
    amountPaid?: number;
    dueDate: string;
    academicYearId?: number;
}

export interface ControlFeeResponse {
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
    paymentDate: string;
    paymentMethod: 'EXPRESS_UNION' | 'CCA' | 'F3DC' | string;
    receiptNumber?: string;
    studentId: number;
    academicYearId?: number;
}



// Types for fee comparison
export interface DiscrepancyResponse {
    studentId: number;
    studentName: string;
    studentMatricule: string;
    className?: string;
    subClassName?: string;
    discrepancyType: 'MISSING_PRIMARY' | 'MISSING_CONTROL' | 'PAYMENT_MISMATCH';
    primaryFee?: {
        id: number;
        amountExpected: number;
        amountPaid: number;
        dueDate: string;
    };
    controlFee?: {
        id: number;
        amountExpected?: number;
        amountPaid: number;
        dueDate: string;
    };
    paidAmountDifference?: number;
    variancePercentage?: number;
}

export interface ComparisonSummary {
    totalStudents: number;
    totalDiscrepancies: number;
    studentsWithBothFees: number;
    studentsWithOnlyPrimaryFees?: number;
    studentsWithOnlyControlFees?: number;
    averageVariancePercentage: number;
    discrepancyTypes: {
        missingPrimary: number;
        missingControl: number;
        paymentMismatch: number;
    };
}

export type AuditStatus = 'MATCHED' | 'PAYMENT_MISMATCH' | 'MISSING_PRIMARY' | 'MISSING_CONTROL' | 'NO_RECORDS';

export interface AuditRosterRow {
    studentId: number;
    studentName: string;
    studentMatricule: string;
    className: string;
    subClassName: string;
    enrollmentId: number;
    primary: {
        amountExpected: number;
        amountPaid: number;
        paymentsCount: number;
    } | null;
    control: {
        amountPaid: number;
        paymentsCount: number;
    } | null;
    paidAmountDifference: number;
    status: AuditStatus;
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

// Control Fee Service
export const controlFeeService = {
    // Control Fee Management (identical to regular fees)
    getAllControlFees: (params?: any): Promise<ApiResponse<ControlFeeResponse[]>> =>
        apiService.get('/control-fees', { params }),

    getControlFeeById: (id: number): Promise<ApiResponse<ControlFeeResponse>> =>
        apiService.get(`/control-fees/${id}`),

    // Student-specific control fees
    getControlFeesByStudent: (studentId: number, params?: any): Promise<ApiResponse<ControlFeeResponse[]>> =>
        apiService.get(`/control-fees/student/${studentId}`, { params }),

    // Subclass control fee summary
    getControlFeeSubclassSummary: (subClassId: number, params?: any): Promise<ApiResponse<any>> =>
        apiService.get(`/control-fees/sub_class/${subClassId}/summary`, { params }),

    // Control Fee Payments
    getControlFeePayments: (controlFeeId: number): Promise<ApiResponse<any[]>> =>
        apiService.get(`/control-fees/${controlFeeId}/payments`),

    // Control Fee Export
    exportControlFees: (params?: any): Promise<Blob> =>
        apiService.get('/control-fees/export', { params }, 'blob'),

    // Fee Comparison Endpoints (Super Admin Only)
    getDiscrepancies: (params?: any): Promise<ApiResponse<DiscrepancyResponse[]>> =>
        apiService.get('/fee-comparison/discrepancies', { params }),

    getComparisonSummary: (params?: any): Promise<ApiResponse<ComparisonSummary>> =>
        apiService.get('/fee-comparison/summary', { params }),

    getStudentComparison: (studentId: number, params?: any): Promise<ApiResponse<any>> =>
        apiService.get(`/fee-comparison/student/${studentId}`, { params }),

    exportDiscrepancies: (params?: any): Promise<Blob> =>
        apiService.get('/fee-comparison/export', { params }, 'blob'),

    getAuditRoster: (params?: {
        academicYearId?: number;
        page?: number;
        limit?: number;
        classId?: number | string;
        subClassId?: number | string;
        search?: string;
        status?: AuditStatus | '';
    }): Promise<ApiResponse<{ data: AuditRosterRow[]; meta: { total: number; totalPages: number; page: number; limit: number; academicYearId: number } }>> =>
        apiService.get('/fee-comparison/students', { params }),
};

export default controlFeeService;