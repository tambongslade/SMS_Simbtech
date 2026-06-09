'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  UserGroupIcon,
  AcademicCapIcon,
  BuildingLibraryIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { StatsCard } from '@/components/ui';
import { fetchStudents, fetchTeachers, fetchClasses } from '../lib/secretaryApi';

export default function SecretaryOverviewPage() {
  const { selectedAcademicYear } = useAuth();
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const academicYearId = selectedAcademicYear?.id;
      const [studentsRes, teachersRes, classes] = await Promise.all([
        fetchStudents({ academicYearId, limit: 1 }).catch(() => ({ data: [], meta: { total: 0 } })),
        fetchTeachers({ academicYearId, limit: 1 }).catch(() => ({ data: [], meta: { total: 0 } })),
        fetchClasses().catch(() => []),
      ]);
      setStats({
        students: studentsRes.meta?.total ?? studentsRes.data.length,
        teachers: teachersRes.meta?.total ?? teachersRes.data.length,
        classes: classes.length,
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedAcademicYear?.id]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div>
        <Link
          href="/dashboard/secretary"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" />
          Back to menu
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          Totals at a glance
          {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Students"
          value={isLoading ? '—' : String(stats.students)}
          icon={UserGroupIcon}
          color="primary"
        />
        <StatsCard
          title="Teachers"
          value={isLoading ? '—' : String(stats.teachers)}
          icon={AcademicCapIcon}
          color="success"
        />
        <StatsCard
          title="Classes"
          value={isLoading ? '—' : String(stats.classes)}
          icon={BuildingLibraryIcon}
          color="secondary"
        />
      </div>
    </div>
  );
}
