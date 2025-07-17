'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, StatsCard } from '@/components/ui';
import {
  AcademicCapIcon,
  UsersIcon,
  BuildingOffice2Icon,
  BookOpenIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';
import { toast } from 'react-hot-toast';

interface PrincipalDashboardData {
  schoolAnalytics: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalSubjects: number;
    activeExamSequences: number;
    averageAttendanceRate: number;
    overallAcademicPerformance: number;
    financialCollectionRate: number;
    disciplineIssuesThisMonth: number;
    newEnrollmentsThisMonth: number;
    teacherUtilizationRate: number;
    classCapacityUtilization: number;
  };
  performanceMetrics: {
    academicPerformance: {
      overallPassRate: number;
      averageGrade: number;
      subjectPerformance: Array<{
        subjectName: string;
        averageScore: number;
        passRate: number;
        totalStudents: number;
      }>;
      classPerformance: Array<{
        className: string;
        subClassName: string;
        averageScore: number;
        passRate: number;
        totalStudents: number;
        teacherName: string;
      }>;
    };
    attendanceMetrics: {
      overallAttendanceRate: number;
      classAttendanceRates: Array<any>;
      monthlyAttendanceTrends: Array<any>;
    };
    teacherPerformance: {
      totalTeachers: number;
      averageClassesPerTeacher: number;
      teacherEfficiency: Array<{
        teacherName: string;
        subjectsTeaching: number;
        averageStudentPerformance: number;
        classesManaged: number;
        attendanceRate: number;
      }>;
    };
  };
  financialOverview: {
    totalExpectedRevenue: number;
    totalCollectedRevenue: number;
    collectionRate: number;
    pendingPayments: number;
    paymentMethodBreakdown: Array<{
      method: string;
      amount: number;
      percentage: number;
      transactionCount: number;
    }>;
    outstandingDebts: Array<{
      studentName: string;
      className: string;
      amountOwed: number;
      daysOverdue: number;
    }>;
  };
  disciplineOverview?: { // Made optional
    totalIssues: number;
    resolvedIssues: number;
    pendingIssues: number;
    averageResolutionTime: number;
    issuesByType: Array<{
      issueType: string;
      count: number;
      trend: "INCREASING" | "DECREASING" | "STABLE";
    }>;
  };
  staffOverview: {
    totalStaff: number;
    teacherCount: number;
    administrativeStaff: number;
    staffUtilization: Array<{
      role: string;
      count: number;
      utilizationRate: number;
    }>;
  };
  quickActions: Array<string>;
}

