import apiService from './apiService';

// ---------------------------------------------------------------------------
// Expenditures API client
//
// A simple expense ledger. The Bursar logs whatever the school spends; no
// approval workflow. Each row optionally carries a receipt file (multipart on
// create/update). Case convention: send camelCase, receive camelCase.
// ---------------------------------------------------------------------------

export type ExpenditureCategory =
  | 'SALARY'
  | 'SUPPLIES'
  | 'MAINTENANCE'
  | 'EVENT'
  | 'UTILITY'
  | 'TRANSPORT'
  | 'OTHER';

export type ExpenditurePaymentMethod = 'EXPRESS_UNION' | 'CCA' | 'F3DC';

export const EXPENDITURE_CATEGORIES: { value: ExpenditureCategory; label: string }[] = [
  { value: 'SALARY', label: 'Salary' },
  { value: 'SUPPLIES', label: 'Supplies' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'EVENT', label: 'Event' },
  { value: 'UTILITY', label: 'Utility' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'OTHER', label: 'Other' },
];

export const CATEGORY_LABELS: Record<ExpenditureCategory, string> = EXPENDITURE_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.value]: c.label }),
  {} as Record<ExpenditureCategory, string>,
);

export const EXPENDITURE_PAYMENT_METHODS: { value: ExpenditurePaymentMethod; label: string }[] = [
  { value: 'EXPRESS_UNION', label: 'Express Union' },
  { value: 'CCA', label: 'CCA' },
  { value: 'F3DC', label: 'F3DC' },
];

export interface PersonRef {
  id: number;
  name: string;
  matricule?: string;
}

export interface Expenditure {
  id: number;
  date: string;
  category: ExpenditureCategory;
  description: string;
  amount: number;
  recipient?: string | null;
  recipientUserId?: number | null;
  paymentMethod?: ExpenditurePaymentMethod | null;
  receiptFile?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
  recordedById: number;
  createdAt: string;
  updatedAt: string;
  recordedBy?: PersonRef | null;
  recipientUser?: PersonRef | null;
}

export interface Paginated<T> {
  data: T[];
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
}

// ---- Create / update input (file optional) ----

export interface ExpenditureInput {
  date: string; // YYYY-MM-DD
  category: ExpenditureCategory;
  description: string;
  amount: number;
  recipient?: string;
  recipientUserId?: number;
  paymentMethod?: ExpenditurePaymentMethod | '';
  notes?: string;
  receipt?: File | null;
}

const buildFormData = (input: Partial<ExpenditureInput>): FormData => {
  const fd = new FormData();
  if (input.date != null) fd.append('date', input.date);
  if (input.category != null) fd.append('category', input.category);
  if (input.description != null) fd.append('description', input.description);
  if (input.amount != null) fd.append('amount', String(input.amount));
  if (input.recipient != null) fd.append('recipient', input.recipient);
  if (input.recipientUserId != null) fd.append('recipientUserId', String(input.recipientUserId));
  if (input.paymentMethod) fd.append('paymentMethod', input.paymentMethod);
  if (input.notes != null) fd.append('notes', input.notes);
  if (input.receipt) fd.append('receipt', input.receipt);
  return fd;
};

// ---- List filters ----

export interface ListExpendituresParams {
  from?: string;
  to?: string;
  category?: ExpenditureCategory;
  recordedById?: number;
  recipientUserId?: number;
  page?: number;
  limit?: number;
}

const buildListQuery = (params: ListExpendituresParams, includePaging = true): string => {
  const qs = new URLSearchParams();
  if (params.from) qs.append('from', params.from);
  if (params.to) qs.append('to', params.to);
  if (params.category) qs.append('category', params.category);
  if (params.recordedById) qs.append('recordedById', String(params.recordedById));
  if (params.recipientUserId) qs.append('recipientUserId', String(params.recipientUserId));
  if (includePaging) {
    qs.append('page', String(params.page ?? 1));
    qs.append('limit', String(params.limit ?? 50));
  }
  return qs.toString();
};

const BASE = '/expenditures';

