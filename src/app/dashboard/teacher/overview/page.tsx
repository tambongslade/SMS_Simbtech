'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, StatsCard } from '@/components/ui';
import {
  BookOpenIcon,
  AcademicCapIcon,
  ClockIcon,
  ChartBarIcon,
  UserGroupIcon,
  CalendarIcon,
  DocumentTextIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';
import { toast } from 'react-hot-toast';

interface TeacherDashboardData {
  assignedSubjects: number;
  totalStudents: number;
  marksToEnter: number;
  totalClasses: number;
  upcomingPeriods: number;
  weeklyPeriods: number;
  attendanceRate?: number;
  totalHoursPerWeek?: number;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  category: string;
  coefficient: number;
  subclasses: Array<{
    id: number;
    name: string;
    className: string;
    studentCount: number;
  }>;
}

interface CurrentAndNext {
  current: {
    period: {
      id: number;
      name: string;
      startTime: string;
      endTime: string;
      dayOfWeek: string;
    };
    subject: {
      id: number;
      name: string;
      category: string;
    };
    subClass: {
      id: number;
      name: string;
      className: string;
    };
    isActive: boolean;
    minutesRemaining: number;
  } | null;
  next: {
    period: {
      id: number;
      name: string;
      startTime: string;
      endTime: string;
      dayOfWeek: string;
    };
    subject: {
      id: number;
      name: string;
      category: string;
    };
    subClass: {
      id: number;
      name: string;
      className: string;
    };
    minutesToStart: number;
    isToday: boolean;
  } | null;
  requestTime: string;
  currentDay: string;
}

export default function TeacherDashboard() {
  const { selectedAcademicYear } = useAuth();
  const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentAndNext, setCurrentAndNext] = useState<CurrentAndNext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTimetable, setIsLoadingTimetable] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchSubjects();
    fetchCurrentAndNext();
  }, [selectedAcademicYear]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const params = selectedAcademicYear ? `?academicYearId=${selectedAcademicYear.id}` : '';
      const response = await apiService.get(`/teachers/me/dashboard${params}`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching teacher dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const params = selectedAcademicYear ? `?academicYearId=${selectedAcademicYear.id}` : '';
      const response = await apiService.get(`/teachers/me/subjects${params}`);
      setSubjects(response.data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to load subjects');
    }
  };

  const fetchCurrentAndNext = async () => {
    try {
      setIsLoadingTimetable(true);
      const params = selectedAcademicYear ? `?academicYearId=${selectedAcademicYear.id}` : '';
      const response = await apiService.get(`/teachers/me/timetable/current-next${params}`);
      setCurrentAndNext(response.data);
    } catch (error) {
      console.error('Error fetching current and next periods:', error);
    } finally {
      setIsLoadingTimetable(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
        <div className="text-sm text-gray-500">
          Academic Year: {selectedAcademicYear?.name || 'Current'}
        </div>
      </div>

      {/* Teaching Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Subjects Teaching"
          value={dashboardData?.assignedSubjects?.toString() || '0'}
          icon={BookOpenIcon}
          color="primary"
          className="bg-blue-50 border-blue-200"
        />
        <StatsCard
          title="Total Students"
          value={dashboardData?.totalStudents?.toString() || '0'}
          icon={AcademicCapIcon}
          color="success"
          className="bg-green-50 border-green-200"
        />
        <StatsCard
          title="Classes Taught"
          value={dashboardData?.totalClasses?.toString() || '0'}
          icon={UserGroupIcon}
          color="primary"
          className="bg-purple-50 border-purple-200"
        />
        <StatsCard
          title="Weekly Periods"
          value={`${dashboardData?.weeklyPeriods || 0}`}
          icon={ClockIcon}
          color="primary"
          className="bg-orange-50 border-orange-200"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Attendance Rate"
          value={`${dashboardData?.attendanceRate || 0}%`}
          icon={CheckCircleIcon}
          color={dashboardData?.attendanceRate && dashboardData.attendanceRate > 85 ? "success" : "danger"}
          className="bg-indigo-50 border-indigo-200"
        />
        <StatsCard
          title="Marks to Enter"
          value={dashboardData?.marksToEnter?.toString() || '0'}
          icon={DocumentTextIcon}
          color={dashboardData?.marksToEnter && dashboardData.marksToEnter > 0 ? "danger" : "success"}
          className="bg-yellow-50 border-yellow-200"
        />
        <StatsCard
          title="Upcoming Periods"
          value={dashboardData?.upcomingPeriods?.toString() || '0'}
          icon={CalendarIcon}
          color="primary"
          className="bg-teal-50 border-teal-200"
        />
        <StatsCard
          title="Total Hours/Week"
          value={`${dashboardData?.totalHoursPerWeek || 0}h`}
          icon={ChartBarIcon}
          color="primary"
          className="bg-red-50 border-red-200"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current and Next Periods */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Current Schedule</h3>
          </CardHeader>
          <CardBody>
            {isLoadingTimetable ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current Period */}
                {currentAndNext?.current ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-green-900">Current Period</h4>
                      {currentAndNext.current.isActive && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          {currentAndNext.current.minutesRemaining} min left
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-green-800">{currentAndNext.current.subject.name}</p>
                    <p className="text-sm text-green-700">
                      {currentAndNext.current.subClass.className} - {currentAndNext.current.subClass.name}
                    </p>
                    <p className="text-xs text-green-600">
                      {formatTime(currentAndNext.current.period.startTime)} - {formatTime(currentAndNext.current.period.endTime)}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-700">No Current Period</h4>
                    <p className="text-sm text-gray-600">You don't have a class right now</p>
                  </div>
                )}

                {/* Next Period */}
                {currentAndNext?.next ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-blue-900">Next Period</h4>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {currentAndNext.next.isToday ? `in ${currentAndNext.next.minutesToStart} min` : currentAndNext.next.period.dayOfWeek}
                      </span>
                    </div>
                    <p className="text-sm text-blue-800">{currentAndNext.next.subject.name}</p>
                    <p className="text-sm text-blue-700">
                      {currentAndNext.next.subClass.className} - {currentAndNext.next.subClass.name}
                    </p>
                    <p className="text-xs text-blue-600">
                      {formatTime(currentAndNext.next.period.startTime)} - {formatTime(currentAndNext.next.period.endTime)}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-700">No Next Period</h4>
                    <p className="text-sm text-gray-600">No upcoming classes scheduled</p>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* My Subjects */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">My Subjects</h3>
          </CardHeader>
          <CardBody>
            {subjects.length > 0 ? (
              <div className="space-y-3">
                {subjects.slice(0, 5).map((subject) => (
                  <div key={subject.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{subject.name}</p>
                      <p className="text-sm text-gray-600">{subject.category}</p>
                      <div className="mt-2 text-sm text-gray-600">
                        {(subject.subclasses || []).map((sc, index) => (
                          <span key={sc.id}>
                            {sc.className} - {sc.name} ({sc.studentCount} students)
                            {index < (subject.subclasses || []).length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-blue-600">Coeff: {subject.coefficient}</span>
                    </div>
                  </div>
                ))}
                {subjects.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... and {subjects.length - 5} more subjects
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No subjects assigned</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => window.location.href = '/dashboard/teacher/subjects'}
              className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors"
            >
              <BookOpenIcon className="w-8 h-8 text-blue-600 mb-2" />
              <h4 className="font-medium text-gray-900">My Subjects</h4>
              <p className="text-sm text-gray-600">View subjects and classes</p>
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/teacher/students'}
              className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors"
            >
              <AcademicCapIcon className="w-8 h-8 text-green-600 mb-2" />
              <h4 className="font-medium text-gray-900">My Students</h4>
              <p className="text-sm text-gray-600">View and manage students</p>
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/teacher/submit-marks'}
              className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors"
            >
              <DocumentTextIcon className="w-8 h-8 text-purple-600 mb-2" />
              <h4 className="font-medium text-gray-900">Submit Marks</h4>
              <p className="text-sm text-gray-600">Enter student marks</p>
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/teacher/timetable'}
              className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-left transition-colors"
            >
              <CalendarIcon className="w-8 h-8 text-orange-600 mb-2" />
              <h4 className="font-medium text-gray-900">My Timetable</h4>
              <p className="text-sm text-gray-600">View teaching schedule</p>
            </button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
} 