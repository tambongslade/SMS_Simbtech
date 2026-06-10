import apiService from '@/lib/apiService';

// ===========================================================================
// Subject Schemes of Work & Teacher Logbook — API client
// All endpoints under /api/v1; apiService prepends the base URL and the bearer
// token. Payloads are camelCase (backend middleware maps snake_case).
// ===========================================================================

// ---- Shared enums ----

export type LessonEntryType =
  | 'LESSON'
  | 'INTEGRATION'
  | 'EVALUATION'
  | 'REMEDIATION'
  | 'REVISION'
  | 'BREAK';

export const LESSON_ENTRY_TYPES: LessonEntryType[] = [
  'LESSON',
  'INTEGRATION',
  'EVALUATION',
  'REMEDIATION',
  'REVISION',
  'BREAK',
];

export type LogbookStatus = 'COMPLETED' | 'PARTIAL' | 'NOT_TAUGHT';

export const LOGBOOK_STATUSES: LogbookStatus[] = ['COMPLETED', 'PARTIAL', 'NOT_TAUGHT'];

// ---- Scheme tree types ----

export interface SchemeLesson {
  id: number;
  order: number;
  entryType: LessonEntryType;
  title: string;
  objectives?: string | null;
  handsOnActivities?: string | null;
  digitalResourceAvailable?: boolean;
  digitalResourcesUsed?: string | null;
  termId?: number | null;
  weekNumber?: number | null;
  periodsCount?: number;
  // Present on the coverage endpoint.
  _count?: { logbookEntries: number };
  logbookEntries?: LogbookEntry[];
}

export interface SchemeChapter {
  id: number;
  order: number;
  code?: string | null;
  title: string;
  lessons: SchemeLesson[];
}

export interface SchemeModule {
  id: number;
  order: number;
  code?: string | null;
  title: string;
  chapters: SchemeChapter[];
}

export interface SubjectScheme {
  id: number;
  subjectId: number;
  classId: number;
  academicYearId?: number | null;
  periodsPerWeek?: number | null;
  annualTeachingHours?: number | null;
  notes?: string | null;
  subject?: { id: number; name: string };
  class?: { id: number; name: string };
  modules: SchemeModule[];
  // Convenience counts some list responses include.
  _count?: { modules?: number };
}

// ---- Lesson / module / chapter input shapes ----

export interface LessonInput {
  order: number;
  entryType?: LessonEntryType;
  title: string;
  objectives?: string | null;
  handsOnActivities?: string | null;
  digitalResourceAvailable?: boolean;
  digitalResourcesUsed?: string | null;
  termId?: number | null;
  weekNumber?: number | null;
  periodsCount?: number;
}

export interface ChapterInput {
  order: number;
  code?: string;
  title: string;
  lessons?: LessonInput[];
}

export interface ModuleInput {
  order: number;
  code?: string;
  title: string;
  chapters?: ChapterInput[];
}

// ---------------------------------------------------------------------------
// Scheme — read
// ---------------------------------------------------------------------------

export const listSchemes = async (params: {
  subjectId?: number;
  classId?: number;
  academicYearId?: number;
} = {}): Promise<SubjectScheme[]> => {
  const qs = new URLSearchParams();
  if (params.subjectId) qs.append('subjectId', String(params.subjectId));
  if (params.classId) qs.append('classId', String(params.classId));
  if (params.academicYearId) qs.append('academicYearId', String(params.academicYearId));
  const q = qs.toString();
  const res = await apiService.get<{ data: SubjectScheme[] }>(`/subject-schemes${q ? `?${q}` : ''}`);
  return res.data || [];
};

export const lookupScheme = async (params: {
  subjectId: number;
  classId: number;
  academicYearId?: number;
}): Promise<SubjectScheme | null> => {
  const qs = new URLSearchParams();
  qs.append('subjectId', String(params.subjectId));
  qs.append('classId', String(params.classId));
  if (params.academicYearId) qs.append('academicYearId', String(params.academicYearId));
  const res = await apiService.get<{ data: SubjectScheme | null }>(
    `/subject-schemes/lookup?${qs.toString()}`,
  );
  return res.data ?? null;
};

export const getScheme = async (id: number): Promise<SubjectScheme> => {
  const res = await apiService.get<{ data: SubjectScheme }>(`/subject-schemes/${id}`);
  return res.data;
};

