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
