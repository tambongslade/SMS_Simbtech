import apiService from './apiService';

// ---------------------------------------------------------------------------
// Discipline Master API client
//
// Covers the four DM workflows: generic discipline issues, morning lateness
// (with the term-scoped 3-strike → Saturday-punishment alerts), bulk class
// absences, and broken property (which auto-bills the student via a FeeItem).
// Case convention: send camelCase, receive camelCase.
// ---------------------------------------------------------------------------

export type DisciplineIssueType =
  | 'MORNING_LATENESS'
  | 'CLASS_ABSENCE'
  | 'MISCONDUCT'
  | 'BROKEN_PROPERTY'
  | 'OTHER';

export const ISSUE_TYPES: { value: DisciplineIssueType; label: string }[] = [
  { value: 'MORNING_LATENESS', label: 'Morning Lateness' },
  { value: 'CLASS_ABSENCE', label: 'Class Absence' },
  { value: 'MISCONDUCT', label: 'Misconduct' },
  { value: 'BROKEN_PROPERTY', label: 'Broken Property' },
  { value: 'OTHER', label: 'Other' },
];

export type PunishmentStatus = 'PENDING' | 'SERVED' | 'SKIPPED';

export interface PersonRef {
  id: number;
  name: string;
  matricule?: string;
}

export interface Paginated<T> {
  data: T[];
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
}

// ---------------------------------------------------------------------------
// Role helpers (UI gating only — the backend enforces the real matrix)
// ---------------------------------------------------------------------------

export const DM_AND_ADMIN = [
  'SUPER_MANAGER',
  'MANAGER',
  'PRINCIPAL',
  'VICE_PRINCIPAL',
  'DISCIPLINE_MASTER',
  'SENIOR_DISCIPLINE_MASTER',
];

export const DM_VIEW_ROLES = [...DM_AND_ADMIN, 'TEACHER'];

export const BURSAR_VIEW = [...DM_AND_ADMIN, 'BURSAR', 'FEE_AUDITOR']; // broken-property only

export const ADMIN_DELETE = ['SUPER_MANAGER', 'MANAGER', 'PRINCIPAL'];

export const canManageDiscipline = (role?: string | null) =>
  !!role && DM_AND_ADMIN.includes(role);

export const canAdminDelete = (role?: string | null) => !!role && ADMIN_DELETE.includes(role);

// ---------------------------------------------------------------------------
// 1) Discipline issues
// ---------------------------------------------------------------------------

export interface DisciplineIssue {
  id: number;
  enrollmentId: number;
  issueType: DisciplineIssueType;
  description: string;
  notes?: string | null;
  actionTaken?: string | null;
  assignedById?: number;
  reviewedById?: number;
  createdAt: string;
  updatedAt: string;
  assignedBy?: PersonRef | null;
  reviewedBy?: PersonRef | null;
  enrollment?: any;
}

export interface CreateDisciplineIssueBody {
  studentId: number;
  issueType: DisciplineIssueType;
  description: string;
  notes?: string;
  actionTaken?: string;
  academicYearId?: number;
}

export const createDisciplineIssue = async (
  body: CreateDisciplineIssueBody,
): Promise<DisciplineIssue> => {
  const res = await apiService.post<{ data: DisciplineIssue }>('/discipline', body);
  return res.data;
};

export const updateDisciplineIssue = async (
  id: number,
  body: { actionTaken?: string; notes?: string; description?: string },
): Promise<DisciplineIssue> => {
  const res = await apiService.put<{ data: DisciplineIssue }>(`/discipline/${id}`, body);
  return res.data;
};

export const listDisciplineIssues = async (params: {
  studentId?: number;
  classId?: number;
  subClassId?: number;
  startDate?: string;
  endDate?: string;
  issueType?: DisciplineIssueType;
  includeAssignedBy?: boolean;
  includeReviewedBy?: boolean;
  includeStudent?: boolean;
  academicYearId?: number;
  page?: number;
  limit?: number;
} = {}): Promise<Paginated<DisciplineIssue>> => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
  });
  const res = await apiService.get<Paginated<DisciplineIssue>>(`/discipline?${qs.toString()}`);
  return { data: res.data || [], meta: res.meta };
};

export const getStudentDisciplineHistory = async (
  studentId: number,
  academicYearId?: number,
): Promise<DisciplineIssue[]> => {
  const qs = academicYearId ? `?academicYearId=${academicYearId}` : '';
  const res = await apiService.get<{ data: DisciplineIssue[] }>(`/discipline/${studentId}${qs}`);
  return res.data || [];
};

