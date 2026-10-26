import apiService from './apiService';
import { PAYMENT_METHODS as SHARED_PAYMENT_METHODS, type PaymentMethodCode } from './paymentMethods';

export type GceExamLevel = 'O_LEVEL' | 'A_LEVEL';
export type GcePaymentMethod = PaymentMethodCode;

export interface GceRosterRow {
  enrollmentId: number;
  student: { id: number; name: string; matricule: string };
  class: { id: number; name: string };
  subClass: { id: number; name: string } | null;
  examLevel: GceExamLevel;
  registrationId: number | null;
  subjectCount: number;
  amountExpected: number;
  amountPaid: number;
  balance: number;
  isLocked: boolean;
}

export interface GceRegistrationSubject {
  id: number;
  subjectId: number;
  isPractical: boolean;
  subject: { id: number; name: string; category: string };
}

export interface GceRegistrationPayment {
  id: number;
  gceRegistrationId: number;
  amount: number;
  paymentDate: string;
  receiptNumber?: string | null;
  paymentMethod: string;
  notes?: string | null;
  createdAt?: string;
  recordedBy?: { id: number; name: string; matricule?: string };
}

export interface GceRegistration {
  id: number;
  enrollmentId: number;
  academicYearId: number;
  examLevel: GceExamLevel;
  amountExpected: number;
  amountPaid: number;
  subjects: GceRegistrationSubject[];
  payments: GceRegistrationPayment[];
}

export interface GceRegistrationState {
  enrollment: {
    id: number;
    student: { id: number; name: string; matricule: string };
    class: { id: number; name: string };
    subClass: { id: number; name: string } | null;
  };
  examLevel: GceExamLevel;
  minSubjects: number;
  maxSubjects: number;
  registration: GceRegistration | null;
  isLocked: boolean;
}

export const PAYMENT_METHODS: { value: GcePaymentMethod; label: string }[] = SHARED_PAYMENT_METHODS;

export const getGceRoster = async (params: {
  academicYearId?: number;
  examLevel?: GceExamLevel;
  classId?: number;
  subClassId?: number;
} = {}): Promise<GceRosterRow[]> => {
  const qs = new URLSearchParams();
  if (params.academicYearId) qs.append('academicYearId', String(params.academicYearId));
  if (params.examLevel) qs.append('examLevel', params.examLevel);
  if (params.classId) qs.append('classId', String(params.classId));
  if (params.subClassId) qs.append('subClassId', String(params.subClassId));
  const res = await apiService.get<{ data: GceRosterRow[] }>(
    `/gce-registrations${qs.toString() ? `?${qs.toString()}` : ''}`,
  );
  return res.data || [];
};

export const getGceRegistration = async (enrollmentId: number): Promise<GceRegistrationState> => {
  const res = await apiService.get<{ data: GceRegistrationState }>(`/gce-registrations/enrollment/${enrollmentId}`);
  return res.data;
};

export const saveGceRegistrationSubjects = async (
  enrollmentId: number,
  subjectIds: number[],
): Promise<GceRegistration> => {
  const res = await apiService.put<{ data: GceRegistration }>(
    `/gce-registrations/enrollment/${enrollmentId}/subjects`,
    { subjectIds },
  );
  return res.data;
};

export interface RecordGceRegistrationPaymentBody {
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: GcePaymentMethod;
  receiptNumber?: string;
  notes?: string;
}

export const recordGceRegistrationPayment = async (
  registrationId: number,
  body: RecordGceRegistrationPaymentBody,
): Promise<{ payment: GceRegistrationPayment; registration: GceRegistration }> => {
  const res = await apiService.post<{ data: { payment: GceRegistrationPayment; registration: GceRegistration } }>(
    `/gce-registrations/${registrationId}/payments`,
    body,
  );
  return res.data;
};

export const getGceRegistrationPayments = async (registrationId: number): Promise<GceRegistrationPayment[]> => {
  const res = await apiService.get<{ data: GceRegistrationPayment[] }>(`/gce-registrations/${registrationId}/payments`);
  return res.data || [];
};

// ---- Fee structure constants (mirror sms_backend/.../gceRegistrationService.ts) ----
// Shown so the bursar sees the breakdown before saving; the backend recomputes
// and is the source of truth for the amount actually charged.
export const O_LEVEL_SUBJECT_COUNT = 11;
export const O_LEVEL_PER_SUBJECT_FEE = 1000;
export const O_LEVEL_REGISTRATION_FEE = 8000;
export const O_LEVEL_STAMPS_FEE = 1500;
export const O_LEVEL_HANDLING_FEE = 4000;
export const O_LEVEL_ICT_PRACTICAL_FEE = 5000;
export const O_LEVEL_TOTAL_FEE =
  O_LEVEL_SUBJECT_COUNT * O_LEVEL_PER_SUBJECT_FEE + O_LEVEL_REGISTRATION_FEE + O_LEVEL_STAMPS_FEE + O_LEVEL_HANDLING_FEE + O_LEVEL_ICT_PRACTICAL_FEE;

export const A_LEVEL_MIN_SUBJECTS = 3;
export const A_LEVEL_MAX_SUBJECTS = 5;
export const A_LEVEL_PER_SUBJECT_FEE = 2000;
export const A_LEVEL_REGISTRATION_FEE = 9000;
export const A_LEVEL_STAMPS_FEE = 1500;
export const A_LEVEL_HANDLING_FEE = 4000;
export const A_LEVEL_PRACTICAL_SURCHARGE = 5000;

const PRACTICAL_SUBJECT_KEYWORDS = ['physics', 'chemistry', 'biology', 'ict', 'computer science'];

export const isPracticalSubjectName = (name: string): boolean => {
  const normalized = name.trim().toLowerCase();
  return PRACTICAL_SUBJECT_KEYWORDS.some((k) => normalized.includes(k));
};

/** Client-side preview of the fee for a chosen subject list — mirrors the backend formula exactly. */
export const previewGceFee = (
  examLevel: GceExamLevel,
  subjects: { id: number; name: string }[],
): { amountExpected: number; practicalSubjectCount: number; isValidCount: boolean } => {
  const subjectCount = subjects.length;
  if (examLevel === 'O_LEVEL') {
    return {
      amountExpected: O_LEVEL_TOTAL_FEE,
      practicalSubjectCount: 0,
      isValidCount: subjectCount === O_LEVEL_SUBJECT_COUNT,
    };
  }
  const practicalSubjectCount = subjects.filter((s) => isPracticalSubjectName(s.name)).length;
  const amountExpected =
    subjectCount * A_LEVEL_PER_SUBJECT_FEE +
    practicalSubjectCount * A_LEVEL_PRACTICAL_SURCHARGE +
    A_LEVEL_REGISTRATION_FEE +
    A_LEVEL_STAMPS_FEE +
    A_LEVEL_HANDLING_FEE;
  return {
    amountExpected,
    practicalSubjectCount,
    isValidCount: subjectCount >= A_LEVEL_MIN_SUBJECTS && subjectCount <= A_LEVEL_MAX_SUBJECTS,
  };
};

export const fmtMoney = (v: any) => {
  const n = Number(v);
  if (v == null || isNaN(n)) return '—';
  return `XAF ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};