// ---------------------------------------------------------------------------
// Scheme — write (header + bulk tree)
// ---------------------------------------------------------------------------

export interface CreateSchemeBody {
  subjectId: number;
  classId: number;
  academicYearId?: number;
  periodsPerWeek?: number;
  annualTeachingHours?: number;
  notes?: string;
}

export const createScheme = async (body: CreateSchemeBody): Promise<SubjectScheme> => {
  const res = await apiService.post<{ data: SubjectScheme }>('/subject-schemes', body);
  return res.data;
};

export const createSchemeBulk = async (
  body: CreateSchemeBody & { replace?: boolean; modules: ModuleInput[] },
): Promise<SubjectScheme> => {
  const res = await apiService.post<{ data: SubjectScheme }>('/subject-schemes/bulk', body);
  return res.data;
};

export const updateScheme = async (
  id: number,
  body: { periodsPerWeek?: number; annualTeachingHours?: number; notes?: string },
): Promise<SubjectScheme> => {
  const res = await apiService.put<{ data: SubjectScheme }>(`/subject-schemes/${id}`, body);
  return res.data;
};

// Throws with the backend 409 message ("Cannot delete scheme: N logbook entries…").
export const deleteScheme = (id: number) => apiService.delete(`/subject-schemes/${id}`);

// ---------------------------------------------------------------------------
// Module / Chapter / Lesson CRUD
// ---------------------------------------------------------------------------

export const addModule = async (schemeId: number, body: ModuleInput): Promise<SchemeModule> => {
  const res = await apiService.post<{ data: SchemeModule }>(`/subject-schemes/${schemeId}/modules`, body);
  return res.data;
};

export const updateModule = async (
  moduleId: number,
  body: { order?: number; code?: string; title?: string },
): Promise<SchemeModule> => {
  const res = await apiService.put<{ data: SchemeModule }>(`/subject-schemes/modules/${moduleId}`, body);
  return res.data;
};

export const deleteModule = (moduleId: number) =>
  apiService.delete(`/subject-schemes/modules/${moduleId}`);

export const addChapter = async (moduleId: number, body: ChapterInput): Promise<SchemeChapter> => {
  const res = await apiService.post<{ data: SchemeChapter }>(
    `/subject-schemes/modules/${moduleId}/chapters`,
    body,
  );
  return res.data;
};

export const updateChapter = async (
  chapterId: number,
  body: { order?: number; code?: string; title?: string },
): Promise<SchemeChapter> => {
  const res = await apiService.put<{ data: SchemeChapter }>(
    `/subject-schemes/chapters/${chapterId}`,
    body,
  );
  return res.data;
};

export const deleteChapter = (chapterId: number) =>
  apiService.delete(`/subject-schemes/chapters/${chapterId}`);

export const addLesson = async (chapterId: number, body: LessonInput): Promise<SchemeLesson> => {
  const res = await apiService.post<{ data: SchemeLesson }>(
    `/subject-schemes/chapters/${chapterId}/lessons`,
    body,
  );
  return res.data;
};

export const updateLesson = async (
  lessonId: number,
  body: Partial<LessonInput>,
): Promise<SchemeLesson> => {
  const res = await apiService.put<{ data: SchemeLesson }>(`/subject-schemes/lessons/${lessonId}`, body);
  return res.data;
};

// Throws with the backend 409 message if the lesson has logbook entries.
export const deleteLesson = (lessonId: number) =>
  apiService.delete(`/subject-schemes/lessons/${lessonId}`);

// ---------------------------------------------------------------------------
// Excel template download + import
// ---------------------------------------------------------------------------

export const downloadSchemeTemplate = async (): Promise<Blob> =>
  apiService.get<Blob>('/subject-schemes/import/template', undefined, 'blob');

export const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export interface SchemeImportCreated {
  sheet: string;
  schemeId: number;
  subjectId: number;
  classId: number;
  moduleCount: number;
  lessonCount: number;
}

export interface SchemeImportError {
  sheet: string;
  row: number;
  message: string;
}

export interface SchemeImportResult {
  status: number; // 201 = full success, 207 = partial
  created: SchemeImportCreated[];
  errors: SchemeImportError[];
}