// ---------------------------------------------------------------------------
// 2) Morning lateness
// ---------------------------------------------------------------------------

export interface StudentAbsence {
  id: number;
  enrollmentId: number;
  absenceType: string;
  teacherPeriodId?: number | null;
  assignedById?: number;
  createdAt: string;
  enrollment?: {
    id: number;
    student?: PersonRef;
    subClass?: { id: number; name: string; class?: { id: number; name: string } };
  };
  assignedBy?: PersonRef | null;
}

export interface PendingPunishmentAlert {
  latenessCountInTerm: number;
  termId: number;
}

export interface LatenessResult {
  absence: StudentAbsence;
  pendingPunishmentAlert: PendingPunishmentAlert | null;
}

export interface RecordLatenessBody {
  studentId: number;
  date?: string; // YYYY-MM-DD, defaults to today
  arrivalTime?: string; // HH:mm
  minutesLate?: number;
  reason?: string;
  actionTaken?: string;
  academicYearId?: number;
}

export const recordLateness = async (body: RecordLatenessBody): Promise<LatenessResult> => {
  const res = await apiService.post<{ data: LatenessResult }>('/discipline/lateness', body);
  return res.data;
};

export interface BulkLatenessBody {
  date?: string;
  academicYearId?: number;
  records: Array<{
    studentId: number;
    arrivalTime?: string;
    minutesLate?: number;
    reason?: string;
    actionTaken?: string;
  }>;
}

export interface NewAlert {
  studentId: number;
  latenessCountInTerm: number;
  termId: number;
}

export interface BulkLatenessResult {
  successfulRecords: number;
  failedRecords: number;
  successes: LatenessResult[];
  errors: Array<{ studentId?: number; error?: string; message?: string }>;
  newAlerts: NewAlert[];
}

export const recordLatenessBulk = async (body: BulkLatenessBody): Promise<BulkLatenessResult> => {
  const res = await apiService.post<{ data: BulkLatenessResult }>('/discipline/lateness/bulk', body);
  return res.data;
};

export interface LatenessStatistics {
  totalLatenessToday: number;
  totalLatenessThisWeek: number;
  totalLatenessThisMonth: number;
  chronicallyLateStudents: Array<{
    student: PersonRef;
    class?: string;
    subclass?: string;
    latenessCount: number;
  }>;
  latenessByClass: Array<{ className: string; latenessCount: number }>;
}

export const getLatenessStatistics = async (params: {
  academicYearId?: number;
} = {}): Promise<LatenessStatistics> => {
  // Send both spellings — deployed handler reads snake_case from req.query.
  const qs = params.academicYearId
    ? `?academicYearId=${params.academicYearId}&academic_year_id=${params.academicYearId}`
    : '';
  const res = await apiService.get<{ data: LatenessStatistics }>(
    `/discipline/lateness/statistics${qs}`,
  );
  return res.data;
};

export const getLatenessDailyReport = async (date: string): Promise<any> => {
  const res = await apiService.get<{ data: any }>(
    `/discipline/lateness/daily-report?date=${date}`,
  );
  return res.data;
};

// ---- 3-strike alerts ----

export interface LatenessAlert {
  enrollmentId: number;
  student: PersonRef;
  className?: string;
  subClassName?: string;
  latenessCountInTerm: number;
  pendingPunishmentsScheduled: number;
  punishmentsOwed: number;
  term?: { id: number; name: string };
}

export const getLatenessAlerts = async (academicYearId?: number): Promise<LatenessAlert[]> => {
  // Send both spellings — deployed handler reads snake_case from req.query.
  const qs = academicYearId
    ? `?academicYearId=${academicYearId}&academic_year_id=${academicYearId}`
    : '';
  const res = await apiService.get<{ data: LatenessAlert[] }>(`/discipline/lateness/alerts${qs}`);
  return res.data || [];
};

// ---------------------------------------------------------------------------
// 3) Absences — bulk form
// ---------------------------------------------------------------------------

export interface AbsenceFormStudent {
  enrollmentId: number;
  studentId: number;
  name: string;
  matricule?: string;
}

export interface AbsenceFormPeriod {
  teacherPeriodId: number;
  periodName: string;
  startTime?: string;
  endTime?: string;
  subjectName?: string;
  teacherName?: string;
}

