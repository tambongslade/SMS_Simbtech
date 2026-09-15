// Parent portal API client — all endpoints are matricule-scoped and public
// (no JWT). Mirrors the backend routes at /parents/:matricule/*.
//
// Design notes:
//   - camelCase on the wire (backend case-conversion middleware handles both).
//   - Every helper tolerates the `{ data: ... }` envelope the backend wraps
//     responses in, so callers get the payload directly.
//   - Reads the active child matricule from localStorage ('parentPortal').

export const CURRENCY = 'FCFA';

export const formatMoney = (n: number | null | undefined): string => {
  const v = Number(n ?? 0);
  return `${v.toLocaleString('fr-FR')} ${CURRENCY}`;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

export const getSavedMatricules = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('parentPortal');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.matricules) ? parsed.matricules : [];
  } catch {
    return [];
  }
};

export const getActiveMatricule = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('parentPortal');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.active ?? parsed?.matricules?.[0] ?? null;
  } catch {
    return null;
  }
};

export const setActiveMatricule = (matricule: string) => {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem('parentPortal');
  const parsed = raw ? JSON.parse(raw) : {};
  const matricules = Array.from(new Set([...(parsed.matricules || []), matricule]));
  localStorage.setItem('parentPortal', JSON.stringify({ ...parsed, matricules, active: matricule }));
};

async function portalFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store', ...init });
  const json = await res.json().catch(() => ({} as any));
  if (!res.ok || (json && json.success === false)) {
    const message = (json as any)?.error || (json as any)?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return (json as any)?.data ?? (json as any);
}

const yearQs = (yearId?: number) => (yearId ? `?academicYearId=${yearId}` : '');

// ─── dashboard ─────────────────────────────────────────────────────────────
export const fetchChildDashboard = (matricule: string, academicYearId?: number) =>
  portalFetch(`/parents/${encodeURIComponent(matricule)}/dashboard${yearQs(academicYearId)}`);

// ─── details (attendance, subjects with real teachers, fees, discipline) ──
export const fetchChildDetails = (matricule: string, academicYearId?: number) =>
  portalFetch(`/parents/${encodeURIComponent(matricule)}/details${yearQs(academicYearId)}`);

// ─── analytics (performance / attendance / quiz / trends / rank) ──────────
export const fetchChildAnalytics = (matricule: string, academicYearId?: number) =>
  portalFetch(`/parents/${encodeURIComponent(matricule)}/analytics${yearQs(academicYearId)}`);

// ─── quiz results ─────────────────────────────────────────────────────────
export interface QuizResult {
  submissionId: number;
  quizTitle: string;
  subject: string;
  score: number | null;
  totalMarks: number | null;
  percentage: number | null;
  status: string;
  submittedAt: string | null;
}
export const fetchChildQuizResults = (matricule: string, academicYearId?: number): Promise<QuizResult[]> =>
  portalFetch(`/parents/${encodeURIComponent(matricule)}/quiz-results${yearQs(academicYearId)}`);

// ─── discipline: warnings / summons / disciplinary actions ────────────────
export const fetchChildDisciplinaryActions = (matricule: string, academicYearId?: number) =>
  portalFetch(`/parents/${encodeURIComponent(matricule)}/disciplinary-actions${yearQs(academicYearId)}`);
export const fetchChildWarnings = (matricule: string, academicYearId?: number) =>
  portalFetch(`/parents/${encodeURIComponent(matricule)}/warnings${yearQs(academicYearId)}`);
export const fetchChildSummons = (matricule: string, academicYearId?: number) =>
  portalFetch(`/parents/${encodeURIComponent(matricule)}/summons${yearQs(academicYearId)}`);

// ─── notifications ────────────────────────────────────────────────────────
export interface ParentNotification {
  id: number;
  title?: string;
  message: string;
  createdAt: string;
  isRead?: boolean;
  type?: string;
  linkUrl?: string | null;
}
export const fetchNotifications = (matricule: string, page = 1, limit = 20) =>
  portalFetch<{ items: ParentNotification[]; meta: any }>(
    `/parents/${encodeURIComponent(matricule)}/notifications?page=${page}&limit=${limit}`
  );

export const fetchUnreadCount = async (matricule: string): Promise<number> => {
  try {
    const res: any = await portalFetch(`/parents/${encodeURIComponent(matricule)}/notifications/unread-count`);
    return Number(res?.count ?? res?.unreadCount ?? res ?? 0);
  } catch {
    return 0;
  }
};

// ─── inbox (messages received) ────────────────────────────────────────────
export const fetchInbox = (matricule: string, page = 1, limit = 20) =>
  portalFetch(`/parents/${encodeURIComponent(matricule)}/inbox?page=${page}&limit=${limit}`);

// ─── report cards ─────────────────────────────────────────────────────────
export const fetchReportCards = (matricule: string, academicYearId?: number) =>
  portalFetch(`/parents/${encodeURIComponent(matricule)}/report-cards${yearQs(academicYearId)}`);

// ─── child photo upload (camera or file) ──────────────────────────────────
export interface UploadChildPhotoResult {
  enrollmentId: number;
  filename: string;
  url: string;
}
export const uploadChildPhoto = async (matricule: string, file: Blob | File): Promise<UploadChildPhotoResult> => {
  const form = new FormData();
  // Multer expects `photo`. Give it a filename so servers can preserve the extension.
  const filename = (file as File).name || `child-${matricule}.jpg`;
  form.append('photo', file, filename);
  const res = await fetch(`${API_BASE_URL}/parents/${encodeURIComponent(matricule)}/child-photo`, {
    method: 'POST',
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || json?.message || `Upload failed (${res.status})`);
  }
  return json.data as UploadChildPhotoResult;
};

export const getPhotoAbsoluteUrl = (filename?: string | null): string | null => {
  if (!filename) return null;
  // Full URLs pass through untouched (backend sometimes returns absolute URLs)
  if (/^https?:\/\//.test(filename)) return filename;
  const root = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  if (filename.startsWith('/uploads/')) return `${root}${filename}`;
  return `${root}/uploads/students/${filename}`;
};
