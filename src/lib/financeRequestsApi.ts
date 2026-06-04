import apiService from './apiService';

// ---------------------------------------------------------------------------
// Finance Requests API client
//
// One generic FinanceRequest table powers three workflows discriminated by
// `type`. See the integration spec for the full contract. Case convention:
// send camelCase, receive camelCase.
// ---------------------------------------------------------------------------

export type FinanceRequestType =
  | 'FEE_REDUCTION'
  | 'PERSONNEL_DISBURSEMENT'
  | 'BANK_VERIFICATION';

export type FinanceRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

// ---- Per-type payloads ----

export interface FeeReductionPayload {
  enrollmentId: number;
  partnerName?: string;
}

export interface PersonnelDisbursementPayload {
  recipientUserId: number;
  purpose: string;
}

export interface BankVerificationPayload {
  studentId: number;
  claimedAmount?: number;
  estimatedPaymentPeriod: string; // free text, e.g. "2026-03 to 2026-04"
}

export type FinanceRequestPayload =
  | FeeReductionPayload
  | PersonnelDisbursementPayload
  | BankVerificationPayload
  | Record<string, any>;

// ---- Core record ----

export interface PersonRef {
  id: number;
  name: string;
  matricule?: string;
}

export interface FinanceRequest {
  id: number;
  type: FinanceRequestType;
  status: FinanceRequestStatus;
  amount: number | null;
  reason: string;
  notes: string | null;
  payload: FinanceRequestPayload;
  requestedById: number;
  actedById: number | null;
  actedAt: string | null;
  actedNotes: string | null;
  createdAt: string;
  updatedAt: string;
  requestedBy?: PersonRef | null;
  actedBy?: PersonRef | null;
}

export interface Paginated<T> {
  data: T[];
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
}

// ---- Create bodies ----

export interface CreateFinanceRequestBody {
  type: FinanceRequestType;
  amount?: number | null;
  reason: string;
  notes?: string;
  payload: FinanceRequestPayload;
}

export interface ActionBody {
  notes?: string;
}

// ---- List filters ----

export interface ListFinanceRequestsParams {
  type?: FinanceRequestType;
  status?: FinanceRequestStatus;
  requestedById?: number;
  recipientUserId?: number;
  studentId?: number;
  page?: number;
  limit?: number;
}

const BASE = '/finance-requests';

export const listFinanceRequests = async (
  params: ListFinanceRequestsParams = {},
): Promise<Paginated<FinanceRequest>> => {
  const qs = new URLSearchParams();
  if (params.type) qs.append('type', params.type);
  if (params.status) qs.append('status', params.status);
  if (params.requestedById) qs.append('requestedById', String(params.requestedById));
  if (params.recipientUserId) qs.append('recipientUserId', String(params.recipientUserId));
  if (params.studentId) qs.append('studentId', String(params.studentId));
  qs.append('page', String(params.page ?? 1));
  qs.append('limit', String(params.limit ?? 50));
  const res = await apiService.get<Paginated<FinanceRequest>>(`${BASE}?${qs.toString()}`);
  return { data: res.data || [], meta: res.meta };
};

export const getFinanceRequest = async (id: number): Promise<FinanceRequest> => {
  const res = await apiService.get<{ data: FinanceRequest }>(`${BASE}/${id}`);
  return res.data;
};

export const createFinanceRequest = async (
  body: CreateFinanceRequestBody,
): Promise<FinanceRequest> => {
  const res = await apiService.post<{ data: FinanceRequest }>(BASE, body);
  return res.data;
};

export const approveFinanceRequest = async (
  id: number,
  body: ActionBody = {},
): Promise<FinanceRequest> => {
  const res = await apiService.post<{ data: FinanceRequest }>(`${BASE}/${id}/approve`, body);
  return res.data;
};

export const rejectFinanceRequest = async (
  id: number,
  body: ActionBody = {},
): Promise<FinanceRequest> => {
  const res = await apiService.post<{ data: FinanceRequest }>(`${BASE}/${id}/reject`, body);
  return res.data;
};

export const completeFinanceRequest = async (
  id: number,
  body: ActionBody = {},
): Promise<FinanceRequest> => {
  const res = await apiService.post<{ data: FinanceRequest }>(`${BASE}/${id}/complete`, body);
  return res.data;
};

// ---------------------------------------------------------------------------
// Picker helpers — students (with enrollments) and recipient users.
// ---------------------------------------------------------------------------

export interface StudentEnrollment {
  id: number;
  academicYearId?: number;
  academicYearName?: string;
  classId?: number;
  className?: string;
  subClassId?: number;
  subClassName?: string;
}

export interface FinanceStudent {
  id: number;
  name: string;
  matricule?: string;
  enrollments: StudentEnrollment[];
}

const mapFinanceStudent = (s: any): FinanceStudent => {
  const enrollments: StudentEnrollment[] = (s.enrollments || []).map((e: any) => {
    const subClass = e.subClass ?? e.sub_class;
    return {
      id: e.id,
      academicYearId: e.academicYearId ?? e.academic_year_id,
      academicYearName: e.academicYear?.name ?? e.academic_year?.name,
      classId: e.classId ?? e.class_id ?? subClass?.class?.id,
      className: e.class?.name ?? subClass?.class?.name,
      subClassId: subClass?.id,
      subClassName: subClass?.name,
    };
  });
  return { id: s.id, name: s.name, matricule: s.matricule, enrollments };
};

