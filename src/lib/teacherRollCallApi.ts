// API client for teacher per-period roll call and its oversight endpoints.
// camelCase on the wire.

import apiService from './apiService';

export type TeacherRollCallStatus = 'PRESENT' | 'LATE' | 'ABSENT';

export interface PeriodInfo {
  teacherPeriodId: number;
  periodId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  periodName?: string;
  subject?: { id: number; name: string; category?: string };
  subClass?: { id: number; name: string; class?: { id: number; name: string } };
  teacher?: { id: number; name: string; matricule?: string };
}

export interface RosterEntry {
  enrollmentId: number;
  student: { id: number; matricule?: string; name: string; nom?: string; prenom?: string; gender?: string };
  status: TeacherRollCallStatus | null;
  entry: any | null;
}

export interface PeriodRollCallData {
  period: PeriodInfo | null;
  date?: string;
  rollCall: { id: number; recordedBy?: any; notes?: string | null; entryCount?: number; createdAt?: string; updatedAt?: string } | null;
  roster: RosterEntry[];
}

export interface TeacherRollCallSummary {
  id: number;
  date: string;
  notes?: string | null;
  teacherPeriod?: {
    id: number;
    subject?: { id: number; name: string };
    subClass?: { id: number; name: string; class?: { id: number; name: string } };
    teacher?: { id: number; name: string };
    period?: { name?: string; dayOfWeek?: string; startTime?: string; endTime?: string };
  };
  recordedBy?: { id: number; name: string };
  _count?: { entries: number };
  entries?: Array<{
    id: number;
    status: TeacherRollCallStatus;
    notes?: string | null;
    enrollment?: { student?: { id: number; name: string; matricule?: string } };
    student?: { id: number; name: string; matricule?: string };
  }>;
  createdAt?: string;
}

const normalizePeriodData = (d: any): PeriodRollCallData => ({
  period: d?.period
    ? {
        teacherPeriodId: d.period.teacherPeriodId,
        periodId: d.period.periodId,
        dayOfWeek: d.period.dayOfWeek,
        startTime: d.period.startTime,
        endTime: d.period.endTime,
        periodName: d.period.periodName,
        subject: d.period.subject,
        subClass: d.period.subClass,
        teacher: d.period.teacher,
      }
    : null,
  date: d?.date,
  rollCall: d?.rollCall ?? null,
  roster: (d?.roster || []).map((r: any) => ({
    enrollmentId: r.enrollmentId,
    student: r.student,
    status: r.status ?? null,
    entry: r.entry ?? null,
  })),
});

// 1) Auto-detect the class the teacher is in right now
export const getCurrentPeriod = async (): Promise<PeriodRollCallData> => {
  const res = await apiService.get<{ data: any }>('/teachers/me/current-period');
  return normalizePeriodData(res.data);
};

// 2) Open roll call for a chosen period (timetable tap)
export const getPeriodRollCall = async (teacherPeriodId: number, date?: string): Promise<PeriodRollCallData> => {
  const qs = date ? `?date=${date}` : '';
  const res = await apiService.get<{ data: any }>(`/teachers/me/teacher-periods/${teacherPeriodId}/roll-call${qs}`);
  return normalizePeriodData(res.data);
};

// 3) Submit / re-submit (replaces prior entries atomically)
export const submitRollCall = async (body: {
  teacherPeriodId: number;
  date?: string;
  notes?: string;
  entries: Array<{ enrollmentId: number; status: TeacherRollCallStatus; notes?: string }>;
}): Promise<any> => {
  const res = await apiService.post<{ data: any }>('/teachers/me/roll-call', body);
  return res.data;
};

// 4) My recent roll calls
export const listMyRollCalls = async (params: { from?: string; to?: string; limit?: number } = {}): Promise<TeacherRollCallSummary[]> => {
  const qs = new URLSearchParams();
  if (params.from) qs.append('from', params.from);
  if (params.to) qs.append('to', params.to);
  qs.append('limit', String(params.limit ?? 100));
  const res = await apiService.get<{ data: any[] }>(`/teachers/me/roll-calls?${qs.toString()}`);
  return res.data || [];
};

// 5) Oversight (SDM / DoD / VP / Principal / Manager / Super-Manager)
export const listOversightRollCalls = async (params: {
  date?: string;
  from?: string;
  to?: string;
  subClassId?: number;
  teacherId?: number;
  subjectId?: number;
  onlyWithAbsences?: boolean;
  limit?: number;
} = {}): Promise<TeacherRollCallSummary[]> => {
  const qs = new URLSearchParams();
  if (params.date) qs.append('date', params.date);
  if (params.from) qs.append('from', params.from);
  if (params.to) qs.append('to', params.to);
  if (params.subClassId) qs.append('subClassId', String(params.subClassId));
  if (params.teacherId) qs.append('teacherId', String(params.teacherId));
  if (params.subjectId) qs.append('subjectId', String(params.subjectId));
  if (params.onlyWithAbsences) qs.append('onlyWithAbsences', 'true');
  qs.append('limit', String(params.limit ?? 100));
  const res = await apiService.get<{ data: any[] }>(`/roll-calls/teacher-periods?${qs.toString()}`);
  return res.data || [];
};

export const getOversightRollCall = async (id: number): Promise<TeacherRollCallSummary> => {
  const res = await apiService.get<{ data: any }>(`/roll-calls/teacher-periods/${id}`);
  return res.data;
};

export const ROLL_CALL_OVERSIGHT_ROLES = [
  'SUPER_MANAGER', 'MANAGER', 'PRINCIPAL', 'VICE_PRINCIPAL', 'DEAN_OF_DISCIPLINE', 'SENIOR_DISCIPLINE_MASTER',
];