export interface AbsenceFormData {
  subclass: { id: number; name: string; className?: string };
  date: string;
  students: AbsenceFormStudent[];
  periods: AbsenceFormPeriod[];
}

export const getAbsencesFormData = async (
  subClassId: number,
  date: string,
  academicYearId?: number,
): Promise<AbsenceFormData> => {
  if (!Number.isFinite(subClassId) || subClassId <= 0) {
    throw new Error('Select a valid subclass first.');
  }
  const qs = new URLSearchParams();
  qs.append('subClassId', String(subClassId));
  qs.append('date', date);
  if (academicYearId) qs.append('academicYearId', String(academicYearId));
  // Compat shim: the deployed handler still reads snake_case from req.query
  // (camelCase only lands in req.finalQuery). Remove once the backend fix
  // for disciplineController.getAbsenceFormData is deployed.
  qs.append('sub_class_id', String(subClassId));
  if (academicYearId) qs.append('academic_year_id', String(academicYearId));
  const res = await apiService.get<{ data: AbsenceFormData }>(
    `/discipline/absences/form-data?${qs.toString()}`,
  );
  return res.data;
};

// ---- Subclass options (tolerant of role-specific response shapes) ----

export interface SubClassOption {
  id: number;
  name: string;
  className?: string;
}

const normalizeSubClasses = (list: any[]): SubClassOption[] =>
  (list || [])
    .map((sc: any) => ({
      id: Number(sc.id ?? sc.subClassId ?? sc.sub_class_id),
      name: sc.name,
      className: sc.class?.name ?? sc.className,
    }))
    .filter((sc) => Number.isFinite(sc.id) && sc.id > 0 && !!sc.name);

/**
 * Fetch subclasses for pickers. Handles both the flat and double-nested list
 * shapes, drops rows without a usable id, and falls back to deriving them
 * from /classes for roles that cannot hit /classes/sub-classes.
 */
export const listSubClassOptions = async (): Promise<SubClassOption[]> => {
  try {
    const r = await apiService.get<any>('/classes/sub-classes?limit=100');
    const raw = Array.isArray(r?.data) ? r.data : Array.isArray(r?.data?.data) ? r.data.data : [];
    const mapped = normalizeSubClasses(raw);
    if (mapped.length > 0) return mapped;
  } catch {
    /* fall through to /classes */
  }
  try {
    const c = await apiService.get<any>('/classes?limit=100');
    const classes: any[] = Array.isArray(c?.data) ? c.data : [];
    return classes.flatMap((cl: any) =>
      normalizeSubClasses(
        (cl.subClasses || cl.sub_classes || []).map((sc: any) => ({ ...sc, className: cl.name })),
      ),
    );
  } catch {
    return [];
  }
};

export interface BulkAbsencesBody {
  date: string;
  subClassId: number;
  academicYearId?: number;
  // periodIds omitted → one full-day row; provided → one row per period.
  absences: Array<{ studentId: number; periodIds?: number[] }>;
}

export interface BulkAbsencesResult {
  created: number;
  skipped: Array<{ studentId: number; reason: string }>;
}

export const createAbsencesBulk = async (body: BulkAbsencesBody): Promise<BulkAbsencesResult> => {
  const res = await apiService.post<{ data: BulkAbsencesResult }>('/discipline/absences/bulk', body);
  return res.data;
};

export const updateAbsence = async (
  id: number,
  body: { teacherPeriodId?: number | null; absenceType?: string },
): Promise<StudentAbsence> => {
  const res = await apiService.put<{ data: StudentAbsence }>(`/discipline/absences/${id}`, body);
  return res.data;
};

export const deleteAbsence = (id: number) => apiService.delete(`/discipline/absences/${id}`);

// ---------------------------------------------------------------------------
// 4) Broken property (auto-bills the student via a FeeItem)
// ---------------------------------------------------------------------------

export interface BrokenProperty {
  id: number;
  enrollmentId: number;
  itemName: string;
  description?: string | null;
  estimatedCost: number;
  actionTaken?: string | null;
  feeItemId?: number | null;
  reportedById?: number;
  createdAt: string;
  updatedAt: string;
  enrollment?: {
    id: number;
    student?: PersonRef;
    subClass?: { id: number; name: string; class?: { id: number; name: string } };
  };
  feeItem?: {
    id: number;
    name: string;
    amount: number;
    isActive?: boolean;
    payments?: Array<{
      id: number;
      amount: number;
      paymentDate?: string;
      receiptNumber?: string | null;
      paymentMethod?: string;
    }>;
  } | null;
  reportedBy?: PersonRef | null;
}