export const listExpenditures = async (
  params: ListExpendituresParams = {},
): Promise<Paginated<Expenditure>> => {
  const res = await apiService.get<Paginated<Expenditure>>(`${BASE}?${buildListQuery(params)}`);
  return { data: res.data || [], meta: res.meta };
};

export const getExpenditure = async (id: number): Promise<Expenditure> => {
  const res = await apiService.get<{ data: Expenditure }>(`${BASE}/${id}`);
  return res.data;
};

export const createExpenditure = async (input: ExpenditureInput): Promise<Expenditure> => {
  const res = await apiService.post<{ data: Expenditure }>(BASE, buildFormData(input));
  return res.data;
};

export const updateExpenditure = async (
  id: number,
  input: Partial<ExpenditureInput>,
): Promise<Expenditure> => {
  const res = await apiService.put<{ data: Expenditure }>(`${BASE}/${id}`, buildFormData(input));
  return res.data;
};

export const deleteExpenditure = (id: number) => apiService.delete(`${BASE}/${id}`);

// ---- Monthly summary ----

export interface CategorySummaryRow {
  category: ExpenditureCategory;
  amount: number;
  count: number;
}

export interface ExpenditureSummary {
  month: string;
  from: string;
  to: string;
  totalAmount: number;
  count: number;
  byCategory: CategorySummaryRow[];
}

export const getExpenditureSummary = async (month: string): Promise<ExpenditureSummary> => {
  const res = await apiService.get<{ data: ExpenditureSummary }>(`${BASE}/summary?month=${month}`);
  return res.data;
};

// ---- Excel export (blob) ----

export const exportExpenditures = async (params: ListExpendituresParams = {}): Promise<Blob> => {
  const qs = buildListQuery(params, false);
  return apiService.get<Blob>(`${BASE}/export${qs ? `?${qs}` : ''}`, undefined, 'blob');
};

// ---------------------------------------------------------------------------
// Authorization helpers (mirror the backend matrix for UI gating only).
// ---------------------------------------------------------------------------

export const EXPENDITURE_PRINCIPAL_PLUS = ['SUPER_MANAGER', 'MANAGER', 'PRINCIPAL'];
export const EXPENDITURE_CREATE_ROLES = ['SUPER_MANAGER', 'MANAGER', 'PRINCIPAL', 'BURSAR'];
export const EXPENDITURE_VIEW_ROLES = [
  'SUPER_MANAGER',
  'MANAGER',
  'PRINCIPAL',
  'VICE_PRINCIPAL',
  'BURSAR',
  'SECRETARY',
  'FEE_AUDITOR',
];

const EDIT_WINDOW_DAYS = 7;

export const canCreateExpenditure = (role?: string | null) =>
  !!role && EXPENDITURE_CREATE_ROLES.includes(role);

export const canDeleteExpenditure = (role?: string | null) =>
  !!role && EXPENDITURE_PRINCIPAL_PLUS.includes(role);

/**
 * Can this user edit the given row?
 * - Principal+ : any expenditure, any time
 * - Bursar     : only their own, within 7 days of creation
 * - others     : no
 */
export const canEditExpenditure = (
  exp: Expenditure,
  role?: string | null,
  userId?: number | null,
): boolean => {
  if (!role) return false;
  if (EXPENDITURE_PRINCIPAL_PLUS.includes(role)) return true;
  if (role === 'BURSAR') {
    if (userId == null || exp.recordedById !== userId) return false;
    const created = new Date(exp.createdAt).getTime();
    if (isNaN(created)) return false;
    const ageDays = (Date.now() - created) / (1000 * 60 * 60 * 24);
    return ageDays <= EDIT_WINDOW_DAYS;
  }
  return false;
};

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export const fmtMoney = (v: any) => {
  const n = Number(v);
  if (v == null || isNaN(n)) return '—';
  return `XAF ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export const fmtDate = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export const currentMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// First / last day (YYYY-MM-DD) of a YYYY-MM month, for list filters.
export const monthBounds = (month: string): { from: string; to: string } => {
  const [y, m] = month.split('-').map(Number);
  const first = `${month}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const last = `${month}-${String(lastDay).padStart(2, '0')}`;
  return { from: first, to: last };
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
