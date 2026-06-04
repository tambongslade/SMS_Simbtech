import apiService from './apiService';

export type RefundMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'MOBILE_MONEY'
  | 'EXPRESS_UNION'
  | 'CCA'
  | 'F3DC';

export const REFUND_METHODS: { value: RefundMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'EXPRESS_UNION', label: 'Express Union' },
  { value: 'CCA', label: 'CCA' },
  { value: 'F3DC', label: 'F3DC' },
];

export interface OverpaidRow {
  schoolFeesId: number;
  enrollmentId: number;
  studentId: number;
  matricule: string;
  name: string;
  className?: string;
  subClassName?: string;
  amountExpected: number;
  amountPaid: number;
  overpayment: number;
  totalRefunded: number;
  currentOverpayment: number;
  refundsCount: number;
}

export interface Refund {
  id: number;
  enrollmentId: number;
  schoolFeesId: number;
  amount: number;
  refundDate: string;
  refundMethod: RefundMethod | string;
  reason: string;
  notes?: string | null;
  recordedById?: number;
  createdAt?: string;
  updatedAt?: string;
  student?: { id: number; matricule?: string; name?: string };
  enrollment?: { id: number; studentId?: number; student?: { id: number; matricule?: string; name?: string } };
  recordedBy?: { id: number; name?: string; matricule?: string };
}

export interface RecordRefundBody {
  enrollmentId: number;
  amount: number;
  refundDate: string; // YYYY-MM-DD
  refundMethod: RefundMethod;
  reason: string;
  notes?: string;
}

export interface RecordRefundResult {
  refund: Refund;
  feeAfter: {
    amountExpected: number;
    amountPaid: number;
    currentOverpayment: number;
  };
}

export interface Paginated<T> {
  data: T[];
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
}

export const listOverpaid = async (params: {
  academicYearId?: number;
  classId?: number;
  subClassId?: number;
  minOverpayment?: number;
  page?: number;
  limit?: number;
} = {}): Promise<Paginated<OverpaidRow>> => {
  const qs = new URLSearchParams();
  if (params.academicYearId) qs.append('academicYearId', String(params.academicYearId));
  if (params.classId) qs.append('classId', String(params.classId));
  if (params.subClassId) qs.append('subClassId', String(params.subClassId));
  if (params.minOverpayment != null) qs.append('minOverpayment', String(params.minOverpayment));
  qs.append('page', String(params.page ?? 1));
  qs.append('limit', String(params.limit ?? 50));
  const res = await apiService.get<Paginated<OverpaidRow>>(`/fees/overpaid?${qs.toString()}`);
  return { data: res.data || [], meta: res.meta };
};

export const exportOverpaid = async (params: {
  academicYearId?: number;
  classId?: number;
  subClassId?: number;
  minOverpayment?: number;
} = {}): Promise<Blob> => {
  const qs = new URLSearchParams();
  if (params.academicYearId) qs.append('academicYearId', String(params.academicYearId));
  if (params.classId) qs.append('classId', String(params.classId));
  if (params.subClassId) qs.append('subClassId', String(params.subClassId));
  if (params.minOverpayment != null) qs.append('minOverpayment', String(params.minOverpayment));
  return apiService.get<Blob>(`/fees/overpaid/export?${qs.toString()}`, undefined, 'blob');
};

export const recordRefund = async (body: RecordRefundBody): Promise<RecordRefundResult> => {
  const res = await apiService.post<{ data: RecordRefundResult }>('/fees/refunds', body);
  return res.data;
};

export const listRefunds = async (params: {
  studentId?: number;
  enrollmentId?: number;
  academicYearId?: number;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
} = {}): Promise<Paginated<Refund>> => {
  const qs = new URLSearchParams();
  if (params.studentId) qs.append('studentId', String(params.studentId));
  if (params.enrollmentId) qs.append('enrollmentId', String(params.enrollmentId));
  if (params.academicYearId) qs.append('academicYearId', String(params.academicYearId));
  if (params.from) qs.append('from', params.from);
  if (params.to) qs.append('to', params.to);
  if (params.page) qs.append('page', String(params.page));
  if (params.limit) qs.append('limit', String(params.limit));
  const res = await apiService.get<Paginated<Refund>>(`/fees/refunds${qs.toString() ? `?${qs.toString()}` : ''}`);
  return { data: res.data || [], meta: res.meta };
};

export const getRefund = async (id: number): Promise<Refund> => {
  const res = await apiService.get<{ data: Refund }>(`/fees/refunds/${id}`);
  return res.data;
};

// ---- Helpers ----

export const fmtMoney = (v: any) => {
  const n = Number(v);
  if (v == null || isNaN(n)) return '—';
  return `XAF ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