export interface CreateBrokenPropertyBody {
  studentId: number;
  itemName: string;
  description?: string;
  estimatedCost: number;
  actionTaken?: string;
  academicYearId?: number;
}

export const createBrokenProperty = async (
  body: CreateBrokenPropertyBody,
): Promise<BrokenProperty> => {
  const res = await apiService.post<{ data: BrokenProperty }>('/discipline/broken-property', body);
  return res.data;
};

export const listBrokenProperty = async (params: {
  studentId?: number;
  enrollmentId?: number;
  from?: string;
  to?: string;
  academicYearId?: number;
  page?: number;
  limit?: number;
} = {}): Promise<Paginated<BrokenProperty>> => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
  });
  const res = await apiService.get<Paginated<BrokenProperty>>(
    `/discipline/broken-property?${qs.toString()}`,
  );
  return { data: res.data || [], meta: res.meta };
};

export const getBrokenProperty = async (id: number): Promise<BrokenProperty> => {
  const res = await apiService.get<{ data: BrokenProperty }>(`/discipline/broken-property/${id}`);
  return res.data;
};

export const updateBrokenProperty = async (
  id: number,
  body: Partial<Pick<CreateBrokenPropertyBody, 'itemName' | 'description' | 'estimatedCost' | 'actionTaken'>>,
): Promise<BrokenProperty> => {
  const res = await apiService.put<{ data: BrokenProperty }>(
    `/discipline/broken-property/${id}`,
    body,
  );
  return res.data;
};

export const deleteBrokenProperty = (id: number) =>
  apiService.delete(`/discipline/broken-property/${id}`);

// ---------------------------------------------------------------------------
// 5) Saturday punishments
// ---------------------------------------------------------------------------

export interface SaturdayPunishment {
  id: number;
  enrollmentId: number;
  reason: string;
  scheduledDate: string;
  servedDate?: string | null;
  status: PunishmentStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  enrollment?: {
    id: number;
    student?: PersonRef;
    subClass?: { id: number; name: string; class?: { id: number; name: string } };
  };
  assignedBy?: PersonRef | null;
}

export interface CreateSaturdayPunishmentBody {
  studentId: number;
  reason: string;
  scheduledDate: string; // YYYY-MM-DD
  notes?: string;
  academicYearId?: number;
}

export const createSaturdayPunishment = async (
  body: CreateSaturdayPunishmentBody,
): Promise<SaturdayPunishment> => {
  const res = await apiService.post<{ data: SaturdayPunishment }>(
    '/discipline/saturday-punishments',
    body,
  );
  return res.data;
};

export const listSaturdayPunishments = async (params: {
  studentId?: number;
  enrollmentId?: number;
  status?: PunishmentStatus;
  from?: string;
  to?: string;
  academicYearId?: number;
  page?: number;
  limit?: number;
} = {}): Promise<Paginated<SaturdayPunishment>> => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
  });
  const res = await apiService.get<Paginated<SaturdayPunishment>>(
    `/discipline/saturday-punishments?${qs.toString()}`,
  );
  return { data: res.data || [], meta: res.meta };
};

export const getSaturdayPunishment = async (id: number): Promise<SaturdayPunishment> => {
  const res = await apiService.get<{ data: SaturdayPunishment }>(
    `/discipline/saturday-punishments/${id}`,
  );
  return res.data;
};

export const updateSaturdayPunishment = async (
  id: number,
  body: { status?: PunishmentStatus; servedDate?: string; notes?: string; scheduledDate?: string },
): Promise<SaturdayPunishment> => {
  const res = await apiService.put<{ data: SaturdayPunishment }>(
    `/discipline/saturday-punishments/${id}`,
    body,
  );
  return res.data;
};

export const deleteSaturdayPunishment = (id: number) =>
  apiService.delete(`/discipline/saturday-punishments/${id}`);

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

export const todayStr = () => new Date().toISOString().split('T')[0];

