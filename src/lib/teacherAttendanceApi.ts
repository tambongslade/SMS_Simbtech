// API client for DM teacher-period attendance
// (/discipline-master/teacher-attendance). camelCase on the wire.

import apiService from './apiService';

export type TeacherAttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT';

export interface TeacherAttendanceRecord {
  id: number;
  status: TeacherAttendanceStatus;
  wellDressed: boolean;
  classManagement: boolean;
  punctuality: boolean;
  assiduity: boolean;
  reason?: string | null;
  notes?: string | null;
  recordedById?: number;
  recordedBy?: { id: number; name: string; matricule?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherAttendancePeriodRow {
  teacherPeriodId: number;
  period?: { id: number; dayOfWeek?: string; startTime?: string; endTime?: string; name?: string; isBreak?: boolean };
  subject?: { id: number; name: string; category?: string };
  subClass?: { id: number; name: string; class?: { id: number; name: string } };
  teacher?: { id: number; name: string; matricule?: string; phone?: string };
  attendance: TeacherAttendanceRecord | null;
}

export interface TeacherAttendanceDay {
  date: string;
  dayOfWeek?: string;
  academicYearId?: number;
  periods: TeacherAttendancePeriodRow[];
}

export interface TeacherAttendanceEntry {
  teacherPeriodId: number;
  status: TeacherAttendanceStatus;
  wellDressed?: boolean;
  classManagement?: boolean;
  punctuality?: boolean;
  assiduity?: boolean;
  reason?: string;
  notes?: string;
}

export const getTeacherAttendanceDay = async (
  date: string,
  subClassId?: number,
  academicYearId?: number
): Promise<TeacherAttendanceDay> => {
  const qs = new URLSearchParams({ date });
  if (subClassId) qs.append('subClassId', String(subClassId));
  if (academicYearId) qs.append('academicYearId', String(academicYearId));
  const res = await apiService.get<{ data: TeacherAttendanceDay }>(
    `/discipline-master/teacher-attendance?${qs.toString()}`
  );
  const data = res.data || ({} as TeacherAttendanceDay);
  return { ...data, periods: data.periods || [] };
};

export const saveTeacherAttendanceDay = async (body: {
  date: string;
  academicYearId?: number;
  entries: TeacherAttendanceEntry[];
}): Promise<any> => {
  const res = await apiService.post<{ data: any }>('/discipline-master/teacher-attendance', body);
  return res.data;
};

export const updateTeacherAttendance = async (
  id: number,
  body: Partial<TeacherAttendanceEntry>
): Promise<TeacherAttendanceRecord> => {
  const res = await apiService.put<{ data: TeacherAttendanceRecord }>(
    `/discipline-master/teacher-attendance/${id}`,
    body
  );
  return res.data;
};

export const deleteTeacherAttendance = async (id: number): Promise<void> => {
  await apiService.delete(`/discipline-master/teacher-attendance/${id}`);
};

// ---- Weekly overview (Dean of Discipline / Manager / Super Manager) ----------
// Read-only grid built from what the DMs record via saveTeacherAttendanceDay.

export interface TeacherWeekCell {
  teacherPeriodId: number;
  period: { id: number; name: string; startTime: string; endTime: string; sequence: number };
  subject?: { id: number; name: string };
  subClass?: { id: number; name: string; class?: { id: number; name: string } };
  status: TeacherAttendanceStatus | null; // null = not recorded yet
  reason?: string | null;
  recordedBy?: { id: number; name: string } | null;
}

export interface TeacherWeekRow {
  id: number;
  name: string;
  matricule: string | null;
  days: Record<string, TeacherWeekCell[]>; // keyed by YYYY-MM-DD
  totals: { present: number; late: number; absent: number; pending: number; upcoming: number };
}

export interface TeacherWeekOverview {
  academicYearId: number;
  weekStart: string;
  weekEnd: string;
  today: string;
  days: { date: string; dayOfWeek: string }[];
  teachers: TeacherWeekRow[];
}

export const getTeacherAttendanceWeekOverview = async (
  weekStart: string,
  academicYearId?: number
): Promise<TeacherWeekOverview> => {
  const qs = new URLSearchParams({ weekStart });
  if (academicYearId) qs.append('academicYearId', String(academicYearId));
  const res = await apiService.get<{ data: TeacherWeekOverview }>(
    `/discipline-master/teacher-attendance/overview?${qs.toString()}`
  );
  const data = res.data || ({} as TeacherWeekOverview);
  return { ...data, days: data.days || [], teachers: data.teachers || [] };
};
