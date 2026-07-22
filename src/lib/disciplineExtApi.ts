// API client for the discipline extensions and student-profile extensions:
// excuse/makeup on absences, warnings, parent summons, DM slot roll-call,
// previous schools and siblings. All endpoints use the standard
// { success, data } envelope handled by apiService.

import apiService from './apiService';

// --- Enums ---

export type HealthCondition =
  | 'SICKLE_CELL' | 'ASTHMATIC' | 'EPILEPTIC' | 'DIABETIC'
  | 'ALLERGY' | 'HYPERTENSION' | 'OTHER';

export type MakeupStatus = 'NONE' | 'PENDING' | 'COMPLETED' | 'WAIVED';
export type SummonsTrigger = 'CONSECUTIVE_ABSENCES' | 'CUMULATIVE_ABSENCES' | 'MANUAL';
export type SummonsStatus = 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
export type RollCallSlot = 'SLOT_2' | 'SLOT_5' | 'SLOT_8';
export type DMRollCallStatus = 'PRESENT' | 'LATE' | 'ABSENT';
export type WarningReason = 'CUMULATIVE_ABSENCES' | 'CHRONIC_LATENESS' | 'MISCONDUCT' | 'OTHER';

export const HEALTH_CONDITIONS: { value: HealthCondition; label: string }[] = [
  { value: 'SICKLE_CELL', label: 'Sickle Cell' },
  { value: 'ASTHMATIC', label: 'Asthmatic' },
  { value: 'EPILEPTIC', label: 'Epileptic' },
  { value: 'DIABETIC', label: 'Diabetic' },
  { value: 'ALLERGY', label: 'Allergy' },
  { value: 'HYPERTENSION', label: 'Hypertension' },
  { value: 'OTHER', label: 'Other' },
];

export const WARNING_REASONS: { value: WarningReason; label: string }[] = [
  { value: 'CUMULATIVE_ABSENCES', label: 'Cumulative Absences' },
  { value: 'CHRONIC_LATENESS', label: 'Chronic Lateness' },
  { value: 'MISCONDUCT', label: 'Misconduct' },
  { value: 'OTHER', label: 'Other' },
];

export const SUMMONS_STATUSES: SummonsStatus[] = ['PENDING', 'SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED'];
export const MAKEUP_STATUSES: MakeupStatus[] = ['NONE', 'PENDING', 'COMPLETED', 'WAIVED'];
export const ROLL_CALL_SLOTS: { value: RollCallSlot; label: string }[] = [
  { value: 'SLOT_2', label: 'Slot 2 (Morning)' },
  { value: 'SLOT_5', label: 'Slot 5 (Midday)' },
  { value: 'SLOT_8', label: 'Slot 8 (Afternoon)' },
];

export const enumLabel = (v: string | null | undefined): string =>
  (v || '').split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');

// --- Types ---

export interface PreviousSchool {
  id: number;
  schoolName: string;
  fromYear?: string | null;
  toYear?: string | null;
  notes?: string | null;
}

export interface SiblingInfo {
  student: { id: number; matricule?: string; name: string; gender?: string };
  currentEnrollment: {
    id: number;
    academicYearId: number;
    subClass?: { id: number; name: string; class?: { id: number; name: string } };
  } | null;
  sharedParents: Array<{
    parent: { id: number; name: string; email?: string; phone?: string };
    siblingRelationship?: string;
    targetRelationship?: string;
  }>;
}

export interface DisciplineWarning {
  id: number;
  enrollmentId: number;
  warningLevel: number;
  reason: WarningReason;
  description: string;
  triggerAbsenceCount?: number | null;
  resolved: boolean;
  resolvedNotes?: string | null;
  issuedBy?: { id: number; name: string } | null;
  enrollment?: {
    student?: { id: number; matricule?: string; name: string };
    subClass?: { id: number; name?: string; class?: { id: number; name: string } };
  };
  createdAt?: string;
}

