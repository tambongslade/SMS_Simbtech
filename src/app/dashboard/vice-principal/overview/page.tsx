'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Card, CardBody, CardHeader, StatsCard, Badge } from '@/components/ui';
import {
  AcademicCapIcon,
  UsersIcon,
  BuildingOffice2Icon,
  BookOpenIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';
import { toast } from 'react-hot-toast';
import TasksNotificationsSection from '@/components/dashboard/TasksNotificationsSection';

interface VicePrincipalDashboardData {
  totalStudents: number;
  studentsAssigned: number;
  pendingInterviews: number;
  completedInterviews: number;
  awaitingAssignment: number;
  recentDisciplineIssues: number;
  classesWithPendingReports: number;
  teacherAbsences: number;
  subclassCapacityUtilization: Array<{
    subclassName: string;
    className: string;
    currentCapacity: number;
    maxCapacity: number;
    utilizationRate: number;
  }>;
  urgentTasks: Array<{
    type: string;
    description: string;
    timestamp: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
}

const fetcher = (url: string) => apiService.get(url);

const formatLabel = (value: string) =>
  value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const priorityColor = (priority: string): 'red' | 'yellow' | 'gray' => {
  if (priority === 'HIGH' || priority === 'URGENT') return 'red';
  if (priority === 'MEDIUM') return 'yellow';
  return 'gray';
};

export default function VicePrincipalDashboard() {
  const { selectedAcademicYear } = useAuth();
  const yearParam = selectedAcademicYear?.id ? `?academicYearId=${selectedAcademicYear.id}` : '';

  const { data: dashboardRes, error: dashboardError, isLoading } = useSWR<{ data?: VicePrincipalDashboardData }>(
    `/vice-principal/dashboard${yearParam}`,
    fetcher
  );
  const dashboardData = dashboardRes?.data;

  useEffect(() => {
    if (dashboardError && dashboardError.message !== 'Unauthorized') {
      console.error('Error fetching vice principal dashboard:', dashboardError);
      toast.error('Failed to load dashboard data');
    }
  }, [dashboardError]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Students', value: dashboardData?.totalStudents, icon: AcademicCapIcon, color: 'primary' as const, href: '/dashboard/vice-principal/students' },
    { title: 'Assigned Students', value: dashboardData?.studentsAssigned, icon: UserGroupIcon, color: 'success' as const, href: '/dashboard/vice-principal/students' },
    { title: 'Pending Interviews', value: dashboardData?.pendingInterviews, icon: UsersIcon, color: 'warning' as const, href: '/dashboard/vice-principal/interviews' },
    { title: 'Completed Interviews', value: dashboardData?.completedInterviews, icon: BookOpenIcon, color: 'secondary' as const, href: '/dashboard/vice-principal/interviews' },
    { title: 'Recent Discipline Issues', value: dashboardData?.recentDisciplineIssues, icon: ExclamationTriangleIcon, color: 'danger' as const, href: '/dashboard/vice-principal/disciplinary-actions' },
    { title: 'Classes w/ Pending Reports', value: dashboardData?.classesWithPendingReports, icon: BookOpenIcon, color: 'warning' as const, href: '/dashboard/vice-principal/report-card-management' },
    { title: 'Teacher Absences', value: dashboardData?.teacherAbsences, icon: ClockIcon, color: 'danger' as const, href: '/dashboard/vice-principal/teacher-attendance' },
    { title: 'Awaiting Assignment', value: dashboardData?.awaitingAssignment, icon: UsersIcon, color: 'neutral' as const, href: '/dashboard/vice-principal/interviews' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Vice Principal Dashboard</h1>
        <div className="text-sm text-gray-500">
          Academic Year: {selectedAcademicYear?.name || 'Current'}
        </div>
      </div>

      {/* Stats — every card navigates to its page */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {statCards.map(({ href, ...stat }) => (
          <Link key={stat.title} href={href} className="block min-w-0 rounded-lg transition-all duration-150 hover:shadow-md hover:-translate-y-0.5">
            <StatsCard
              title={stat.title}
              value={stat.value?.toString() || '0'}
              icon={stat.icon}
              color={stat.color}
            />
          </Link>
        ))}
      </div>

      <TasksNotificationsSection />

      {/* Subclass Capacity Utilization (real data) */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium text-gray-900">Subclass Capacity Utilization</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {(dashboardData?.subclassCapacityUtilization ?? []).slice(0, 8).map((subclass, index) => {
              const rate = Math.min(100, Math.max(0, subclass.utilizationRate));
              return (
                <div key={index}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{subclass.className} - {subclass.subclassName}</p>
                    <p className="text-xs text-gray-500 shrink-0">
                      {subclass.currentCapacity} / {subclass.maxCapacity} · {rate.toFixed(0)}%
                    </p>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                    <div
                      className={`h-2 rounded-full ${rate > 95 ? 'bg-red-500' : rate > 80 ? 'bg-yellow-500' : 'bg-blue-600'}`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(dashboardData?.subclassCapacityUtilization?.length || 0) > 8 && (
              <p className="text-sm text-gray-500 text-center">
                … and {(dashboardData?.subclassCapacityUtilization?.length || 0) - 8} more subclasses
              </p>
            )}
            {(!dashboardData?.subclassCapacityUtilization || dashboardData.subclassCapacityUtilization.length === 0) && (
              <p className="text-gray-500 text-center py-4">No subclass capacity data available</p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Urgent items from the VP dashboard endpoint */}
      {(dashboardData?.urgentTasks?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Urgent Items</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {dashboardData!.urgentTasks.slice(0, 8).map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${activity.priority === 'HIGH' ? 'bg-red-500' :
                    activity.priority === 'MEDIUM' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge color={priorityColor(activity.priority)} size="sm">{activity.priority}</Badge>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Link href="/dashboard/vice-principal/classes" className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors block">
              <BuildingOffice2Icon className="w-8 h-8 text-blue-600 mb-2" />
              <h4 className="font-medium text-gray-900">My Classes</h4>
              <p className="text-sm text-gray-600">Manage assigned subclasses</p>
            </Link>
            <Link href="/dashboard/vice-principal/teachers" className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors block">
              <UsersIcon className="w-8 h-8 text-green-600 mb-2" />
              <h4 className="font-medium text-gray-900">Teachers</h4>
              <p className="text-sm text-gray-600">Manage teacher assignments</p>
            </Link>
            <Link href="/dashboard/vice-principal/report-card-management" className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors block">
              <BookOpenIcon className="w-8 h-8 text-purple-600 mb-2" />
              <h4 className="font-medium text-gray-900">Report Cards</h4>
              <p className="text-sm text-gray-600">Generate class report cards</p>
            </Link>
            <Link href="/dashboard/vice-principal/timetable" className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-left transition-colors block">
              <ChartBarIcon className="w-8 h-8 text-orange-600 mb-2" />
              <h4 className="font-medium text-gray-900">Timetable</h4>
              <p className="text-sm text-gray-600">View school timetable</p>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
