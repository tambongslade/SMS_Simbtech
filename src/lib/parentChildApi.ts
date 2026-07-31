// Parent portal: child lookup by matricule — combined snapshot, report card
// listing and PDF download. Public per-matricule endpoints (no JWT);
// camelCase on the wire.

import apiService from './apiService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

export interface ChildSnapshot {
  student: {
    id: number;
    matricule: string;
    name: string;
    dateOfBirth?: string | null;
    gender?: string | null;
    status?: string;
    healthConditions?: string[];
    medicalNotes?: string | null;
  };
  enrollment?: {
    academicYearId: number;
    academicYearName?: string;
    className?: string;
    subclassId?: number;
    subclassName?: string;
    classMaster?: string | null;
  } | null;
  academic?: {
    hasEnrollment: boolean;
    totalAssessments: number;
    overallAverage: number | null;
    sequences?: Array<{
      examSequenceId: number;
      sequenceNumber: number;
      termName?: string;
      termId?: number;
      average: number | null;
      subjects: Array<{
        subjectId: number;
        subjectName: string;
        category?: string;
        coefficient?: number;
        teacher?: string;
        score: number | null;
        recordedAt?: string;
      }>;
    }>;
    sequenceAverages?: Array<{
      examSequenceId: number;
      sequenceNumber: number;
      termName?: string;
      average: number | null;
      rank?: number | null;
      totalStudents?: number | null;
      decision?: string | null;
    }>;
  };
  discipline?: {
    totalIssues: number;
    issues: Array<{
      id: number;
      issueType: string;
      description?: string;
      notes?: string | null;
      actionTaken?: string | null;
      assignedBy?: string | null;
      createdAt?: string;
    }>;
  };
  health?: {
    healthConditions?: string[];
    medicalNotes?: string | null;
    totalVisits: number;
    recentVisits: Array<{
      id: number;
      visitDate: string;
      reason: string;
      treatmentGiven?: string | null;
      medicationGiven?: string | null;
      notes?: string | null;
      sentHome?: boolean;
      loggedBy?: string | null;
    }>;
  };
}

export interface ChildReportCard {
  id: number;
  examSequenceId: number;
  sequenceNumber: number;
  termName?: string;
  academicYearId: number;
  academicYearName?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;
  generatedAt?: string | null;
  errorMessage?: string | null;
}

export const getChildSnapshot = async (matricule: string, academicYearId?: number): Promise<ChildSnapshot> => {
  const qs = academicYearId ? `?academicYearId=${academicYearId}` : '';
  const res = await apiService.get<{ data: ChildSnapshot }>(
    `/parents/${encodeURIComponent(matricule)}/overview${qs}`
  );
  return res.data;
};

export const listChildReportCards = async (
  matricule: string,
  academicYearId?: number
): Promise<{ student: { id: number; matricule: string; name: string }; reports: ChildReportCard[] }> => {
  const qs = academicYearId ? `?academicYearId=${academicYearId}` : '';
  const res = await apiService.get<{ data: any }>(
    `/parents/${encodeURIComponent(matricule)}/report-cards${qs}`
  );
  return { student: res.data?.student, reports: res.data?.reports || [] };
};

export type ReportDownloadResult =
  | { kind: 'downloaded' }
  | { kind: 'processing'; message?: string }
  | { kind: 'fee-blocked'; message?: string; shortfall?: number }
  | { kind: 'error'; message: string };

// Download streams a PDF on 200; 202 = still generating; 403 = fee gate.
// Uses raw fetch so we can branch on status code and content type.
export const downloadChildReportCard = async (
  matricule: string,
  academicYearId: number,
  examSequenceId: number
): Promise<ReportDownloadResult> => {
  const url = `${API_BASE_URL}/parents/${encodeURIComponent(matricule)}/report-card?academicYearId=${academicYearId}&examSequenceId=${examSequenceId}`;
  const res = await fetch(url); // public endpoint — no auth header

  if (res.status === 202) {
    const j = await res.json().catch(() => ({}));
    return { kind: 'processing', message: j.message };
  }
  if (res.status === 403) {
    const j = await res.json().catch(() => ({}));
    return {
      kind: 'fee-blocked',
      message: j.error || j.message,
      shortfall: j.feeStatus?.shortfall,
    };
  }
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    return { kind: 'error', message: j.error || j.message || `Download failed (${res.status})` };
  }

  const blob = await res.blob();
  const dispo = res.headers.get('Content-Disposition') || '';
  const nameMatch = dispo.match(/filename="?([^";]+)"?/);
  const filename = nameMatch?.[1] || `report-${matricule}-seq-${examSequenceId}.pdf`;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
  return { kind: 'downloaded' };
};
