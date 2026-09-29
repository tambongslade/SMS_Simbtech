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
// Same payload as /timetables/full-school (the school-wide timetable) plus the
// week's recorded attendance. Join attendance onto a slot with
// slot.id (= TeacherPeriod id) + the date of the slot's day column.

export interface OverviewPeriod {
  id: number;
  name: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  sequence: number;
  type?: 'TEACHING' | 'BREAK' | 'PREP';
  isBreak?: boolean;
  periodSetId?: number | null;
}

export interface OverviewSlot {
  id: number; // TeacherPeriod id
  subClassId: number;
  day: string;
  periodId: number;
  periodType?: 'TEACHING' | 'BREAK' | 'PREP';
  subjectName: string | null;
  teacherId: number | null;
  teacherName: string | null;
}

export interface OverviewSubclassBlock {
  subClass: { id: number; name: string; className: string; classId: number };
  periodSet: { id: number; code: string; name: string } | null;
  periods: OverviewPeriod[];
  slots: OverviewSlot[];
}

export interface OverviewAttendance {
  id: number;
  teacherPeriodId: number;
  date: string; // YYYY-MM-DD
  status: TeacherAttendanceStatus;
  reason?: string | null;
  recordedBy?: { id: number; name: string } | null;
}

export interface TeacherWeekOverview {
  academicYearId: number;
  academicYearName: string;
  weekStart: string;
  weekEnd: string;
  today: string;
  days: { date: string; dayOfWeek: string }[];
  subclasses: OverviewSubclassBlock[];
  attendance: OverviewAttendance[];
  /** Sub-classes assigned to the viewer as Dean of Discipline (empty for everyone else). */
  mySubClassIds: number[];
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
  return {
    ...data,
    days: data.days || [],
    subclasses: data.subclasses || [],
    attendance: data.attendance || [],
    mySubClassIds: data.mySubClassIds || [],
  };
};

// ---- Dean of Discipline class assignments ------------------------------------

export interface DeanAssignment {
  id: number;
  name: string;
  matricule?: string | null;
  subClassIds: number[];
}

export const listDeansWithAssignments = async (academicYearId?: number): Promise<DeanAssignment[]> => {
  const qs = academicYearId ? `?academicYearId=${academicYearId}` : '';
  const res = await apiService.get<{ data: { deans: DeanAssignment[] } }>(
    `/discipline-master/teacher-attendance/deans${qs}`
  );
  return res.data?.deans || [];
};

// Replaces the dean's assigned sub-classes for the year with exactly this set.
export const setDeanSubClasses = async (
  userId: number,
  subClassIds: number[],
  academicYearId?: number
): Promise<void> => {
  await apiService.put(`/discipline-master/teacher-attendance/deans/${userId}/sub-classes`, {
    subClassIds,
    academicYearId: academicYearId ?? undefined,
  });
};

// ---- Bulk "mark all present" for one day ---------------------------------------

export interface MarkAllPresentResult {
  date: string;
  total: number;
  created: number;
  alreadyRecorded: number;
}

// Fills PRESENT only where nothing is recorded yet for that one day; never overwrites.
export const markAllTeachersPresent = async (
  date: string,
  subClassIds?: number[],
  academicYearId?: number
): Promise<MarkAllPresentResult> => {
  const res = await apiService.post<{ data: MarkAllPresentResult }>('/discipline-master/teacher-attendance/mark-all-present', {
    date,
    subClassIds: subClassIds && subClassIds.length ? subClassIds : undefined,
    academicYearId: academicYearId ?? undefined,
  });
  return res.data;
};
