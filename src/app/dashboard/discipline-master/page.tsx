'use client';

import React from 'react';
import {
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  FlagIcon,
  BellIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Button, Badge, AnimatedList } from '@/components/ui';

export default function DisciplineMasterDashboard() {
  const stats = [
    {
      title: "Today's Attendance",
      value: '96%',
      icon: ClipboardDocumentCheckIcon,
      trend: { value: 2, isUpward: true },
      color: 'primary' as const
    },
    {
      title: 'Active Cases',
      value: '12',
      icon: ExclamationCircleIcon,
      trend: { value: 3, isUpward: false },
      color: 'red' as const
    },
    {
      title: 'Late Students',
      value: '8',
      icon: ClockIcon,
      trend: { value: 5, isUpward: false },
      color: 'yellow' as const
    },
    {
      title: 'Resolved Cases',
      value: '45',
      icon: CheckCircleIcon,
      trend: { value: 15, isUpward: true },
      color: 'green' as const
    },
  ];

  const recentIncidents = [
    {
      id: 1,
      title: 'Classroom Disruption',
      student: 'James Wilson',
      class: '10A',
      time: '2 hours ago',
      priority: 'high',
      status: 'pending',
    },
    {
      id: 2,
      title: 'Late Arrival',
      student: 'Emma Thompson',
      class: '11B',
      time: '3 hours ago',
      priority: 'medium',
      status: 'in-progress',
    },
    {
      id: 3,
      title: 'Uniform Violation',
      student: 'Michael Brown',
      class: '9C',
      time: '4 hours ago',
      priority: 'low',
      status: 'resolved',
    },
  ];

  const attendanceOverview = [
    { class: '10A', percentage: 98, students: 45 },
    { class: '10B', percentage: 95, students: 42 },
    { class: '11A', percentage: 92, students: 44 },
    { class: '11B', percentage: 97, students: 43 },
  ];

  const quickActions = [
    {
      title: 'Record Incident',
      description: 'Report new disciplinary cases',
      icon: FlagIcon,
      color: 'danger' as const
    },
    {
      title: 'Take Attendance',
      description: 'Mark daily attendance',
      icon: ClipboardDocumentCheckIcon,
      color: 'primary' as const
    },
    {
      title: 'Send Notice',
      description: 'Issue disciplinary notices',
      icon: BellIcon,
      color: 'warning' as const
    },
    {
      title: 'Generate Report',
      description: 'Create behavior reports',
      icon: DocumentTextIcon,
      color: 'success' as const
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Message */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, Discipline Master</h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's an overview of today's discipline and attendance status
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Recent Incidents</CardTitle>
            <Button variant="ghost" size="sm">View All</Button>
          </CardHeader>
          <CardBody>
            <AnimatedList>
              {recentIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex-shrink-0">
                    <Badge
                      variant="solid"
                      color={
                        incident.priority === 'high' ? 'red' :
                        incident.priority === 'medium' ? 'yellow' : 'blue'
                      }
                      size="sm"
                    >
                      {incident.priority}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {incident.title}
                      </p>
                      <Badge
                        variant="subtle"
                        color={
                          incident.status === 'resolved' ? 'green' :
                          incident.status === 'in-progress' ? 'yellow' : 'red'
                        }
                        size="sm"
                      >
                        {incident.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {incident.student} - Class {incident.class}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {incident.time}
                    </p>
                  </div>
                </div>
              ))}
            </AnimatedList>
          </CardBody>
        </Card>

        {/* Attendance Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Overview</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {attendanceOverview.map((item) => (
                <div key={item.class} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-900">
                      Class {item.class}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.students} students
                    </p>
                  </div>
                  <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`absolute left-0 top-0 h-full rounded-full ${
                        item.percentage >= 95 ? 'bg-green-500' :
                        item.percentage >= 90 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-right">
                    {item.percentage}% present
                  </p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  color={action.color}
                  className="h-auto flex flex-col items-center p-6 space-y-2 text-center"
                >
                  {action.icon && React.createElement(action.icon, {
                    className: `h-8 w-8 text-${action.color}-500`
                  })}
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