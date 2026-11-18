// Discipline Coordinator: administrators' assiduity (/admin-attendance) and the
// monthly discipline duty roster (/duty-roster). camelCase on the wire.
import apiService from '@/lib/apiService';

export type AdminStatus = 'PRESENT' | 'LATE' | 'ABSENT';

export interface PersonnelRow {
  userId: number;
  name: string;
  post: string;
  source: 'role' | 'added';
}

export interface AdminDayRow extends PersonnelRow {
  status: AdminStatus | null;
  arrivalTime: string | null;
  note: string | null;
  recordedBy: string | null;
}

export interface AdminReportCell {
  status: AdminStatus;
  arrivalTime: string | null;
  note: string | null;
}

export interface AdminReport {
  from: string;
  to: string;
  days: string[];
  rows: (PersonnelRow & { days: Record<string, AdminReportCell | null> })[];
  totals: { present: number; late: number; absent: number };
}

export const getAdminPersonnel = async () =>
  (await apiService.get<{ data: { personnel: PersonnelRow[]; removed: PersonnelRow[] } }>('/admin-attendance/personnel')).data;

export const setAdminPersonnel = async (userId: number, body: { post?: string; included: boolean }) =>
  (await apiService.put<{ data: unknown }>(`/admin-attendance/personnel/${userId}`, body)).data;

export const searchAdminCandidates = async (search: string) =>
  (await apiService.get<{ data: { id: number; name: string; matricule: string | null; roles: string[] }[] }>(
    `/admin-attendance/users?search=${encodeURIComponent(search)}`
  )).data;

export const getAdminDay = async (date: string) =>
  (await apiService.get<{ data: { date: string; today: string; rows: AdminDayRow[] } }>(`/admin-attendance/day?date=${date}`)).data;

export const saveAdminDay = async (
  date: string,
  entries: { userId: number; status: AdminStatus | null; arrivalTime?: string | null; note?: string | null }[]
) => (await apiService.put<{ data: { saved: number; cleared: number } }>('/admin-attendance/day', { date, entries })).data;

export const getAdminReport = async (from: string, to: string) =>
  (await apiService.get<{ data: AdminReport }>(`/admin-attendance/report?from=${from}&to=${to}`)).data;

// ---- Duty roster ----

export type RosterSection = 'SATURDAY_CONTROL' | 'PREPS_CONTROL' | 'COORDINATORS' | 'ZONES';
export const ROSTER_SECTIONS: RosterSection[] = ['SATURDAY_CONTROL', 'PREPS_CONTROL', 'COORDINATORS', 'ZONES'];

export interface RosterRow {
  id?: number | null;
  section: RosterSection;
  sortOrder?: number;
  week: number | null;
  date: string | null;
  timeLabel: string | null;
  zone: string | null;
  position: string | null;
  classLabel: string | null;
  activity: string | null;
  assigneeIds: number[];
  assigneeNames?: string[];
  assigneeNote: string | null;
}

export interface RosterMonth {
  month: string;
  previousMonth: string | null;
  updatedAt: string | null;
  sections: Record<RosterSection, RosterRow[]>;
}

export interface RosterStaff {
  id: number;
  name: string;
  gender?: string;
  roles: string[];
}

export const getDutyRoster = async (month: string) =>
  (await apiService.get<{ data: RosterMonth }>(`/duty-roster?month=${month}`)).data;

export const saveDutyRoster = async (month: string, entries: RosterRow[]) =>
  (await apiService.put<{ data: { rows: number; created: number; updated: number; removed: number } }>('/duty-roster', { month, entries })).data;

export const getRosterStaff = async () => (await apiService.get<{ data: RosterStaff[] }>('/duty-roster/staff')).data;
