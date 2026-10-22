import apiService, { ApiError } from './apiService';
import { searchPersonnel, MAX_PERSONNEL_LIMIT } from './personnelApi';
import { PAYMENT_METHODS, type PaymentMethodCode } from './paymentMethods';

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
  | 'BANK_VERIFICATION'
  | 'PAYMENT_CLAIM'
  | 'REFUND';

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

// Proof of payment submitted by a parent (or recorded on their behalf); the
// Bursar validates it and the backend then creates the real PaymentTransaction.
export interface PaymentClaimPayload {
  studentId?: number;
  enrollmentId?: number;
  feeId?: number;
  paymentMethod: PaymentClaimMethod;
  paymentDate: string; // YYYY-MM-DD
  receiptNumber?: string;
}

// Refund against a confirmed overpayment; a Super Manager approves and the
// backend then creates the real Refund.
export interface RefundRequestPayload {
  enrollmentId: number;
  refundMethod: RefundRequestMethod;
  refundDate: string; // YYYY-MM-DD
}

export type FinanceRequestPayload =
  | FeeReductionPayload
  | PersonnelDisbursementPayload
  | BankVerificationPayload
  | PaymentClaimPayload
  | RefundRequestPayload
  | Record<string, any>;

// ---- Payment / refund method vocabularies (mirror the backend enums) ----

export type PaymentClaimMethod = PaymentMethodCode;

export const PAYMENT_CLAIM_METHODS: { value: PaymentClaimMethod; label: string }[] = PAYMENT_METHODS;

export type RefundRequestMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'MOBILE_MONEY'
  | 'EXPRESS_UNION'
  | 'CCA'
  | 'F3DC'
  | 'AFRILAND_FIRST_BANK';

export const REFUND_REQUEST_METHODS: { value: RefundRequestMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'EXPRESS_UNION', label: 'Express Union' },
  { value: 'CCA', label: 'CCA' },
  { value: 'F3DC', label: 'F3DC' },
  { value: 'AFRILAND_FIRST_BANK', label: 'Afriland First Bank' },
];

const METHOD_LABEL = (value: string): string =>
  REFUND_REQUEST_METHODS.find((m) => m.value === value)?.label ||
  value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

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
  // Display context resolved server-side from the payload ids.
  student?: PersonRef | null;
  enrollment?: EnrollmentRef | null;
  recipient?: PersonRef | null;
}

export interface EnrollmentRef {
  id: number;
  className: string | null;
  subClassName: string | null;
  academicYearName: string | null;
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

// Calls here are made silently (no global toast) so pages decide what to show:
// list loads fail quietly into an empty state, and user-initiated actions toast
// the message below. Server 403 texts can contain raw role lists, so a 403 is
// always replaced by a plain-language message.
const SILENT = { silent: true } as const;

const friendlyError = (error: unknown): never => {
  if (error instanceof ApiError && error.status === 403) {
    throw new ApiError("You don't have permission to do this. Contact the Bursar if you think this is a mistake.", 403);
  }
  throw error;
};

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
  const res = await apiService
    .get<Paginated<FinanceRequest>>(`${BASE}?${qs.toString()}`, SILENT)
    .catch(friendlyError);
  return { data: res.data || [], meta: res.meta };
};

export const getFinanceRequest = async (id: number): Promise<FinanceRequest> => {
  const res = await apiService
    .get<{ data: FinanceRequest }>(`${BASE}/${id}`, SILENT)
    .catch(friendlyError);
  return res.data;
};

export const createFinanceRequest = async (
  body: CreateFinanceRequestBody,
): Promise<FinanceRequest> => {
  const res = await apiService
    .post<{ data: FinanceRequest }>(BASE, body, SILENT)
    .catch(friendlyError);
  return res.data;
};

export const approveFinanceRequest = async (
  id: number,
  body: ActionBody = {},
): Promise<FinanceRequest> => {
  const res = await apiService
    .post<{ data: FinanceRequest }>(`${BASE}/${id}/approve`, body, SILENT)
    .catch(friendlyError);
  return res.data;
};

export const rejectFinanceRequest = async (
  id: number,
  body: ActionBody = {},
): Promise<FinanceRequest> => {
  const res = await apiService
    .post<{ data: FinanceRequest }>(`${BASE}/${id}/reject`, body, SILENT)
    .catch(friendlyError);
  return res.data;
};

