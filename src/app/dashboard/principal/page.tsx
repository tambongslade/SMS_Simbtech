'use client';

import React from 'react';
import { 
  UserGroupIcon, 
  AcademicCapIcon, 
  BuildingLibraryIcon,
  ClipboardDocumentCheckIcon,
  BellIcon,
  DocumentChartBarIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Button, AnimatedList } from '@/components/ui';
import { useRouter } from 'next/navigation';

// Define types for the data structures
interface Stat {
  title: string;
  value: string;
  icon: React.ComponentType;
  trend?: { value: number; isUpward: boolean };
  color: 'primary' | 'success' | 'secondary' | 'warning';
}

interface Activity {
  id: number;
  title: string;
  description: string;
  time: string;
  icon: React.ComponentType;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType;
  color: 'primary' | 'success' | 'secondary' | 'warning';
}

export default function PrincipalDashboard() {
  const router = useRouter();

  const handleLogout = () => {
    // Perform any logout logic here
    router.push('/'); // Redirect to home route
  };

  const stats: Stat[] = [
    {
      title: 'Total Students',
      value: '1,234',
      icon: UserGroupIcon,
      trend: { value: 12, isUpward: true },
      color: 'primary'
    },
    {
      title: 'Total Teachers',
      value: '78',
      icon: AcademicCapIcon,
      trend: { value: 5, isUpward: true },
      color: 'success'
    },
    {
      title: 'Departments',
      value: '6',
      icon: BuildingLibraryIcon,
      color: 'secondary'
    },
    {
      title: "Today's Attendance",
      value: '96%',
      icon: ClipboardDocumentCheckIcon,
      trend: { value: 2, isUpward: true },
      color: 'warning'
    },
  ];

  const recentActivities: Activity[] = [
    {
      id: 1,
      title: 'New Student Registration',
      description: 'John Doe has been registered in Class 10A',
      time: '2 hours ago',
      icon: UserGroupIcon,
    },
    {
      id: 2,
      title: 'Department Meeting',
      description: 'Science Department meeting scheduled for tomorrow',
      time: '3 hours ago',
      icon: BuildingLibraryIcon,
    },
    {
      id: 3,
      title: 'Attendance Report',
      description: 'Monthly attendance report is ready for review',
      time: '5 hours ago',
      icon: ClipboardDocumentCheckIcon,
    },
  ];

  const quickActions: QuickAction[] = [
    {
      title: 'Create Announcement',
      description: 'Send important updates to staff and students',
      icon: BellIcon,
      color: 'primary'
    },
    {
      title: 'View Reports',
      description: 'Access academic and administrative reports',
      icon: DocumentChartBarIcon,
      color: 'success'
    },
    {
      title: 'Schedule Meeting',
      description: 'Arrange meetings with staff or departments',
      icon: CalendarIcon,
      color: 'secondary'
    },
    {
      title: 'View Calendar',
      description: 'Check upcoming events and schedules',
      icon: ClockIcon,
      color: 'warning'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Logout Button */}
      <div className="flex justify-end">
        <Button onClick={handleLogout} variant="ghost" className="text-red-600">
          Logout
        </Button>
      </div>

      {/* Welcome Message */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, Principal</h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's what's happening in your school today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardBody>
            <AnimatedList>
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex-shrink-0">
                    <activity.icon className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </AnimatedList>
          </CardBody>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  color={action.color}
                  className="h-auto flex flex-col items-start p-4 space-y-2 text-left"
                >
                  <action.icon className="h-6 w-6" />
                  <div>
                    <p className="font-medium">{action.title}</p>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                </Button>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
} 