export interface ParentSummons {
  id: number;
  enrollmentId: number;
  parent?: { id: number; name: string; phone?: string } | null;
  reason: string;
  triggerType: SummonsTrigger;
  triggerAbsenceIds?: number[];
  status: SummonsStatus;
  scheduledDate?: string | null;
  meetingNotes?: string | null;
  attended?: boolean | null;
  createdBy?: { id: number; name: string } | null;
  enrollment?: {
    student?: { id: number; matricule?: string; name: string };
    subClass?: { id?: number; name?: string; class?: { name: string } };
  };
  createdAt?: string;
}

export interface DmSlotStatus {
  status: 'recorded' | 'missing';
  id?: number;
  entryCount?: number;
  recordedAt?: string;
  recordedBy?: { id: number; name: string };
}

export interface DmRollCallStatusData {
  subClassId: number;
  academicYearId: number;
  date: string;
  slots: Record<RollCallSlot, DmSlotStatus>;
}

export interface DmRosterEntry {
  enrollmentId: number;
  student: { id: number; matricule?: string; name: string; gender?: string };
  status: DMRollCallStatus | null;
  entry: { id: number; status: DMRollCallStatus; linkedAbsenceId?: number | null } | null;
}

export interface DmRollCallData {
  subClassId: number;
  date: string;
  slot: RollCallSlot;
  rollCall: { id: number; recordedBy?: { id: number; name: string }; createdAt?: string; updatedAt?: string } | null;
  roster: DmRosterEntry[];
}

export interface DmRollCallTrigger {
  enrollmentId: number;
  warnings: DisciplineWarning[];
  summons: ParentSummons[];
}

export interface ExcuseResult {
  absence: { id: number; isExcused: boolean; excusedAt?: string; excuseReason?: string };
  revertedWarnings: number;
  cancelledSummons: number;
}

// --- Student profile sub-resources ---

export const getSiblings = async (studentId: number | string): Promise<SiblingInfo[]> => {
  const res = await apiService.get<{ data: SiblingInfo[] }>(`/students/${studentId}/siblings`);
  return res.data || [];
};

export const getPreviousSchools = async (studentId: number | string): Promise<PreviousSchool[]> => {
  const res = await apiService.get<{ data: PreviousSchool[] }>(`/students/${studentId}/previous-schools`);
  return res.data || [];
};

export const addPreviousSchool = async (
  studentId: number | string,
  body: { schoolName: string; fromYear?: string; toYear?: string; notes?: string }
): Promise<PreviousSchool> => {
  const res = await apiService.post<{ data: PreviousSchool }>(`/students/${studentId}/previous-schools`, body);
  return res.data;
};

export const updatePreviousSchool = async (
  studentId: number | string,
  psId: number | string,
  body: { schoolName: string; fromYear?: string; toYear?: string; notes?: string }
): Promise<PreviousSchool> => {
  const res = await apiService.put<{ data: PreviousSchool }>(`/students/${studentId}/previous-schools/${psId}`, body);
  return res.data;
};

export const deletePreviousSchool = async (studentId: number | string, psId: number | string): Promise<void> => {
  await apiService.delete(`/students/${studentId}/previous-schools/${psId}`);
};

// --- Absence excuse / makeup ---

export const excuseAbsence = async (
  absenceId: number | string,
  body: { excusedByParentId?: number; excuseReason?: string }
): Promise<ExcuseResult> => {
  const res = await apiService.post<{ data: ExcuseResult }>(`/discipline/absences/${absenceId}/excuse`, body);
  return res.data;
};

export const markMakeup = async (
  absenceId: number | string,
  body: { status: MakeupStatus; makeupNotes?: string }
): Promise<any> => {
  const res = await apiService.post<{ data: any }>(`/discipline/absences/${absenceId}/makeup`, body);
  return res.data;
};

// --- Warnings ---