export const completeFinanceRequest = async (
  id: number,
  body: ActionBody = {},
): Promise<FinanceRequest> => {
  const res = await apiService
    .post<{ data: FinanceRequest }>(`${BASE}/${id}/complete`, body, SILENT)
    .catch(friendlyError);
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

// Staff eligible to receive a personnel disbursement. Searched server-side —
// parents are excluded by the endpoint, which is what we want here.
export const listRecipientUsers = async (params: {
  search?: string;
  limit?: number;
} = {}): Promise<RecipientUser[]> => {
  const res = await searchPersonnel({
    q: params.search,
    limit: params.limit ?? MAX_PERSONNEL_LIMIT,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  return res.data.map(mapRecipientUser);
};

// ---------------------------------------------------------------------------
// Display / authorization helpers
// ---------------------------------------------------------------------------

export const TYPE_LABELS: Record<FinanceRequestType, string> = {
  FEE_REDUCTION: 'Fee Reduction',
  PERSONNEL_DISBURSEMENT: 'Personnel Disbursement',
  BANK_VERIFICATION: 'Bank Verification',
  PAYMENT_CLAIM: 'Payment Claim',
  REFUND: 'Refund',
};

export const STATUS_LABELS: Record<FinanceRequestStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
};

// Roles that may create any request type (others: see creatableTypes below —
// parents file payment claims, other staff request money for themselves).
export const CREATE_ROLES = ['SUPER_MANAGER', 'MANAGER', 'PRINCIPAL', 'BURSAR', 'PARENT'];

// Oversight roles: see every request and may clear bank verifications. Every
// other authenticated user can still list/view their own requests (the backend
// scopes the results).
export const OVERSIGHT_ROLES = [
  'SUPER_MANAGER',
  'MANAGER',
  'PRINCIPAL',
  'VICE_PRINCIPAL',
  'BURSAR',
  'SECRETARY',
  'FEE_AUDITOR',
];

// Roles that have a finance-requests page.
export const VIEW_ROLES = [
  'SUPER_MANAGER',
  'MANAGER',
  'PRINCIPAL',
  'VICE_PRINCIPAL',
  'BURSAR',
  'SECRETARY',
  'FEE_AUDITOR',
  'PARENT',
];

// Principal+ — can act on any request type as an override.
export const PRINCIPAL_PLUS = ['SUPER_MANAGER', 'MANAGER', 'PRINCIPAL'];

// Bursar+ — may raise refund requests and validate payment claims.
export const BURSAR_PLUS = ['SUPER_MANAGER', 'MANAGER', 'PRINCIPAL', 'BURSAR'];

/**
 * Staff who may ask the Bursar for money for themselves — they raise a
 * PERSONNEL_DISBURSEMENT naming themselves as the recipient, and see only
 * their own requests.
 *
 * Deliberately separate from VIEW_ROLES: that list also confers the right to
 * clear bank verifications, which none of these roles should have.
 */
export const REQUESTER_ROLES = [
  'TEACHER',
  'HOD',
  'DISCIPLINE_MASTER',
  'SENIOR_DISCIPLINE_MASTER',
  'DEAN_OF_DISCIPLINE',
  'DEAN_OF_STUDIES',
  'GUIDANCE_COUNSELOR',
  'NURSE',
  'CONTROLLER',
  'SECRETARY',
  'VICE_PRINCIPAL',
  'FEE_AUDITOR',
];

// True when the role may only ask for money for itself — never for someone else.
export const isSelfRequester = (role: string | null | undefined): boolean =>
  !!role && !BURSAR_PLUS.includes(role) && REQUESTER_ROLES.includes(role);

/**
 * Which request types the given role may create, mirroring the backend's
 * per-type creator checks.
 */
export const creatableTypes = (role: string | null | undefined): FinanceRequestType[] => {
  if (!role) return [];
  if (role === 'PARENT' || role === 'STUDENT') return ['PAYMENT_CLAIM'];
  if (BURSAR_PLUS.includes(role)) {
    return [
      'FEE_REDUCTION',
      'PERSONNEL_DISBURSEMENT',
      'BANK_VERIFICATION',
      'PAYMENT_CLAIM',
      'REFUND',
    ];
  }
  // Other staff may only ask for money for themselves.
  if (REQUESTER_ROLES.includes(role)) return ['PERSONNEL_DISBURSEMENT'];
  return [];
};

/**
 * Where a FinanceRequest deep link should land for the given role. Used by
 * notification deep links (entityType === 'FinanceRequest').
 */
export const financeRequestsPath = (role: string | null | undefined): string | null => {
  if (!role) return null;
  if (role === 'PARENT' || role === 'STUDENT') return '/dashboard/parent-student/payments';
  if (!VIEW_ROLES.includes(role) && !REQUESTER_ROLES.includes(role)) return null;
  return `/dashboard/${role.toLowerCase().replace(/_/g, '-')}/finance-requests`;
};

export type FinanceAction = 'approve' | 'reject' | 'complete';

/**
 * Which actions the given user (active role + id) may take on a request,
 * mirroring the backend authorization matrix.
 *
 * Most types are decided in a single action while PENDING and are immutable
 * afterwards.
 *
 * Personnel disbursements never take `approve` — the backend accepts only
 * `complete` (the recipient confirms the money reached them) and `reject`, and
 * only from the recipient or Principal+.
 */
export const availableActions = (
  req: FinanceRequest,
  role: string | null | undefined,
  userId: number | null | undefined,
): FinanceAction[] => {
  if (req.status !== 'PENDING' || !role) return [];
  const isPrincipalPlus = PRINCIPAL_PLUS.includes(role);

  // Only the recipient (or Principal+ as an override) may settle money
  // addressed to someone. The backend rejects `approve` for this type.
  if (req.type === 'PERSONNEL_DISBURSEMENT') {
    const recipientId = (req.payload as PersonnelDisbursementPayload)?.recipientUserId;
    const isRecipient = userId != null && recipientId === userId;
    return isPrincipalPlus || isRecipient ? ['complete', 'reject'] : [];
  }

  if (req.type === 'FEE_REDUCTION') {
    return isPrincipalPlus ? ['approve', 'reject'] : [];
  }

  if (req.type === 'BANK_VERIFICATION') {
    return OVERSIGHT_ROLES.includes(role) ? ['complete', 'reject'] : [];
  }

  // Bursar validates a parent's proof of payment. Approving creates the real
  // PaymentTransaction server-side — no follow-up call is needed.
  if (req.type === 'PAYMENT_CLAIM') {
    return BURSAR_PLUS.includes(role) ? ['approve', 'reject'] : [];
  }

  // Refunds are a Super Manager decision only. Approving records the real
  // Refund and decrements SchoolFees.amountPaid server-side.
  if (req.type === 'REFUND') {
    return role === 'SUPER_MANAGER' ? ['approve', 'reject'] : [];
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

// "Jane Doe (MAT123) · Form 1 A" — falls back to the id only when the server
// could not resolve the reference.
const studentLabel = (req: FinanceRequest, fallbackStudentId?: number, fallbackEnrollmentId?: number): string => {
  const parts: string[] = [];
  if (req.student?.name) {
    parts.push(req.student.matricule ? `${req.student.name} (${req.student.matricule})` : req.student.name);
  }
  const e = req.enrollment;
  if (e) {
    const cls = [e.className, e.subClassName].filter(Boolean).join(' ');
    if (cls) parts.push(cls);
  }
  if (parts.length) return parts.join(' · ');
  if (fallbackStudentId) return `Student #${fallbackStudentId}`;
  if (fallbackEnrollmentId) return `Enrollment #${fallbackEnrollmentId}`;
  return '';
};

/** Display name of the person who raised the request. */
export const requesterName = (req: FinanceRequest): string =>
  req.requestedBy?.name || 'Unknown user';

// A short human summary of the type-specific payload for table rows.
export const payloadSummary = (req: FinanceRequest): string => {
  const p = req.payload || {};
  const join = (parts: (string | undefined | null | false)[]) => parts.filter(Boolean).join(' · ');
  if (req.type === 'FEE_REDUCTION') {
    const fp = p as FeeReductionPayload;
    return join([studentLabel(req, undefined, fp.enrollmentId), fp.partnerName]);
  }
  if (req.type === 'PERSONNEL_DISBURSEMENT') {
    const pp = p as PersonnelDisbursementPayload;
    const forWhom =
      req.recipient?.name && req.recipient.id !== req.requestedById ? `For ${req.recipient.name}` : '';
    return join([pp.purpose, forWhom]) || (req.recipient?.name ?? '');
  }
  if (req.type === 'BANK_VERIFICATION') {
    const bp = p as BankVerificationPayload;
    return join([studentLabel(req, bp.studentId), bp.estimatedPaymentPeriod]);
  }
  if (req.type === 'PAYMENT_CLAIM') {
    const cp = p as PaymentClaimPayload;
    return join([
      studentLabel(req, cp.studentId, cp.enrollmentId),
      cp.paymentMethod && METHOD_LABEL(cp.paymentMethod),
      cp.paymentDate,
      cp.receiptNumber && `Receipt ${cp.receiptNumber}`,
    ]);
  }
  if (req.type === 'REFUND') {
    const rp = p as RefundRequestPayload;
    return join([
      studentLabel(req, undefined, rp.enrollmentId),
      rp.refundMethod && METHOD_LABEL(rp.refundMethod),
      rp.refundDate,
    ]);
  }
  return '';
};
