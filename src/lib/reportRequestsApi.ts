import apiService from './apiService';
import type { PersonRef, Paginated } from './disciplineApi';

// ---------------------------------------------------------------------------
// Report Requests API client — /report-requests
//
// The Dean (or VP / Principal+) raises a written-report request to an SDM or
// DM. The recipient submits notes / a file URL; the requester reviews. Every
// read carries a server-computed `isOverdue` flag (PENDING && dueDate < now).
// ---------------------------------------------------------------------------

export type ReportRequestStatus = 'PENDING' | 'SUBMITTED' | 'REVIEWED' | 'CANCELLED';

export const REPORT_STATUSES: ReportRequestStatus[] = [
  'PENDING',
  'SUBMITTED',
  'REVIEWED',
  'CANCELLED',
];

export interface ReportRequest {
  id: number;
  requestedById: number;
  requestedFromId: number;
  subject: string;
  description?: string | null;
  dueDate: string;
  status: ReportRequestStatus;
  submittedAt?: string | null;
  submissionNotes?: string | null;
  submissionFileUrl?: string | null;
  reviewedAt?: string | null;
  reviewedNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
  requestedBy?: PersonRef | null;
  requestedFrom?: PersonRef | null;
}

export interface CreateReportRequestBody {
  requestedFromId: number; // must hold SENIOR_DISCIPLINE_MASTER or DISCIPLINE_MASTER
  subject: string;
  description?: string;
  dueDate: string; // ISO datetime
}

const BASE = '/report-requests';

const buildQuery = (params: Record<string, any>): string => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
};

export const createReportRequest = async (
  body: CreateReportRequestBody,
): Promise<ReportRequest> => {
  const res = await apiService.post<{ data: ReportRequest }>(BASE, body);
  return res.data;
};

export interface ReportListParams {
  status?: ReportRequestStatus;
  overdueOnly?: boolean;
  page?: number;
  limit?: number;
}

// Requests I sent (requester roles).
export const listSentReportRequests = async (
  params: ReportListParams = {},
): Promise<Paginated<ReportRequest>> => {
  const res = await apiService.get<Paginated<ReportRequest>>(`${BASE}/sent${buildQuery(params)}`);
  return { data: res.data || [], meta: res.meta };
};

// Requests assigned to me (SDM / DM).
export const listAssignedReportRequests = async (
  params: ReportListParams = {},
): Promise<Paginated<ReportRequest>> => {
  const res = await apiService.get<Paginated<ReportRequest>>(
    `${BASE}/assigned${buildQuery(params)}`,
  );
  return { data: res.data || [], meta: res.meta };
};

export const listReportRequests = async (
  params: ReportListParams & {
    requestedById?: number;
    requestedFromId?: number;
    from?: string;
    to?: string;
  } = {},
): Promise<Paginated<ReportRequest>> => {
  const res = await apiService.get<Paginated<ReportRequest>>(`${BASE}${buildQuery(params)}`);
  return { data: res.data || [], meta: res.meta };
};

export const getReportRequest = async (id: number): Promise<ReportRequest> => {
  const res = await apiService.get<{ data: ReportRequest }>(`${BASE}/${id}`);
  return res.data;
};

// Recipient submits (SDM / DM, must be the assigned recipient, PENDING only).
export const submitReportRequest = async (
  id: number,
  body: { submissionNotes?: string; submissionFileUrl?: string },
): Promise<ReportRequest> => {
  const res = await apiService.post<{ data: ReportRequest }>(`${BASE}/${id}/submit`, body);
  return res.data;
};

// Requester reviews (SUBMITTED only).
export const reviewReportRequest = async (
  id: number,
  body: { reviewedNotes?: string },
): Promise<ReportRequest> => {
  const res = await apiService.post<{ data: ReportRequest }>(`${BASE}/${id}/review`, body);
  return res.data;
};

// Requester edits while still PENDING.
export const updateReportRequest = async (
  id: number,
  body: { subject?: string; description?: string; dueDate?: string },
): Promise<ReportRequest> => {
  const res = await apiService.put<{ data: ReportRequest }>(`${BASE}/${id}`, body);
  return res.data;
};

// Requester cancels (any status except REVIEWED).
export const cancelReportRequest = async (id: number): Promise<ReportRequest> => {
  const res = await apiService.post<{ data: ReportRequest }>(`${BASE}/${id}/cancel`, {});
  return res.data;
};

// ---------------------------------------------------------------------------
// Recipient lookup — users holding the SDM / DM role
// ---------------------------------------------------------------------------

export interface ReportRecipient extends PersonRef {
  role: string;
}

export const listReportRecipients = async (): Promise<ReportRecipient[]> => {
  const roles = ['SENIOR_DISCIPLINE_MASTER', 'DISCIPLINE_MASTER'];
  const results = await Promise.all(
    roles.map((role) =>
      apiService
        .get<{ data: any[] }>(`/users?role=${role}&limit=100`)
        .then((r) => (r.data || []).map((u: any) => ({ id: u.id, name: u.name, matricule: u.matricule, role })))
        .catch(() => [] as ReportRecipient[]),
    ),
  );
  // De-duplicate users holding both roles.
  const seen = new Set<number>();
  return results.flat().filter((u) => {
    if (seen.has(u.id)) return false;
    seen.add(u.id);
    return true;
  });
};

// ---------------------------------------------------------------------------
// Role helpers (UI gating only)
// ---------------------------------------------------------------------------

export const REPORT_REQUESTER_ROLES = [
  'DEAN_OF_DISCIPLINE',
  'VICE_PRINCIPAL',
  'PRINCIPAL',
  'MANAGER',
  'SUPER_MANAGER',
];

export const REPORT_RECIPIENT_ROLES = ['SENIOR_DISCIPLINE_MASTER', 'DISCIPLINE_MASTER'];

export const canRequestReports = (role?: string | null) =>
  !!role && REPORT_REQUESTER_ROLES.includes(role);

export const canSubmitReports = (role?: string | null) =>
  !!role && REPORT_RECIPIENT_ROLES.includes(role);