export const listWarnings = async (filters: {
  subClassId?: number | string;
  studentId?: number | string;
  academicYearId?: number | string;
  resolved?: boolean;
} = {}): Promise<DisciplineWarning[]> => {
  const params = new URLSearchParams();
  if (filters.subClassId) params.set('subClassId', String(filters.subClassId));
  if (filters.studentId) params.set('studentId', String(filters.studentId));
  if (filters.academicYearId) params.set('academicYearId', String(filters.academicYearId));
  if (filters.resolved !== undefined) params.set('resolved', String(filters.resolved));
  const qs = params.toString();
  const res = await apiService.get<{ data: DisciplineWarning[] }>(`/discipline/warnings${qs ? `?${qs}` : ''}`);
  return res.data || [];
};

export const createWarning = async (body: {
  enrollmentId: number;
  warningLevel?: number;
  reason: WarningReason;
  description: string;
}): Promise<DisciplineWarning> => {
  const res = await apiService.post<{ data: DisciplineWarning }>('/discipline/warnings', body);
  return res.data;
};

export const resolveWarning = async (warningId: number | string, resolvedNotes?: string): Promise<DisciplineWarning> => {
  const res = await apiService.patch<{ data: DisciplineWarning }>(`/discipline/warnings/${warningId}/resolve`, {
    resolvedNotes: resolvedNotes || undefined,
  });
  return res.data;
};

// --- Parent summons ---

export const listSummons = async (filters: {
  status?: SummonsStatus;
  studentId?: number | string;
  subClassId?: number | string;
  academicYearId?: number | string;
} = {}): Promise<ParentSummons[]> => {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.studentId) params.set('studentId', String(filters.studentId));
  if (filters.subClassId) params.set('subClassId', String(filters.subClassId));
  if (filters.academicYearId) params.set('academicYearId', String(filters.academicYearId));
  const qs = params.toString();
  const res = await apiService.get<{ data: ParentSummons[] }>(`/discipline/summons${qs ? `?${qs}` : ''}`);
  return res.data || [];
};

export const createSummons = async (body: {
  enrollmentId: number;
  parentId?: number;
  reason: string;
  scheduledDate?: string;
}): Promise<ParentSummons> => {
  const res = await apiService.post<{ data: ParentSummons }>('/discipline/summons', body);
  return res.data;
};

export const updateSummons = async (
  summonsId: number | string,
  body: {
    status?: SummonsStatus;
    scheduledDate?: string | null;
    meetingNotes?: string;
    attended?: boolean;
    parentId?: number | null;
  }
): Promise<ParentSummons> => {
  const res = await apiService.put<{ data: ParentSummons }>(`/discipline/summons/${summonsId}`, body);
  return res.data;
};

// --- DM slot roll call ---

export const getDmRollCallStatus = async (subClassId: number | string, date: string): Promise<DmRollCallStatusData> => {
  const res = await apiService.get<{ data: DmRollCallStatusData }>(
    `/discipline/dm-roll-call/status?subClassId=${subClassId}&date=${date}`
  );
  return res.data;
};

export const getDmRollCall = async (
  subClassId: number | string,
  date: string,
  slot: RollCallSlot
): Promise<DmRollCallData> => {
  const res = await apiService.get<{ data: DmRollCallData }>(
    `/discipline/dm-roll-call?subClassId=${subClassId}&date=${date}&slot=${slot}`
  );
  return res.data;
};

export const recordDmRollCall = async (body: {
  subClassId: number;
  date: string;
  slot: RollCallSlot;
  entries: Array<{ enrollmentId: number; status: DMRollCallStatus }>;
}): Promise<{ rollCall: any; triggers: DmRollCallTrigger[] }> => {
  const res = await apiService.post<{ data: { rollCall: any; triggers: DmRollCallTrigger[] } }>(
    '/discipline/dm-roll-call',
    body
  );
  return res.data;
};
