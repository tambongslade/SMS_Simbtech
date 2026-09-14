// Parent portal: child lookup by matricule — combined snapshot, report card
// listing and PDF download. Public per-matricule endpoints (no JWT);
// camelCase on the wire.

import apiService from './apiService';
import { saveBlob } from '@/lib/downloadFile';

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

// Analytics — full performance/attendance/quiz/comparative bundle for one child.
export interface ChildAnalytics {
  studentInfo?: { id: number; name: string; classInfo?: { className?: string; subclassName?: string } | null };
  performanceAnalytics: {
    overall_average: number | string;
    total_assessments: number;
    improvement_trend: string;
    performance_grade: string;
    strengths?: Array<{ subject: string; average: string }>;
    areas_for_improvement?: Array<{ subject: string; average: string; recommendation?: string }>;
    subject_breakdown?: Array<{ subject: string; average: number }>;
  };
  attendanceAnalytics: {
    overall_attendance_rate: number | string;
    total_absences: number;
    class_absences?: number;
    morning_lateness?: number;
    excused_count?: number;
    unexcused_count?: number;
    at_risk?: boolean;
    monthly_trends?: Array<{ month: string; attendance_rate: string; absences: number }>;
    attendance_status?: string;
    recent_absences?: Array<{ id: number; date: string; type: string; is_excused?: boolean }>;
  };
  quizAnalytics: {
    total_quizzes: number;
    average_score: number | string;
    improvement_trend: string;
    subject_performance?: Array<{ subject: string; average: string; quiz_count: number; best_score: string; latest_score: string }>;
    recent_quizzes?: Array<{ quiz_title: string; subject: string; score?: string; date?: string }>;
  };
  subjectTrends?: any[];
  comparativeAnalytics?: any;
}

export const getChildAnalytics = async (matricule: string, academicYearId?: number): Promise<ChildAnalytics> => {
  const qs = academicYearId ? `?academicYearId=${academicYearId}` : '';
  const res = await apiService.get<{ data: ChildAnalytics }>(
    `/parents/${encodeURIComponent(matricule)}/analytics${qs}`
  );
  return res.data;
};

export interface ChildDashboard {
  id: number;
  name: string;
  matricule?: string;
  className?: string;
  subclassName?: string;
  enrollmentStatus: string;
  photo?: string;
  attendanceRate: number;
  latestMarks: Array<{ subjectName: string; latestMark: number; sequence: string; date: string }>;
  pendingFees: number;
  disciplineIssues: number;
  recentAbsences: number;
  fees?: { totalExpected: number; totalPaid: number; outstanding: number };
}

export const getChildDashboard = async (matricule: string, academicYearId?: number): Promise<ChildDashboard> => {
  const qs = academicYearId ? `?academicYearId=${academicYearId}` : '';
  const res = await apiService.get<{ data: any }>(
    `/parents/${encodeURIComponent(matricule)}/dashboard${qs}`
  );
  const d = res.data ?? {};
  return {
    id: d.id,
    name: d.name,
    matricule: d.matricule,
    className: d.className,
    subclassName: d.subclassName,
    enrollmentStatus: d.enrollmentStatus,
    photo: d.photo,
    attendanceRate: d.attendanceRate ?? 0,
    latestMarks: d.latestMarks ?? [],
    pendingFees: d.pendingFees ?? 0,
    disciplineIssues: d.disciplineIssues ?? 0,
    recentAbsences: d.recentAbsences ?? 0,
    fees: d.fees,
  };
};

