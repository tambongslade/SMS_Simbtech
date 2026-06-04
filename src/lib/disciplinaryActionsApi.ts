import apiService from './apiService';
import type { PersonRef, Paginated } from './disciplineApi';

// ---------------------------------------------------------------------------
// Disciplinary Actions API client — /disciplinary-actions
//
// Structured sanctions issued by the Dean of Discipline (or VP / Principal+).
// Optionally links to a DisciplineIssue belonging to the same student.
// Case convention: send camelCase, receive camelCase.
// ---------------------------------------------------------------------------

export type DisciplinaryActionType =
  | 'SUSPENSION'
  | 'WORK_DUTY'
  | 'SUSPENDED_WITH_CHORES'
  | 'PUNISHMENT'
  | 'DISMISSAL'
  | 'SUSPENDED_DISMISSAL'
  | 'END_OF_YEAR_DISMISSAL'
  | 'DISCIPLINARY_COUNCIL';

export type DisciplinaryActionStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export const ACTION_TYPES: { value: DisciplinaryActionType; label: string }[] = [
  { value: 'SUSPENSION', label: 'Suspension' },
  { value: 'WORK_DUTY', label: 'Work Duty' },
  { value: 'SUSPENDED_WITH_CHORES', label: 'Suspended with Chores' },
  { value: 'PUNISHMENT', label: 'Punishment' },
  { value: 'DISMISSAL', label: 'Dismissal' },
  { value: 'SUSPENDED_DISMISSAL', label: 'Suspended Dismissal' },
  { value: 'END_OF_YEAR_DISMISSAL', label: 'End-of-Year Dismissal' },
  { value: 'DISCIPLINARY_COUNCIL', label: 'Disciplinary Council' },
];

export const ACTION_TYPE_LABELS: Record<DisciplinaryActionType, string> = ACTION_TYPES.reduce(
  (acc, t) => ({ ...acc, [t.value]: t.label }),
  {} as Record<DisciplinaryActionType, string>,
);

export const ACTION_STATUSES: DisciplinaryActionStatus[] = [
  'PENDING',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
];

// days is required for these types; endDate auto-computes from startDate + days.
export const TYPES_REQUIRING_DAYS: DisciplinaryActionType[] = [
  'SUSPENSION',
  'SUSPENDED_WITH_CHORES',
];

export interface DisciplinaryAction {
  id: number;
  enrollmentId: number;
  disciplineIssueId?: number | null;
  actionType: DisciplinaryActionType;
  status: DisciplinaryActionStatus;
  days?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  reason: string;
  notes?: string | null;
  decidedById?: number;
  createdAt: string;
  updatedAt: string;
  enrollment?: {
    id: number;
    studentId?: number;
    academicYearId?: number;
    student?: PersonRef;
    subClass?: { id: number; name: string; class?: { id: number; name: string } };
  };
  disciplineIssue?: {
    id: number;
    issueType?: string;
    description?: string;
    createdAt?: string;
  } | null;
  decidedBy?: PersonRef | null;
}

export interface CreateDisciplinaryActionBody {
  studentId: number;
  actionType: DisciplinaryActionType;
  reason: string;
  disciplineIssueId?: number;
  days?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // optional — auto-computed from startDate + days
  notes?: string;
  academicYearId?: number;
}

export interface UpdateDisciplinaryActionBody {
  status?: DisciplinaryActionStatus;
  days?: number;
  startDate?: string;
  endDate?: string;
  reason?: string;
  notes?: string;
}

const BASE = '/disciplinary-actions';

export const createDisciplinaryAction = async (
  body: CreateDisciplinaryActionBody,
): Promise<DisciplinaryAction> => {
  const res = await apiService.post<{ data: DisciplinaryAction }>(BASE, body);
  return res.data;
};

export const listDisciplinaryActions = async (params: {
  studentId?: number;
  enrollmentId?: number;
  disciplineIssueId?: number;
  actionType?: DisciplinaryActionType;
  status?: DisciplinaryActionStatus;
  from?: string;
  to?: string;
  academicYearId?: number;
  page?: number;
  limit?: number;
} = {}): Promise<Paginated<DisciplinaryAction>> => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
  });
  const res = await apiService.get<Paginated<DisciplinaryAction>>(`${BASE}?${qs.toString()}`);
  return { data: res.data || [], meta: res.meta };
};

export const getDisciplinaryAction = async (id: number): Promise<DisciplinaryAction> => {
  const res = await apiService.get<{ data: DisciplinaryAction }>(`${BASE}/${id}`);
  return res.data;
};

export const updateDisciplinaryAction = async (
  id: number,
  body: UpdateDisciplinaryActionBody,
): Promise<DisciplinaryAction> => {
  const res = await apiService.put<{ data: DisciplinaryAction }>(`${BASE}/${id}`, body);
  return res.data;
};

export const deleteDisciplinaryAction = (id: number) => apiService.delete(`${BASE}/${id}`);

// ---------------------------------------------------------------------------
// Authorization helpers (UI gating only)
// ---------------------------------------------------------------------------

// Can create / update actions.
export const ACTION_DECISION_ROLES = [
  'DEAN_OF_DISCIPLINE',
  'VICE_PRINCIPAL',
  'PRINCIPAL',
  'MANAGER',
  'SUPER_MANAGER',
];

// Can list / view actions.
export const ACTION_VIEW_ROLES = [
  ...ACTION_DECISION_ROLES,
  'DISCIPLINE_MASTER',
  'SENIOR_DISCIPLINE_MASTER',
];

// Can delete actions.
export const ACTION_DELETE_ROLES = ['PRINCIPAL', 'MANAGER', 'SUPER_MANAGER'];

export const canDecideActions = (role?: string | null) =>
  !!role && ACTION_DECISION_ROLES.includes(role);

export const canDeleteActions = (role?: string | null) =>
  !!role && ACTION_DELETE_ROLES.includes(role);