// The import can return HTTP 207 (partial), which apiService treats as an error
// and would discard the body. We hit fetch directly so we can read the per-sheet
// created/errors payload on both 201 and 207.
export const importSchemes = async (
  file: File,
  opts: { academicYearId?: number; replace?: boolean } = {},
): Promise<SchemeImportResult> => {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const qs = opts.academicYearId ? `?academicYearId=${opts.academicYearId}` : '';

  const form = new FormData();
  form.append('file', file);
  if (opts.replace) form.append('replace', 'true');

  const res = await fetch(`${base}/subject-schemes/import${qs}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: { created?: SchemeImportCreated[]; errors?: SchemeImportError[] };
    error?: string;
    message?: string;
  };

  if (res.status === 201 || res.status === 207) {
    return {
      status: res.status,
      created: body?.data?.created || [],
      errors: body?.data?.errors || [],
    };
  }
  throw new Error(body?.error || body?.message || `Upload failed (HTTP ${res.status}).`);
};

// ---------------------------------------------------------------------------
// Teacher logbook
// ---------------------------------------------------------------------------

export interface LogbookEntry {
  id: number;
  teacherPeriodId: number;
  lessonId: number;
  dateTaught: string;
  status: LogbookStatus;
  notes?: string | null;
  homeworkGiven?: string | null;
  teacherId?: number;
  reviewedById?: number | null;
  reviewedAt?: string | null;
  reviewerNotes?: string | null;
  lesson?: SchemeLesson & {
    chapter?: { id: number; title: string; module?: { id: number; title: string } };
  };
  teacherPeriod?: {
    id: number;
    subject?: { id: number; name: string };
    subClass?: { id: number; name: string; class?: { id: number; name: string } };
    teacher?: { id: number; name: string };
  };
}

// Returns the full scheme tree for the lesson picker, or null when the backend
// 404s ("No scheme defined for this teacher period yet").
export const getSchemeByTeacherPeriod = async (
  teacherPeriodId: number,
): Promise<SubjectScheme | null> => {
  try {
    const res = await apiService.get<{ data: SubjectScheme }>(
      `/subject-schemes/by-teacher-period/${teacherPeriodId}`,
    );
    return res.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/no scheme/i.test(message)) return null;
    throw error;
  }
};

export interface CreateLogbookBody {
  teacherPeriodId: number;
  lessonId: number;
  dateTaught: string;
  status?: LogbookStatus;
  notes?: string;
  homeworkGiven?: string;
}

export const createLogbookEntry = async (body: CreateLogbookBody): Promise<LogbookEntry> => {
  const res = await apiService.post<{ data: LogbookEntry }>('/logbook', body);
  return res.data;
};

export const listLogbook = async (params: {
  teacherId?: number;
  subClassId?: number;
  subjectId?: number;
  teacherPeriodId?: number;
  lessonId?: number;
  from?: string;
  to?: string;
  status?: LogbookStatus;
  reviewed?: boolean;
} = {}): Promise<LogbookEntry[]> => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
  });
  const q = qs.toString();
  const res = await apiService.get<{ data: LogbookEntry[] }>(`/logbook${q ? `?${q}` : ''}`);
  return res.data || [];
};

export const getLogbookEntry = async (id: number): Promise<LogbookEntry> => {
  const res = await apiService.get<{ data: LogbookEntry }>(`/logbook/${id}`);
  return res.data;
};

export const updateLogbookEntry = async (
  id: number,
  body: Partial<CreateLogbookBody>,
): Promise<LogbookEntry> => {
  const res = await apiService.put<{ data: LogbookEntry }>(`/logbook/${id}`, body);
  return res.data;
};

export const deleteLogbookEntry = (id: number) => apiService.delete(`/logbook/${id}`);

export const reviewLogbookEntry = async (
  id: number,
  body: { reviewerNotes?: string },
): Promise<LogbookEntry> => {
  const res = await apiService.post<{ data: LogbookEntry }>(`/logbook/${id}/review`, body);
  return res.data;
};

// ---------------------------------------------------------------------------
// Coverage dashboard
// ---------------------------------------------------------------------------

export interface SchemeCoverage {
  scheme: SubjectScheme;
  summary: { totalLessons: number; completedLessons: number; coveragePercent: number };
}

export const getSchemeCoverage = async (schemeId: number): Promise<SchemeCoverage> => {
  const res = await apiService.get<{ data: SchemeCoverage }>(`/logbook/coverage/${schemeId}`);
  return res.data;
};