export interface ChildDetailsFull {
  id: number;
  name: string;
  matricule: string;
  dateOfBirth?: string;
  classInfo?: { className: string; subclassName: string; classMaster?: string };
  attendance: { presentDays: number; absentDays: number; lateDays: number; attendanceRate: number };
  academicPerformance: {
    subjects: Array<{ subjectName: string; teacherName: string; average: number; marks: Array<{ sequence: string; mark: number; total: number; date: string }> }>;
    overallAverage: number;
    positionInClass?: number;
  };
  fees: {
    totalExpected: number;
    totalPaid: number;
    outstandingBalance: number;
    dueDate?: string | null;
    daysOverdue?: number;
    urgency?: 'PAID' | 'OK' | 'DUE_SOON' | 'OVERDUE';
    lastPaymentDate?: string;
    paymentHistory: Array<{ id: number; amount: number; paymentDate: string; paymentMethod: string; receiptNumber?: string; recordedBy: string }>;
    items?: Array<{ id: number; name: string; amountExpected: number; amountPaid: number; outstanding: number; status: string }>;
  };
  discipline: { totalIssues: number; recentIssues: Array<{ id: number; type: string; description: string; dateOccurred: string; status: string; resolvedAt?: string }> };
  reports: { availableReports: Array<{ id: number; sequenceName: string; academicYear: string; generatedAt: string; downloadUrl: string }> };
}

export const getChildDetailsByMatricule = async (matricule: string, academicYearId?: number): Promise<ChildDetailsFull> => {
  const qs = academicYearId ? `?academicYearId=${academicYearId}` : '';
  const res = await apiService.get<{ data: ChildDetailsFull }>(
    `/parents/${encodeURIComponent(matricule)}/details${qs}`
  );
  return res.data;
};

export interface ChildQuiz {
  submissionId: number;
  quizTitle: string;
  subject: string;
  score: number | null;
  totalMarks: number | null;
  percentage: number | null;
  status: string;
  submittedAt: string;
}

export const getChildQuizzes = async (matricule: string, academicYearId?: number): Promise<ChildQuiz[]> => {
  const qs = academicYearId ? `?academicYearId=${academicYearId}` : '';
  const res = await apiService.get<{ data: ChildQuiz[] }>(
    `/parents/${encodeURIComponent(matricule)}/quiz-results${qs}`
  );
  return res.data ?? [];
};

export interface ChildDisciplineBundle {
  warnings: any[];
  summons: any[];
  actions: any[];
  saturdayPunishments: any[];
}

// Fan out to the four discipline endpoints; each is separately paginated on
// the backend but the parent-side view expects a single combined section.
export const getChildDisciplineBundle = async (matricule: string, academicYearId?: number): Promise<ChildDisciplineBundle> => {
  const qs = academicYearId ? `?academicYearId=${academicYearId}` : '';
  const [warnings, summons, actions, saturdays] = await Promise.all([
    apiService.get<{ data: any }>(`/parents/${encodeURIComponent(matricule)}/warnings${qs}`).catch(() => ({ data: [] })),
    apiService.get<{ data: any }>(`/parents/${encodeURIComponent(matricule)}/summons${qs}`).catch(() => ({ data: [] })),
    apiService.get<{ data: any }>(`/parents/${encodeURIComponent(matricule)}/disciplinary-actions${qs}`).catch(() => ({ data: [] })),
    apiService.get<{ data: any }>(`/parents/${encodeURIComponent(matricule)}/saturday-punishments${qs}`).catch(() => ({ data: [] })),
  ]);
  const asArray = (d: any): any[] => Array.isArray(d) ? d : (Array.isArray(d?.items) ? d.items : []);
  return {
    warnings: asArray(warnings.data),
    summons: asArray(summons.data),
    actions: asArray(actions.data),
    saturdayPunishments: asArray(saturdays.data),
  };
};

export const getChildUnreadCount = async (matricule: string): Promise<number> => {
  try {
    const res = await apiService.get<{ data: { count?: number; unreadCount?: number } | number }>(
      `/parents/${encodeURIComponent(matricule)}/notifications/unread-count`,
      { silent: true } as any
    );
    const d: any = res.data;
    if (typeof d === 'number') return d;
    return d?.count ?? d?.unreadCount ?? 0;
  } catch {
    return 0;
  }
};

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
  saveBlob(blob, filename);
  return { kind: 'downloaded' };
};
