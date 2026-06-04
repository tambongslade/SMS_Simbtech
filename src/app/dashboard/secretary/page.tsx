'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  UserGroupIcon,
  AcademicCapIcon,
  BuildingLibraryIcon,
  DocumentChartBarIcon,
  UserPlusIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { StatsCard } from '@/components/ui';
import { fetchStudents, fetchTeachers, fetchClasses } from './lib/secretaryApi';

export default function SecretaryDashboard() {
  const { selectedAcademicYear, user } = useAuth();
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

  const quickActions = [
    {
      label: 'Register a Student',
      description: 'Create a new student record and parent account',
      href: '/dashboard/secretary/students',
      icon: UserPlusIcon,
    },
    {
      label: 'Add a Teacher',
      description: 'Create a new teacher account',
      href: '/dashboard/secretary/teachers',
      icon: AcademicCapIcon,
    },
    {
      label: 'Export Class Lists',
      description: 'Download class and subclass student lists',
      href: '/dashboard/secretary/class-lists',
      icon: DocumentChartBarIcon,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="text-gray-600 mt-1">
          Secretary dashboard
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

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:border-blue-400 hover:shadow transition-all"
            >
              <div className="flex items-start justify-between">
                <action.icon className="h-8 w-8 text-blue-600" />
                <ArrowRightIcon className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </div>
              <h3 className="mt-4 font-medium text-gray-900">{action.label}</h3>
              <p className="text-sm text-gray-600 mt-1">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
