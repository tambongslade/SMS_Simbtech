// API client for nurse visits and student health profiles (/nurse).
// camelCase on the wire.

import apiService from './apiService';
import type { HealthCondition } from './disciplineExtApi';

export interface HealthProfile {
  student: {
    id: number;
    matricule?: string;
    name: string;
    dateOfBirth?: string | null;
    gender?: string | null;
    healthConditions: HealthCondition[];
    medicalNotes?: string | null;
  };
  enrollment?: {
    id: number;
    academicYear?: { id: number; name: string };
    class?: { id: number; name: string };
    subClass?: { id: number; name: string };
  } | null;
  recentVisits: NurseVisit[];
}

export interface NurseVisit {
  id: number;
  enrollmentId?: number;
  reason: string;
  visitDate: string;
  treatmentGiven?: string | null;
  medicationGiven?: string | null;
  notes?: string | null;
  sentHome?: boolean;
  period?: { id: number; name?: string; startTime?: string; endTime?: string } | null;
  loggedBy?: { id: number; name: string } | null;
  enrollment?: {
    id: number;
    student?: { id: number; matricule?: string; name: string };
    subClass?: { id: number; name: string; class?: { id: number; name: string } };
  };
  createdAt?: string;
}

export interface Paginated<T> {
  data: T[];
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
}

export const getHealthProfile = async (studentId: number, academicYearId?: number): Promise<HealthProfile> => {
  const qs = academicYearId ? `?academicYearId=${academicYearId}` : '';
  const res = await apiService.get<{ data: any }>(`/nurse/students/${studentId}/health-profile${qs}`);
  const d = res.data || {};
  return {
    student: { healthConditions: [], ...d.student },
    enrollment: d.enrollment ?? null,
    recentVisits: d.recentVisits || [],
  };
};

export const createNurseVisit = async (body: {
  studentId: number;
  reason: string;
  academicYearId?: number;
  periodId?: number;
  visitDate?: string;
  treatmentGiven?: string;
  medicationGiven?: string;
  notes?: string;
  sentHome?: boolean;
}): Promise<NurseVisit> => {
  const res = await apiService.post<{ data: NurseVisit }>('/nurse/visits', body);
  return res.data;
};

export const listNurseVisits = async (params: {
  studentId?: number;
  enrollmentId?: number;
  from?: string;
  to?: string;
  academicYearId?: number;
  page?: number;
  limit?: number;
} = {}): Promise<Paginated<NurseVisit>> => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
  });
  const res = await apiService.get<Paginated<NurseVisit>>(`/nurse/visits?${qs.toString()}`);
  return { data: res.data || [], meta: res.meta };
};

export const getNurseVisit = async (id: number): Promise<NurseVisit> => {
  const res = await apiService.get<{ data: NurseVisit }>(`/nurse/visits/${id}`);
  return res.data;
};

export const updateNurseVisit = async (
  id: number,
  body: Partial<{
    reason: string;
    periodId: number | null;
    visitDate: string;
    treatmentGiven: string;
    medicationGiven: string;
    notes: string;
    sentHome: boolean;
  }>
): Promise<NurseVisit> => {
  const res = await apiService.put<{ data: NurseVisit }>(`/nurse/visits/${id}`, body);
  return res.data;
};

export const deleteNurseVisit = async (id: number): Promise<void> => {
  await apiService.delete(`/nurse/visits/${id}`);
};

export const NURSE_LOG_ROLES = ['NURSE', 'PRINCIPAL', 'MANAGER', 'SUPER_MANAGER'];
export const NURSE_DELETE_ROLES = ['SUPER_MANAGER', 'MANAGER', 'PRINCIPAL'];
