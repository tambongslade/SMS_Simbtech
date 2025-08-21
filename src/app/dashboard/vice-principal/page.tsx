'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, StatsCard } from '@/components/ui';
import {
  AcademicCapIcon,
  UsersIcon,
  BuildingOffice2Icon,
  BookOpenIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';
import { toast } from 'react-hot-toast';

interface VicePrincipalDashboardData {
  totalStudents: number;
  studentsAssigned: number;
  pendingInterviews: number;
  completedInterviews: number;
  awaitingAssignment: number;
  recentDisciplineIssues: number;
  classesWithPendingReports: number;
  teacherAbsences: number;
  enrollmentTrends: {
    thisMonth: number;
    lastMonth: number;
    trend: 'INCREASING' | 'DECREASING' | 'NEUTRAL';
  };
  subclassCapacityUtilization: Array<{
    subclassName: string;
    className: string;
    currentCapacity: number;
    maxCapacity: number;
    utilizationRate: number;
  }>;
  urgentTasks: Array<{ // Assuming this structure based on prior context, even if empty
    type: string;
    description: string;
    timestamp: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
}

export default function VicePrincipalDashboard() {
  const { selectedAcademicYear } = useAuth();
  const [dashboardData, setDashboardData] = useState<VicePrincipalDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedAcademicYear]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const params = selectedAcademicYear ? `?academicYearId=${selectedAcademicYear.id}` : '';
      const response = await apiService.get(`/vice-principal/dashboard${params}`);
      setDashboardData(response.data); // Directly set the data
    } catch (error) {
      console.error('Error fetching vice principal dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'INCREASING':
        return <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />;
      case 'DECREASING':
        return <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ChartBarIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Vice Principal Dashboard</h1>
        <div className="text-sm text-gray-500">
          Academic Year: {selectedAcademicYear?.name || 'Current'}
        </div>
      </div>

      {/* Overview Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Students"
          value={dashboardData?.totalStudents?.toString() || '0'}
          icon={AcademicCapIcon}
          // trend={{ value: dashboardData?.enrollmentTrends?.thisMonth || 0, isUpward: dashboardData?.enrollmentTrends?.trend === 'INCREASING' }}
          color="primary"
          className="bg-blue-50 border-blue-200"
        />
        <StatsCard
          title="Assigned Students"
          value={dashboardData?.studentsAssigned?.toString() || '0'}
          icon={UserGroupIcon}
          // trend={{ value: 0, isUpward: true }} // No direct trend from API for this
          color="success"
          className="bg-green-50 border-green-200"
        />
        <StatsCard
          title="Pending Interviews"
          value={dashboardData?.pendingInterviews?.toString() || '0'}
          icon={UsersIcon}
          // trend={{ value: 0, isUpward: false }} // No direct trend from API for this
          color="warning"
          className="bg-purple-50 border-purple-200"
        />
        <StatsCard
          title="Completed Interviews"
          value={dashboardData?.completedInterviews?.toString() || '0'}
          icon={BookOpenIcon}
          // trend={{ value: 0, isUpward: true }} // No direct trend from API for this
          color="secondary"
          className="bg-orange-50 border-orange-200"
        />
      </div>

      {/* Performance Metrics (some are placeholders as data is not in API) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Recent Discipline Issues"
          value={dashboardData?.recentDisciplineIssues?.toString() || '0'}
          icon={ExclamationTriangleIcon}
          // trend={{ value: dashboardData?.recentDisciplineIssues && dashboardData.recentDisciplineIssues > 5 ? 5 : 0, isUpward: !(dashboardData?.recentDisciplineIssues && dashboardData.recentDisciplineIssues > 5) }}
          color="danger"
          className="bg-red-50 border-red-200"
        />
        <StatsCard
          title="Classes w/ Pending Reports"
          value={dashboardData?.classesWithPendingReports?.toString() || '0'}
          icon={BookOpenIcon}
          // trend={{ value: dashboardData?.classesWithPendingReports && dashboardData.classesWithPendingReports > 0 ? 5 : 0, isUpward: !(dashboardData?.classesWithPendingReports && dashboardData.classesWithPendingReports > 0) }}
          color="warning"
          className="bg-yellow-50 border-yellow-200"
        />
        <StatsCard
          title="Teacher Absences"
          value={dashboardData?.teacherAbsences?.toString() || '0'}
          icon={ClockIcon}
          // trend={{ value: dashboardData?.teacherAbsences && dashboardData.teacherAbsences > 0 ? 5 : 0, isUpward: !(dashboardData?.teacherAbsences && dashboardData.teacherAbsences > 0) }}
          color="danger"
          className="bg-indigo-50 border-indigo-200"
        />
        <StatsCard
          title="Awaiting Assignment"
          value={dashboardData?.awaitingAssignment?.toString() || '0'}
          icon={UsersIcon}
          // trend={{ value: 0, isUpward: true }} // No direct trend from API for this
          color="neutral"
          className="bg-teal-50 border-teal-200"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subclass Capacity Utilization */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Subclass Capacity Utilization</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {dashboardData?.subclassCapacityUtilization?.slice(0, 5).map((subclass, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{subclass.className} - {subclass.subclassName}</p>
                      <p className="text-sm text-gray-600">{subclass.currentCapacity} / {subclass.maxCapacity} students</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">
                        {subclass.utilizationRate}% utilization
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {(dashboardData?.subclassCapacityUtilization?.length || 0) > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  ... and {(dashboardData?.subclassCapacityUtilization?.length || 0) - 5} more subclasses
                </p>
              )}
              {(!dashboardData?.subclassCapacityUtilization || dashboardData.subclassCapacityUtilization.length === 0) && (
                <p className="text-gray-500 text-center py-4">No subclass capacity data available</p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Placeholder for "Subclass Performance" as actual data missing in API */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Subclass Performance (Placeholder)</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <p className="text-gray-500 text-center py-4">
                No detailed subclass performance data available from API.
                Showing placeholder.
              </p>
              {/* Example placeholder data */}
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">FORM 1A - Example</p>
                  <p className="text-sm text-gray-600">30 students</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-600">75% avg</p>
                  <p className="text-sm text-green-600">90% pass rate</p>
                  <p className="text-sm text-gray-600">95% attendance</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teachers Under Supervision (Placeholder) */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Teachers Under Supervision (Placeholder)</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <p className="text-gray-500 text-center py-4">
                No teacher supervision data available from API.
                Showing placeholder.
              </p>
              {/* Example placeholder data */}
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">John Doe</p>
                  <p className="text-sm text-gray-600">
                    5 subjects • 3 classes
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium px-2 py-1 rounded-full bg-green-100 text-green-800`}>
                    4.5/5
                  </span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Guidance Counselors (Placeholder) */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Guidance Counselors (Placeholder)</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <p className="text-gray-500 text-center py-4">
                No guidance counselor data available from API.
                Showing placeholder.
              </p>
              {/* Example placeholder data */}
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Jane Smith</p>
                  <p className="text-sm text-gray-600">10 students assigned</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-600">8 cases</p>
                  <p className="text-sm text-orange-600">3 active</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {dashboardData?.urgentTasks?.slice(0, 8).map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${activity.priority === 'HIGH' ? 'bg-red-500' :
                  activity.priority === 'MEDIUM' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${activity.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                  activity.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                  {activity.priority}
                </span>
              </div>
            ))}
            {(!dashboardData?.urgentTasks || dashboardData.urgentTasks.length === 0) && (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => window.location.href = '/dashboard/vice-principal/classes'}
              className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors"
            >
              <BuildingOffice2Icon className="w-8 h-8 text-blue-600 mb-2" />
              <h4 className="font-medium text-gray-900">My Classes</h4>
              <p className="text-sm text-gray-600">Manage assigned subclasses</p>
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/vice-principal/teachers'}
              className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors"
            >
              <UsersIcon className="w-8 h-8 text-green-600 mb-2" />
              <h4 className="font-medium text-gray-900">Teachers</h4>
              <p className="text-sm text-gray-600">Manage teacher assignments</p>
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/vice-principal/report-card-management'}
              className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors"
            >
              <BookOpenIcon className="w-8 h-8 text-purple-600 mb-2" />
              <h4 className="font-medium text-gray-900">Report Cards</h4>
              <p className="text-sm text-gray-600">Generate class report cards</p>
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/vice-principal/timetable'}
              className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-left transition-colors"
            >
              <ChartBarIcon className="w-8 h-8 text-orange-600 mb-2" />
              <h4 className="font-medium text-gray-900">Timetable</h4>
              <p className="text-sm text-gray-600">View school timetable</p>
            </button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
} 