export default function PrincipalDashboard() {
  const { selectedAcademicYear } = useAuth();
  const [dashboardData, setDashboardData] = useState<PrincipalDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedAcademicYear]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const params = selectedAcademicYear ? `?academicYearId=${selectedAcademicYear.id}` : '';
      const response = await apiService.get(`/principal/dashboard${params}`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching principal dashboard:', error);
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
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount).replace('XAF', 'FCFA');
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'INCREASING':
        return <ArrowTrendingUpIcon className="w-4 h-4 text-red-500" />;
      case 'DECREASING':
        return <ArrowTrendingDownIcon className="w-4 h-4 text-green-500" />;
      default:
        return <ChartBarIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Principal Dashboard</h1>
        <div className="text-sm text-gray-500">
          Academic Year: {selectedAcademicYear?.name || 'Current'}
        </div>
      </div>

      {/* School Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Students"
          value={dashboardData?.schoolAnalytics.totalStudents?.toString() || '0'}
          icon={AcademicCapIcon}
          color="primary"
          className="bg-blue-50 border-blue-200"
        />
        <StatsCard
          title="Total Teachers"
          value={dashboardData?.schoolAnalytics.totalTeachers?.toString() || '0'}
          icon={UsersIcon}
          color="primary"
          className="bg-green-50 border-green-200"
        />
        <StatsCard
          title="Total Classes"
          value={dashboardData?.schoolAnalytics.totalClasses?.toString() || '0'}
          icon={BuildingOffice2Icon}
          color="primary"
          className="bg-purple-50 border-purple-200"
        />
        <StatsCard
          title="Active Exams"
          value={dashboardData?.schoolAnalytics.activeExamSequences?.toString() || '0'}
          icon={BookOpenIcon}
          color="primary"
          className="bg-orange-50 border-orange-200"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Attendance Rate"
          value={`${dashboardData?.schoolAnalytics.averageAttendanceRate || 0}%`}
          icon={ClockIcon}
          color={dashboardData?.schoolAnalytics.averageAttendanceRate && dashboardData.schoolAnalytics.averageAttendanceRate > 85 ? "primary" : "secondary"}
          className="bg-indigo-50 border-indigo-200"
        />
        <StatsCard
          title="Academic Performance"
          value={`${dashboardData?.schoolAnalytics.overallAcademicPerformance || 0}%`}
          icon={ChartBarIcon}
          color={dashboardData?.schoolAnalytics.overallAcademicPerformance && dashboardData.schoolAnalytics.overallAcademicPerformance > 70 ? "primary" : "secondary"}
          className="bg-teal-50 border-teal-200"
        />
        <StatsCard
          title="Fee Collection Rate"
          value={`${dashboardData?.schoolAnalytics.financialCollectionRate || 0}%`}
          icon={CurrencyDollarIcon}
          color={dashboardData?.schoolAnalytics.financialCollectionRate && dashboardData.schoolAnalytics.financialCollectionRate > 80 ? "primary" : "secondary"}
          className="bg-yellow-50 border-yellow-200"
        />
        <StatsCard
          title="Discipline Issues"
          value={dashboardData?.schoolAnalytics.disciplineIssuesThisMonth?.toString() || '0'}
          icon={ExclamationTriangleIcon}
          color={dashboardData?.schoolAnalytics.disciplineIssuesThisMonth && dashboardData.schoolAnalytics.disciplineIssuesThisMonth > 10 ? "secondary" : "primary"}
          trend={
            {
              value: dashboardData?.schoolAnalytics.disciplineIssuesThisMonth,
              isUpward: dashboardData?.schoolAnalytics.disciplineIssuesThisMonth && dashboardData.schoolAnalytics.disciplineIssuesThisMonth > 10 ? true : false
            }
          }
          className="bg-red-50 border-red-200"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Academic Performance */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Academic Performance</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Overall Pass Rate:</span>
                <span className="font-semibold">{dashboardData?.performanceMetrics.academicPerformance.overallPassRate || 0}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Average Grade:</span>
                <span className="font-semibold">{dashboardData?.performanceMetrics.academicPerformance.averageGrade || 0}%</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Subject Performance:</h4>
                <ul className="space-y-1">
                  {dashboardData?.performanceMetrics.academicPerformance.subjectPerformance.map((subject, index) => (
                    <li key={index} className="flex items-center justify-between text-xs text-gray-600">
                      <span>{subject.subjectName}</span>
                      <span className="font-semibold">{subject.averageScore}%</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Class Performance:</h4>
                <ul className="space-y-1">
                  {dashboardData?.performanceMetrics.academicPerformance.classPerformance.map((cls, index) => (
                    <li key={index} className="flex items-center justify-between text-xs text-gray-600">
                      <span>{cls.className} - {cls.subClassName}</span>
                      <span className="font-semibold">{cls.averageScore}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Financial Overview */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Financial Overview</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Total Expected Revenue:</span>
                <span className="font-semibold">{formatCurrency(dashboardData?.financialOverview.totalExpectedRevenue || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Total Collected Revenue:</span>
                <span className="font-semibold">{formatCurrency(dashboardData?.financialOverview.totalCollectedRevenue || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Collection Rate:</span>
                <span className="font-semibold">{dashboardData?.financialOverview.collectionRate || 0}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Pending Payments:</span>
                <span className="font-semibold">{formatCurrency(dashboardData?.financialOverview.pendingPayments || 0)}</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Outstanding Debts:</h4>
                <ul className="space-y-1">
                  {(dashboardData?.financialOverview.outstandingDebts || []).slice(0, 3).map((debt, index) => (
                    <li key={index} className="flex items-center justify-between text-xs text-gray-600">
                      <span>{debt.studentName} ({debt.className})</span>
                      <span className="font-semibold">{formatCurrency(debt.amountOwed)}</span>
                    </li>
                  ))}
                  {dashboardData?.financialOverview.outstandingDebts && dashboardData.financialOverview.outstandingDebts.length > 3 && (
                    <li className="text-xs text-gray-500 italic">and {dashboardData.financialOverview.outstandingDebts.length - 3} more...</li>
                  )}
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Discipline Overview */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Discipline Overview</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Total Issues:</span>
                <span className="font-semibold">{dashboardData?.disciplineOverview?.totalIssues || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Resolved This Month:</span>
                <span className="font-semibold">{dashboardData?.disciplineOverview?.resolvedIssues || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Pending Resolution:</span>
                <span className="font-semibold">{dashboardData?.disciplineOverview?.pendingIssues || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Average Resolution Time:</span>
                <span className="font-semibold">{dashboardData?.disciplineOverview?.averageResolutionTime || 0} days</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Issues by Type:</h4>
                <ul className="space-y-1">
                  {(dashboardData?.disciplineOverview?.issuesByType || []).map((issue, index) => (
                    <li key={index} className="flex items-center justify-between text-xs text-gray-600">
                      <span>{issue.issueType}</span>
                      <span className="font-semibold">{issue.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Staff Overview */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Staff Overview</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Total Staff:</span>
                <span className="font-semibold">{dashboardData?.staffOverview.totalStaff || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Total Teachers:</span>
                <span className="font-semibold">{dashboardData?.staffOverview.teacherCount || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Administrative Staff:</span>
                <span className="font-semibold">{dashboardData?.staffOverview.administrativeStaff || 0}</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Staff Utilization:</h4>
                <ul className="space-y-1">
                  {dashboardData?.staffOverview.staffUtilization.map((staff, index) => (
                    <li key={index} className="flex items-center justify-between text-xs text-gray-600">
                      <span>{staff.role}</span>
                      <span className="font-semibold">{staff.utilizationRate || 0}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions (Optional) */}
      {dashboardData?.quickActions && dashboardData.quickActions.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              {dashboardData.quickActions.map((action, index) => (
                <button
                  key={index}
                  className="px-4 py-2 bg-blue-100 text-blue-800 text-sm font-medium rounded-md hover:bg-blue-200"
                >
                  {action}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
} 