// Server-side search across name, matricule, parents, class/subclass, etc.
// Response is double-nested: { data: { data: [...], meta } }.
export const searchFinanceStudents = async (params: {
  q: string;
  academicYearId?: number;
  page?: number;
  limit?: number;
}): Promise<FinanceStudent[]> => {
  const qs = new URLSearchParams();
  qs.append('q', params.q);
  qs.append('page', String(params.page ?? 1));
  qs.append('limit', String(params.limit ?? 20));
  if (params.academicYearId) qs.append('academicYearId', String(params.academicYearId));
  const res = await apiService.get<{ data: { data: any[] } }>(`/students/search?${qs.toString()}`);
  const inner = res.data || ({} as { data: any[] });
  return (inner.data || []).map(mapFinanceStudent);
};

export interface RecipientUser {
  id: number;
  name: string;
  matricule?: string;
  email?: string;
  roles?: string[];
}

const mapRecipientUser = (u: any): RecipientUser => ({
  id: u.id,
  name: u.name,
  matricule: u.matricule,
  email: u.email,
  roles: (u.userRoles || u.roles || [])
    .map((r: any) => (typeof r === 'string' ? r : r.role))
    .filter(Boolean),
});

// Staff/teacher users eligible to receive a personnel disbursement.
export const listRecipientUsers = async (params: {
  search?: string;
  limit?: number;
} = {}): Promise<RecipientUser[]> => {
  const qs = new URLSearchParams();
  qs.append('limit', String(params.limit ?? 200));
  if (params.search) qs.append('search', params.search);
  const res = await apiService.get<{ data: any[] }>(`/users?${qs.toString()}`);
  return (res.data || []).map(mapRecipientUser);
};

// ---------------------------------------------------------------------------
// Display / authorization helpers
// ---------------------------------------------------------------------------

export const TYPE_LABELS: Record<FinanceRequestType, string> = {
  FEE_REDUCTION: 'Fee Reduction',
  PERSONNEL_DISBURSEMENT: 'Personnel Disbursement',
  BANK_VERIFICATION: 'Bank Verification',
};

export const STATUS_LABELS: Record<FinanceRequestStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
};

// Roles allowed to create a finance request.
export const CREATE_ROLES = ['SUPER_MANAGER', 'MANAGER', 'PRINCIPAL', 'BURSAR'];

// Roles allowed to list / view finance requests.
export const VIEW_ROLES = [
  'SUPER_MANAGER',
  'MANAGER',
  'PRINCIPAL',
  'VICE_PRINCIPAL',
  'BURSAR',
  'SECRETARY',
  'FEE_AUDITOR',
];

// Principal+ — can act on any request type as an override.
export const PRINCIPAL_PLUS = ['SUPER_MANAGER', 'MANAGER', 'PRINCIPAL'];

export type FinanceAction = 'approve' | 'reject' | 'complete';

/**
 * Which actions the given user (active role + id) may take on a PENDING
 * request, mirroring the backend authorization matrix. Returns [] for any
 * non-PENDING request (immutable once it leaves PENDING).
 */
export const availableActions = (
  req: FinanceRequest,
  role: string | null | undefined,
  userId: number | null | undefined,
): FinanceAction[] => {
  if (req.status !== 'PENDING' || !role) return [];
  const isPrincipalPlus = PRINCIPAL_PLUS.includes(role);

  if (req.type === 'FEE_REDUCTION') {
    return isPrincipalPlus ? ['approve', 'reject'] : [];
  }

  if (req.type === 'PERSONNEL_DISBURSEMENT') {
    const recipientId = (req.payload as PersonnelDisbursementPayload)?.recipientUserId;
    const isRecipient = userId != null && recipientId === userId;
    return isPrincipalPlus || isRecipient ? ['complete', 'reject'] : [];
  }

  if (req.type === 'BANK_VERIFICATION') {
    return VIEW_ROLES.includes(role) ? ['complete', 'reject'] : [];
  }

  return [];
};

export const fmtMoney = (v: any) => {
  const n = Number(v);
  if (v == null || isNaN(n)) return '—';
  return `XAF ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export const fmtDateTime = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// A short human summary of the type-specific payload for table rows.
export const payloadSummary = (req: FinanceRequest): string => {
  const p = req.payload || {};
  if (req.type === 'FEE_REDUCTION') {
    const fp = p as FeeReductionPayload;
    const parts = [`Enrollment #${fp.enrollmentId}`];
    if (fp.partnerName) parts.push(fp.partnerName);
    return parts.join(' · ');
  }
  if (req.type === 'PERSONNEL_DISBURSEMENT') {
    const pp = p as PersonnelDisbursementPayload;
    return pp.purpose || `Recipient #${pp.recipientUserId}`;
  }
  if (req.type === 'BANK_VERIFICATION') {
    const bp = p as BankVerificationPayload;
    const parts = [`Student #${bp.studentId}`];
    if (bp.estimatedPaymentPeriod) parts.push(bp.estimatedPaymentPeriod);
    return parts.join(' · ');
  }
  return '';
};