// The next Saturday (or today if it is Saturday) — default for scheduling.
export const nextSaturdayStr = (): string => {
  const d = new Date();
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = (6 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
};

// Student name/class out of an embedded enrollment.
export const enrollmentStudent = (row: {
  enrollment?: { student?: PersonRef; subClass?: { name?: string; class?: { name?: string } } };
}): { name: string; matricule?: string; className: string } => {
  const s = row.enrollment?.student;
  const sc = row.enrollment?.subClass;
  return {
    name: s?.name || '—',
    matricule: s?.matricule,
    className: [sc?.class?.name, sc?.name].filter(Boolean).join(' · ') || '—',
  };
};

// ---------------------------------------------------------------------------
// 8) Unified roll-call (morning, by subclass) — GET/POST /discipline/roll-call
// ---------------------------------------------------------------------------
// The unified endpoint reconciles a subclass's morning attendance in one round
// trip. The GET returns each student pre-filled with their current status so the
// UI can default to PRESENT and only tap to correct. The POST is idempotent:
// submitting a status overwrites any existing morning record for that student on
// that date (PRESENT clears it). It does NOT carry lateness detail or fire the
// 3-strike alert — for LATE we still use recordLatenessBulk so that metadata and
// the Saturday-punishment alerts survive.

export type RollCallStatus = 'PRESENT' | 'LATE' | 'ABSENT';

export interface RollCallStudent {
  enrollmentId: number;
  studentId: number;
  name: string;
  matricule?: string;
  status: RollCallStatus;
  absenceId?: number | null;
}

export interface RollCallData {
  subclass: { id: number; name: string; className?: string };
  date: string;
  dayOfWeek?: string;
  students: RollCallStudent[];
  summary?: { total: number; present: number; late: number; absent: number };
}

export interface RollCallSubmitResult {
  updated: number;
  skipped: Array<{ enrollmentId: number; reason: string }>;
}

export const getRollCall = async (
  subClassId: number,
  date: string,
  academicYearId?: number,
): Promise<RollCallData> => {
  if (!Number.isFinite(subClassId) || subClassId <= 0) {
    throw new Error('Select a valid subclass first.');
  }
  const qs = new URLSearchParams();
  qs.append('subClassId', String(subClassId));
  qs.append('date', date);
  if (academicYearId) qs.append('academicYearId', String(academicYearId));
  const res = await apiService.get<{ data: RollCallData }>(`/discipline/roll-call?${qs.toString()}`);
  return res.data;
};

export const submitRollCall = async (body: {
  subClassId: number;
  date: string;
  academicYearId?: number;
  entries: Array<{ enrollmentId: number; status: RollCallStatus }>;
}): Promise<RollCallSubmitResult> => {
  const res = await apiService.post<{ data: RollCallSubmitResult }>('/discipline/roll-call', body);
  return res.data;
};

// ---------------------------------------------------------------------------
// 9) In-class period roll-call — GET/POST /teacher-periods/:id/roll-call
// ---------------------------------------------------------------------------
// Keyed by the teacherPeriodId from the teacher's timetable. Status is only
// PRESENT | ABSENT (lateness is a morning-gate concept). A plain TEACHER may
// only submit for a period they own (else 403); admins can submit for any.

export type PeriodRollCallStatus = 'PRESENT' | 'ABSENT';

export interface PeriodRollCallStudent {
  enrollmentId: number;
  studentId: number;
  fullName: string;
  matricule?: string;
  status: PeriodRollCallStatus | null;
}

export interface PeriodRollCallData {
  teacherPeriodId: number;
  subClass: { id: number; name: string; className?: string };
  subject: { id: number; name: string };
  period: { id: number; dayOfWeek: string; startTime: string; endTime: string };
  students: PeriodRollCallStudent[];
}

export const getPeriodRollCall = async (teacherPeriodId: number): Promise<PeriodRollCallData> => {
  if (!Number.isFinite(teacherPeriodId) || teacherPeriodId <= 0) {
    throw new Error('Invalid teacher period.');
  }
  const res = await apiService.get<{ data: PeriodRollCallData }>(
    `/teacher-periods/${teacherPeriodId}/roll-call`,
  );
  return res.data;
};

export const submitPeriodRollCall = async (
  teacherPeriodId: number,
  entries: Array<{ enrollmentId: number; status: PeriodRollCallStatus }>,
): Promise<RollCallSubmitResult> => {
  const res = await apiService.post<{ data: RollCallSubmitResult }>(
    `/teacher-periods/${teacherPeriodId}/roll-call`,
    { entries },
  );
  return res.data;
};
