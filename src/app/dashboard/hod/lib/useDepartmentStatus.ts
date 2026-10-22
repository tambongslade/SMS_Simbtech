'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiService } from '@/lib/apiService';
import { useAuth } from '@/components/context/AuthContext';

// GET /hod/department-status — everything the HOD's Period Tracking,
// Curriculum and Performance pages show, scoped to the HOD's department
// (the subjects they head).

export interface DeptTeacherRow {
  id: number;
  name: string;
  matricule: string | null;
  subjects: string[];
  subClassCount: number;
  departmentPeriodsPerWeek: number;
  totalPeriodsPerWeek: number;
  totalHoursPerWeek: number;
  logbookEntriesLast7Days: number;
  logbookEntriesThisYear: number;
  lastLogbookDate: string | null;
  logbookRateLast7Days: number | null;
}

export interface DeptCoverageRow {
  subjectId: number;
  subjectName: string;
  classId: number;
  className: string;
  schemeId: number | null;
  totalLessons: number;
  completedLessons: number;
  coveragePercent: number;
  teachers: string[];
}

export interface DeptMarksRow {
  subClassSubjectId: number;
  subjectId: number;
  subjectName: string;
  subClassId: number;
  subClassName: string;
  className: string;
  teachers: string[];
  students: number;
  marksEntered: number;
  percentEntered: number;
}

export interface DepartmentStatus {
  academicYear: { id: number; name: string } | null;
  subjects: { id: number; name: string }[];
  teachers: DeptTeacherRow[];
  schemeCoverage: DeptCoverageRow[];
  marksStatus: {
    sequence: {
      id: number;
      sequenceNumber: number;
      status: string;
      submissionDeadline: string | null;
      term: { id: number; name: string } | null;
    } | null;
    rows: DeptMarksRow[];
  };
}

export function useDepartmentStatus() {
  const { selectedAcademicYear, currentAcademicYear } = useAuth();
  const yearId = (selectedAcademicYear ?? currentAcademicYear)?.id;
  const [data, setData] = useState<DepartmentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = yearId ? `?academicYearId=${yearId}` : '';
      const res = await apiService.get<{ data: DepartmentStatus }>(`/hod/department-status${qs}`);
      setData(res.data ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load department data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [yearId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export const pctColor = (p: number) =>
  p >= 75 ? 'bg-green-100 text-green-800' : p >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
