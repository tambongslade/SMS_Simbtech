import apiService from './apiService';

export type FeeScope = 'ALL' | 'CLASS' | 'SUBCLASS';
export type FeePaymentMethod = 'EXPRESS_UNION' | 'CCA' | 'F3DC';

export interface FeeItem {
  id: number;
  name: string;
  description?: string | null;
  amount: number;
  academicYearId: number;
  scope: FeeScope;
  classId?: number | null;
  subClassId?: number | null;
  requiresSchoolFeesPaid: boolean;
  isActive: boolean;
  createdById?: number;
  createdAt?: string;
  updatedAt?: string;
  class?: { id: number; name: string } | null;
  subClass?: { id: number; name: string } | null;
  academicYear?: { id: number; name: string; isCurrent?: boolean } | null;
  // Present only on the enrollment-applicable endpoint:
  amountPaid?: number;
  balance?: number;
}

export interface FeeItemPayment {
  id: number;
  feeItemId: number;
  enrollmentId: number;
  amount: number;
  paymentDate: string;
  receiptNumber?: string | null;
  paymentMethod: string;
  recordedById?: number;
  notes?: string | null;
  cascadedToSchoolFees: boolean;
  schoolFeesPaymentId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  enrollment?: {
    id: number;
    studentId: number;
    classId?: number;
    subClassId?: number;
    student?: { id: number; matricule?: string; name?: string };
  };
  recordedBy?: { id: number; name: string; matricule?: string };
}

export interface CreateFeeItemBody {
  name: string;
  description?: string;
  amount: number;
  academicYearId?: number;
  scope: FeeScope;
  classId?: number | null;
  subClassId?: number | null;
  requiresSchoolFeesPaid?: boolean;
  isActive?: boolean;
}

export interface RecordFeeItemPaymentBody {
  enrollmentId: number;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: FeePaymentMethod;
  receiptNumber?: string;
  notes?: string;
}

export interface RecordPaymentResult {
  feeItemPayment: FeeItemPayment;
  cascadedToSchoolFees: boolean;
  schoolFeesPaymentId: number | null;
  message: string;
}

export const PAYMENT_METHODS: { value: FeePaymentMethod; label: string }[] = [
  { value: 'EXPRESS_UNION', label: 'Express Union' },
  { value: 'CCA', label: 'CCA' },
  { value: 'F3DC', label: 'F3DC' },
];

export const listFeeItems = async (
  params: {
    academicYearId?: number;
    scope?: FeeScope;
    classId?: number;
    subClassId?: number;
    isActive?: boolean;
  } = {},
): Promise<FeeItem[]> => {
  const qs = new URLSearchParams();
  if (params.academicYearId) qs.append('academicYearId', String(params.academicYearId));
  if (params.scope) qs.append('scope', params.scope);
  if (params.classId) qs.append('classId', String(params.classId));
  if (params.subClassId) qs.append('subClassId', String(params.subClassId));
  if (params.isActive !== undefined) qs.append('isActive', String(params.isActive));
  const res = await apiService.get<{ data: FeeItem[] }>(
    `/fee-items${qs.toString() ? `?${qs.toString()}` : ''}`,
  );
  return res.data || [];
};

export const createFeeItem = (body: CreateFeeItemBody) =>
  apiService.post<{ data: FeeItem }>('/fee-items', body);

export const updateFeeItem = (id: number, body: Partial<CreateFeeItemBody>) =>
  apiService.put<{ data: FeeItem }>(`/fee-items/${id}`, body);

export const deleteFeeItem = (id: number) => apiService.delete(`/fee-items/${id}`);

export const recordFeeItemPayment = async (
  id: number,
  body: RecordFeeItemPaymentBody,
): Promise<RecordPaymentResult> => {
  const res = await apiService.post<{ data: RecordPaymentResult }>(`/fee-items/${id}/payments`, body);
  return res.data;
};

export const getFeeItemPayments = async (
  id: number,
  enrollmentId?: number,
): Promise<FeeItemPayment[]> => {
  const qs = enrollmentId ? `?enrollmentId=${enrollmentId}` : '';
  const res = await apiService.get<{ data: FeeItemPayment[] }>(`/fee-items/${id}/payments${qs}`);
  return res.data || [];
};

export const getEnrollmentFeeItems = async (enrollmentId: number): Promise<FeeItem[]> => {
  const res = await apiService.get<{ data: FeeItem[] }>(`/fee-items/enrollment/${enrollmentId}`);
  return res.data || [];
};

// ---- Helpers ----

export const fmtMoney = (v: any) => {
  const n = Number(v);
  if (v == null || isNaN(n)) return '—';
  return `XAF ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export const scopeTarget = (item: FeeItem): string => {
  if (item.scope === 'ALL') return 'All students';
  if (item.scope === 'CLASS') return item.class?.name || `Class #${item.classId}`;
  if (item.scope === 'SUBCLASS') return item.subClass?.name || `Subclass #${item.subClassId}`;
  return '—';
};
