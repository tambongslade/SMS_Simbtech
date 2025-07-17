'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, StatsCard } from '@/components/ui';
import {
  CurrencyDollarIcon,
  UsersIcon,
  ChartBarIcon,
  ClockIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';
import { toast } from 'react-hot-toast';

interface BursarDashboardData {
  totalFeesExpected: number;
  totalFeesCollected: number;
  pendingPayments: number;
  collectionRate: number;
  recentTransactions: number;
  newStudentsThisMonth: number;
  studentsWithParents: number;
  studentsWithoutParents: number;
  paymentMethods: Array<{
    method: string;
    count: number;
    totalAmount: number;
  }>;
  recentRegistrations: Array<{
    studentName: string;
    parentName: string;
    registrationDate: string;
    className: string;
  }>;
}

export default function BursarDashboard() {
  const { selectedAcademicYear } = useAuth();
  const [dashboardData, setDashboardData] = useState<BursarDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedAcademicYear]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const params = selectedAcademicYear ? `?academicYearId=${selectedAcademicYear.id}` : '';
      const response = await apiService.get(`/bursar/dashboard${params}`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching bursar dashboard:', error);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount).replace('XAF', 'FCFA');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Bursar Dashboard</h1>
        <div className="text-sm text-gray-500">
          Academic Year: {selectedAcademicYear?.name || 'Current'}
        </div>
      </div>

      {/* Financial Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Expected"
          value={formatCurrency(dashboardData?.totalFeesExpected || 0)}
          icon={CurrencyDollarIcon}
          color="primary"
        />
        <StatsCard
          title="Total Collected"
          value={formatCurrency(dashboardData?.totalFeesCollected || 0)}
          icon={CurrencyDollarIcon}
          color="success"
        />
        <StatsCard
          title="Collection Rate"
          value={`${dashboardData?.collectionRate.toFixed(2) || 0}%`}
          icon={ChartBarIcon}
          color="warning"
        />
        <StatsCard
          title="Pending Payments"
          value={dashboardData?.pendingPayments?.toString() || '0'}
          icon={ClockIcon}
          color="danger"
          className="bg-red-50 border-red-200"
        />
      </div>

      {/* Student Management Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="New Students This Month"
          value={dashboardData?.newStudentsThisMonth?.toString() || '0'}
          icon={UserPlusIcon}
          color="success"
          className="bg-purple-50 border-purple-200"
        />
        <StatsCard
          title="Students with Parents"
          value={dashboardData?.studentsWithParents?.toString() || '0'}
          icon={UsersIcon}
          color="success"
          className="bg-indigo-50 border-indigo-200"
        />
        <StatsCard
          title="Students without Parents"
          value={dashboardData?.studentsWithoutParents?.toString() || '0'}
          icon={UsersIcon}
          color="danger"
          className="bg-orange-50 border-orange-200"
        />
        <StatsCard
          title="Recent Transactions"
          value={dashboardData?.recentTransactions?.toString() || '0'}
          icon={ChartBarIcon}
          color="primary"
          className="bg-teal-50 border-teal-200"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Breakdown */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Payment Methods</h3>
          </CardHeader>
          <CardBody>
            {dashboardData?.paymentMethods && dashboardData.paymentMethods.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.paymentMethods.map((method, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{method.method}</p>
                      <p className="text-sm text-gray-600">{method.count} transactions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(method.totalAmount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No payment data available</p>
            )}
          </CardBody>
        </Card>

        {/* Recent Registrations */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Recent Registrations</h3>
          </CardHeader>
          <CardBody>
            {dashboardData?.recentRegistrations && dashboardData.recentRegistrations.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recentRegistrations.slice(0, 5).map((registration, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{registration.studentName}</p>
                      <p className="text-sm text-gray-600">Parent: {registration.parentName}</p>
                      <p className="text-xs text-gray-500">{registration.className}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {new Date(registration.registrationDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent registrations</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.href = '/dashboard/bursar/fee-management'}
              className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors"
            >
              <CurrencyDollarIcon className="w-8 h-8 text-blue-600 mb-2" />
              <h4 className="font-medium text-gray-900">Manage Fees</h4>
              <p className="text-sm text-gray-600">Record payments and manage student fees</p>
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/bursar/student-registration'}
              className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors"
            >
              <UserPlusIcon className="w-8 h-8 text-green-600 mb-2" />
              <h4 className="font-medium text-gray-900">Register Student</h4>
              <p className="text-sm text-gray-600">Add new students with parent accounts</p>
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/bursar/reports'}
              className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors"
            >
              <ChartBarIcon className="w-8 h-8 text-purple-600 mb-2" />
              <h4 className="font-medium text-gray-900">Financial Reports</h4>
              <p className="text-sm text-gray-600">View detailed financial reports</p>
            </button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
} 