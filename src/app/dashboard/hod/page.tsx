'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { StatsCard } from '@/components/ui/StatsCard';
import { useAuth } from '@/components/context/AuthContext';
import { apiService } from '@/lib/apiService';
import toast from 'react-hot-toast';
import {
  AcademicCapIcon,
  UserGroupIcon,
  BookOpenIcon,
  ChartBarIcon,
  ClockIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

interface DashboardData {
  totalSubjects: number;
  totalTeachers: number;
  totalStudents: number;
  totalClasses: number;
  departmentAverage: number;
  overallPassRate: number;
  subjectsManaged: Array<{
    id: number;
    name: string;
    category: string;
  }>;
}

interface DepartmentOverview {
  subjectId: number;
  subjectName: string;
  subjectCategory: string;
  totalTeachers: number;
  totalStudents: number;
  totalClasses: number;
  averagePerformance: number;
  teachersAssigned: Array<{
    id: number;
    name: string;
    email: string;
    matricule: string;
    classesTeaching: number;
    studentsTeaching: number;
    averageMarks: number;
  }>;
}

interface TeacherInDepartment {
  id: number;
  name: string;
  email: string;
  matricule: string;
  phone: string;
  totalHoursPerWeek: number;
  subjectsTeaching: Array<{
    id: number;
    name: string;
    classCount: number;
    studentCount: number;
    averageMarks: number;
  }>;
  classesTeaching: Array<{
    id: number;
    name: string;
    className: string;
    studentCount: number;
    averageMarks: number;
  }>;
  performanceMetrics: {
    totalStudents: number;
    averageMarks: number;
    passRate: number;
    excellentRate: number;
  };
}

export default function HODDashboard() {
  const { user, academicYear } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [departmentOverview, setDepartmentOverview] = useState<DepartmentOverview[]>([]);
  const [teachers, setTeachers] = useState<TeacherInDepartment[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'subjects'>('overview');

  useEffect(() => {
    if (academicYear?.id) {
      fetchDashboardData();
    }
  }, [academicYear?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [dashboardResponse, overviewResponse, teachersResponse] = await Promise.all([
        apiService.get('/hod/dashboard', {
          params: { academicYearId: academicYear?.id }
        }),
        apiService.get('/hod/department-overview', {
          params: { academicYearId: academicYear?.id }
        }),
        apiService.get('/hod/teachers-in-department', {
          params: {
            academicYearId: academicYear?.id,
            limit: 10
          }
        })
      ]);

      setDashboardData(dashboardResponse.data);
      setDepartmentOverview(overviewResponse.data);
      setTeachers(teachersResponse.data);
    } catch (error) {
      console.error('Error fetching HOD dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HOD Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Department management and oversight for {academicYear?.name}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Subjects Managed"
          value={dashboardData?.totalSubjects || 0}
          icon={BookOpenIcon}
          color="blue"
        />
        <StatsCard
          title="Department Teachers"
          value={dashboardData?.totalTeachers || 0}
          icon={UserGroupIcon}
          color="green"
        />
        <StatsCard
          title="Students Taught"
          value={dashboardData?.totalStudents || 0}
          icon={UsersIcon}
          color="purple"
        />
        <StatsCard
          title="Classes Covered"
          value={dashboardData?.totalClasses || 0}
          icon={AcademicCapIcon}
          color="orange"
        />
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Department Average</h3>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {dashboardData?.departmentAverage?.toFixed(1) || '0.0'}
                </p>
              </div>
              <ChartBarIcon className="h-12 w-12 text-blue-500" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Overall Pass Rate</h3>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {dashboardData?.overallPassRate?.toFixed(1) || '0.0'}%
                </p>
              </div>
              <ArrowTrendingUpIcon className="h-12 w-12 text-green-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Department Overview
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'teachers'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Teachers Performance
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'subjects'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Subject Analytics
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Subjects Managed
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData?.subjectsManaged?.map((subject) => (
                  <div
                    key={subject.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <h4 className="font-medium text-gray-900">{subject.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{subject.category}</p>
                  </div>
                )) || (
                    <p className="text-gray-500 col-span-full">No subjects assigned yet</p>
                  )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'teachers' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Teacher Performance Overview
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Teacher
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subjects
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Students
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg. Marks
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pass Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teachers.map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {teacher.name}
                            </div>
                            <div className="text-sm text-gray-500">{teacher.matricule}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {teacher.subjectsTeaching.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {teacher.performanceMetrics.totalStudents}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {teacher.performanceMetrics.averageMarks.toFixed(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {teacher.performanceMetrics.passRate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {departmentOverview.map((subject) => (
              <Card key={subject.subjectId}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {subject.subjectName}
                    </h3>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {subject.subjectCategory}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Teachers</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {subject.totalTeachers}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Students</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {subject.totalStudents}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Classes</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {subject.totalClasses}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg. Performance</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {subject.averagePerformance.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Top Teachers
                    </h4>
                    <div className="space-y-2">
                      {subject.teachersAssigned
                        .slice(0, 3)
                        .map((teacher) => (
                          <div
                            key={teacher.id}
                            className="flex justify-between items-center p-2 bg-gray-50 rounded"
                          >
                            <span className="text-sm text-gray-900">{teacher.name}</span>
                            <span className="text-sm font-medium text-blue-600">
                              {teacher.averageMarks.toFixed(1)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 