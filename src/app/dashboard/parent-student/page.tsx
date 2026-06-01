'use client'

import { useState } from 'react';
import { useParentDashboard } from './hooks/useParentDashboard';
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';
import { ChildCard } from './components/ChildCard';
import { ChildDetails } from './components/ChildDetails';
import {
  UserGroupIcon,
  CurrencyDollarIcon,
  AcademicCapIcon,
  ExclamationCircleIcon,
  BellIcon,
  CalendarIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowRightIcon,
  ArrowPathIcon
  
} from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function ParentStudentDashboard() {
  const { data, isLoading, error, refetch } = useParentDashboard();
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  const handleViewDetails = (childId: number) => {
    setSelectedChildId(childId);
  };

  const handleBackToDashboard = () => {
    setSelectedChildId(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 text-center">
          <ExclamationCircleIcon className="w-12 h-12 mx-auto" />
          <h2 className="mt-2 text-xl font-semibold">Failed to load dashboard</h2>
          <p>{error}</p>
          <Button onClick={refetch} className="mt-4" variant="outline">
            <RefreshIcon className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (selectedChildId) {
    return <ChildDetails childId={selectedChildId} onBack={handleBackToDashboard} />;
  }

  // Calculate active enrollments (ENROLLED status)
  const activeEnrollments = data?.children?.filter(child => child.enrollmentStatus === 'ENROLLED').length || 0;

  const stats = [
    {
      title: 'Total Children',
      value: data?.totalChildren.toString() || '0',
      icon: UserGroupIcon,
      color: 'primary' as const,
      description: `${activeEnrollments} actively enrolled`
    },
    {
      title: 'Active Enrollments',
      value: activeEnrollments.toString(),
      icon: AcademicCapIcon,
      color: 'success' as const,
      description: 'Currently enrolled students'
    },
    {
      title: 'Pending Fees',
      value: `${(data?.totalFeesOwed || 0).toLocaleString()} FCFA`,
      icon: CurrencyDollarIcon,
      color: 'danger' as const,
      description: 'Across all children'
    },
    {
      title: 'Latest Grades',
      value: data?.latestGrades.toString() || '0',
      icon: ChartBarIcon,
      color: 'success' as const,
      description: 'Recent grade updates'
    },
    {
      title: 'Discipline Issues',
      value: data?.disciplineIssues.toString() || '0',
      icon: ExclamationCircleIcon,
      color: data?.disciplineIssues && data.disciplineIssues > 0 ? 'warning' as const : 'success' as const,
      description: 'Active issues to address'
    },
    {
      title: 'Unread Messages',
      value: data?.unreadMessages.toString() || '0',
      icon: BellIcon,
      color: 'secondary' as const,
      description: 'From school staff'
    },
    {
      title: 'Upcoming Events',
      value: data?.upcomingEvents.toString() || '0',
      icon: CalendarIcon,
      color: 'primary' as const,
      description: 'School activities'
    },
  ];

  // Mock recent activity data (to be replaced with real API data)
  const recentActivity = [
    {
      id: 1,
      type: 'grade',
      message: 'New quiz result for John - Math (85%)',
      time: '2 hours ago',
      icon: AcademicCapIcon,
      color: 'text-green-600'
    },
    {
      id: 2,
      type: 'payment',
      message: 'Fee payment recorded for Mary - 25,000 FCFA',
      time: '1 day ago',
      icon: CurrencyDollarIcon,
      color: 'text-blue-600'
    },
    {
      id: 3,
      type: 'announcement',
      message: 'New announcement: Parent-Teacher Meeting',
      time: '2 days ago',
      icon: BellIcon,
      color: 'text-purple-600'
    },
    {
      id: 4,
      type: 'attendance',
      message: 'Attendance update: John marked present',
      time: '3 days ago',
      icon: ClockIcon,
      color: 'text-gray-600'
    }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back! 👋
            </h1>
            <p className="text-gray-600 mt-1">
              Academic Year: 2024-2025 | {new Date().toLocaleDateString()}
            </p>
          </div>
          <Button onClick={refetch} variant="outline" className="flex items-center">
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardBody>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-lg ${stat.color === 'primary' ? 'bg-blue-100' :
                    stat.color === 'success' ? 'bg-green-100' :
                      stat.color === 'danger' ? 'bg-red-100' :
                        stat.color === 'warning' ? 'bg-yellow-100' :
                          'bg-gray-100'
                    }`}>
                    <stat.icon className={`h-6 w-6 ${stat.color === 'primary' ? 'text-blue-600' :
                      stat.color === 'success' ? 'text-green-600' :
                        stat.color === 'danger' ? 'text-red-600' :
                          stat.color === 'warning' ? 'text-yellow-600' :
                            'text-gray-600'
                      }`} />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm font-medium text-gray-700">{stat.title}</div>
                  <div className="text-xs text-gray-500">{stat.description}</div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* My Children Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <UserGroupIcon className="w-5 h-5 mr-2" />
                  My Children
                </CardTitle>
                <Link href="/dashboard/parent-student/children">
                  <Button variant="outline" size="sm" className="flex items-center">
                    View All
                    <ArrowRightIcon className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardBody>
              {data?.children && data.children.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.children.slice(0, 4).map((child) => (
                    <ChildCard
                      key={child.id}
                      child={child}
                      onViewDetails={handleViewDetails}
                      compact={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No children enrolled</h3>
                  <p className="mt-1 text-sm text-gray-500">Contact the school office for enrollment.</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Recent Activity Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ChartBarIcon className="w-5 h-5 mr-2" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <activity.icon className={`h-5 w-5 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Link href="/dashboard/parent-student/analytics">
                  <Button variant="outline" size="sm" className="w-full flex items-center justify-center">
                    View Analytics
                    <ArrowRightIcon className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>

          {/* Quick Actions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <Link href="/dashboard/parent-student/messages">
                  <Button variant="outline" className="w-full justify-start">
                    <BellIcon className="w-4 h-4 mr-2" />
                    Send Message to Staff
                  </Button>
                </Link>
                <Link href="/dashboard/parent-student/announcements">
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    View Announcements
                  </Button>
                </Link>
                <Link href="/dashboard/parent-student/settings">
                  <Button variant="outline" className="w-full justify-start">
                    <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                    Payment History
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
} 