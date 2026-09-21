// Staff loans + leave requests API client. Single-step super-manager approval.
import apiService from './apiService';

export type LoanStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'PAID_OFF';
export type LoanRepaymentMethod = 'SALARY_DEDUCTION' | 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'OTHER';

export const LOAN_REPAYMENT_METHODS: { value: LoanRepaymentMethod; label: string }[] = [
    { value: 'SALARY_DEDUCTION', label: 'Salary deduction' },
    { value: 'CASH', label: 'Cash' },
    { value: 'BANK_TRANSFER', label: 'Bank transfer' },
    { value: 'MOBILE_MONEY', label: 'Mobile money' },
    { value: 'OTHER', label: 'Other' },
];

export interface StaffLoanRepayment {
    id: number;
    amount: number;
    paidOn: string;
    method: LoanRepaymentMethod;
    notes?: string | null;
    recordedBy?: { id: number; name: string } | null;
    createdAt: string;
}

export interface StaffLoan {
    id: number;
    borrowerId: number;
    borrower?: { id: number; name: string; matricule?: string | null; email?: string };
    amount: number;
    durationMonths: number;
    monthlyInstallment: number;
    reason?: string | null;
    status: LoanStatus;
    repaymentMethod?: LoanRepaymentMethod | null;
    approver?: { id: number; name: string } | null;
    approverNote?: string | null;
    approvedAt?: string | null;
    cancelledAt?: string | null;
    paidOffAt?: string | null;
    createdAt: string;
    updatedAt: string;
    repayments?: StaffLoanRepayment[];
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type LeaveType = 'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'BEREAVEMENT' | 'UNPAID' | 'OTHER';

export const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
    { value: 'ANNUAL', label: 'Annual leave' },
    { value: 'SICK', label: 'Sick leave' },
    { value: 'MATERNITY', label: 'Maternity leave' },
    { value: 'PATERNITY', label: 'Paternity leave' },
    { value: 'BEREAVEMENT', label: 'Bereavement' },
    { value: 'UNPAID', label: 'Unpaid leave' },
    { value: 'OTHER', label: 'Other' },
];

export interface LeaveRequest {
    id: number;
    requesterId: number;
    requester?: { id: number; name: string; matricule?: string | null; email?: string };
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
    status: LeaveStatus;
    approver?: { id: number; name: string } | null;
    approverNote?: string | null;
    decidedAt?: string | null;
    cancelledAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

interface ApiEnvelope<T> {
    success: boolean;
    data: T;
    error?: string;
}

// ── Loans ───────────────────────────────────────────────────────────────────

export const loansApi = {
    listMine: () => apiService.get<ApiEnvelope<StaffLoan[]>>('/loans/mine'),

    list: (status?: LoanStatus | LoanStatus[]) => {
        const params = status ? { status: Array.isArray(status) ? status.join(',') : status } : undefined;
        return apiService.get<ApiEnvelope<StaffLoan[]>>('/loans', params ? { params } : undefined);
    },

    get: (id: number) => apiService.get<ApiEnvelope<StaffLoan>>(`/loans/${id}`),

    create: (body: { amount: number; durationMonths: number; reason?: string }) =>
        apiService.post<ApiEnvelope<StaffLoan>>('/loans', body),

    update: (id: number, body: { amount?: number; durationMonths?: number; reason?: string | null }) =>
        apiService.patch<ApiEnvelope<StaffLoan>>(`/loans/${id}`, body),

    cancel: (id: number) => apiService.post<ApiEnvelope<StaffLoan>>(`/loans/${id}/cancel`, {}),

    approve: (id: number, body: { repaymentMethod: LoanRepaymentMethod; note?: string }) =>
        apiService.post<ApiEnvelope<StaffLoan>>(`/loans/${id}/approve`, body),

    reject: (id: number, note: string) =>
        apiService.post<ApiEnvelope<StaffLoan>>(`/loans/${id}/reject`, { note }),

    recordRepayment: (id: number, body: { amount: number; paidOn?: string; method?: LoanRepaymentMethod; notes?: string }) =>
        apiService.post<ApiEnvelope<{ repayment: StaffLoanRepayment; loan: StaffLoan }>>(`/loans/${id}/repayments`, body),
};

// ── Leave ───────────────────────────────────────────────────────────────────

export const leaveApi = {
    listMine: () => apiService.get<ApiEnvelope<LeaveRequest[]>>('/leave/mine'),

    list: (status?: LeaveStatus | LeaveStatus[]) => {
        const params = status ? { status: Array.isArray(status) ? status.join(',') : status } : undefined;
        return apiService.get<ApiEnvelope<LeaveRequest[]>>('/leave', params ? { params } : undefined);
    },

    get: (id: number) => apiService.get<ApiEnvelope<LeaveRequest>>(`/leave/${id}`),

    create: (body: { leaveType: LeaveType; startDate: string; endDate: string; reason: string }) =>
        apiService.post<ApiEnvelope<LeaveRequest>>('/leave', body),

    cancel: (id: number) => apiService.post<ApiEnvelope<LeaveRequest>>(`/leave/${id}/cancel`, {}),

    approve: (id: number, note?: string) => apiService.post<ApiEnvelope<LeaveRequest>>(`/leave/${id}/approve`, { note }),

    reject: (id: number, note: string) => apiService.post<ApiEnvelope<LeaveRequest>>(`/leave/${id}/reject`, { note }),
};
