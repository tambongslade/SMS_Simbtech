'use client';

import React from 'react';
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CalculatorIcon,
  ClockIcon,
  ExclamationCircleIcon,
  DocumentChartBarIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Button, Badge, AnimatedList } from '@/components/ui';

// Add TypeScript interfaces
interface Stat {
  title: string;
  value: string;
  icon: React.ComponentType;
  trend?: { value: number; isUpward: boolean };
  color: 'green' | 'red' | 'blue' | 'yellow';
}

interface Transaction {
  id: number;
  student: string;
  type: string;
  amount: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

interface QuickAction {
  title: string;
  description: string;
  icon:React.ComponentType;
  color: 'success' | 'primary' | 'secondary' | 'warning';
}

export default function BursarDashboard() {
  // Update stats with proper typing
  const stats: Stat[] = [
    {
      title: 'Total Collections',
      value: '₦15.2M',
      icon: BanknotesIcon,
      trend: { value: 12, isUpward: true },
      color: 'green' as const
    },
    {
      title: 'Outstanding Fees',
      value: '₦2.8M',
      icon: ExclamationCircleIcon,
      trend: { value: 8, isUpward: false },
      color: 'red' as const
    },
    {
      title: 'Collection Rate',
      value: '84%',
      icon: ArrowTrendingUpIcon,
      trend: { value: 5, isUpward: true },
      color: 'blue' as const
    },
    {
      title: 'Monthly Expenses',
      value: '₦8.5M',
      icon: CalculatorIcon,
      trend: { value: 3, isUpward: true },
      color: 'yellow' as const
    },
  ];

  // Update transactions with proper typing
  const recentTransactions: Transaction[] = [
    {
      id: 1,
      student: 'John Smith',
      type: 'Tuition Fee',
      amount: '₦250,000',
      date: '2024-01-15',
      status: 'completed',
    },
    {
      id: 2,
      student: 'Sarah Johnson',
      type: 'Library Fee',
      amount: '₦15,000',
      date: '2024-01-15',
      status: 'pending',
    },
    {
      id: 3,
      student: 'Michael Brown',
      type: 'Laboratory Fee',
      amount: '₦45,000',
      date: '2024-01-14',
      status: 'completed',
    },
    {
      id: 4,
      student: 'Emma Wilson',
      type: 'Sports Fee',
      amount: '₦30,000',
      date: '2024-01-14',
      status: 'failed',
    },
  ];

  // Update quickActions with proper typing
  const quickActions: QuickAction[] = [
    {
      title: 'Record Payment',
      description: 'Process new student payments',
      icon: BanknotesIcon,
      color: 'success'
    },
    {
      title: 'Generate Report',
      description: 'Create financial reports',
      icon: DocumentChartBarIcon,
      color: 'primary'
    },
    {
      title: 'Send Reminders',
      description: 'Fee payment reminders',
      icon: EnvelopeIcon,
      color: 'secondary'
    },
    {
      title: 'View Expenses',
      description: 'Track school expenses',
      icon: ClockIcon,
      color: 'warning'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Message */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, Bursar</h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's an overview of the school's financial status
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm">View All</Button>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{transaction.student}</p>
                    <p className="text-sm text-gray-500">{transaction.type}</p>
                    <div className="flex items-center mt-1 space-x-2">
                      <Badge
                        variant="subtle"
                        color={
                          transaction.status === 'completed' ? 'green' :
                          transaction.status === 'pending' ? 'yellow' : 'red'
                        }
                        size="sm"
                      >
                        {transaction.status}
                      </Badge>
                      <span className="text-xs text-gray-400">{transaction.date}</span>
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{transaction.amount}</p>
                </div>
              ))}
            </div>
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
                  <action.icon className={`h-6 w-6 text-${action.color}-500`} />
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