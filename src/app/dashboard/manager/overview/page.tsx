'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { StatsCard } from '@/components/ui/StatsCard';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/context/AuthContext';
import { apiService } from '@/lib/apiService';
import toast from 'react-hot-toast';
import { 
  UsersIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface DashboardData {
  totalStaff: number;
  totalStudents: number;
  totalParents: number;
  activeClasses: number;
  pendingTasks: number;
  todaysSchedule: Array<{
    id: number;
    time: string;
    activity: string;
    location: string;
    attendees: Array<string>;
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  }>;
  operationalMetrics: {
    attendanceRate: number;
    disciplineIssues: number;
    feeCollection: number;
    maintenanceRequests: number;
  };
  staffOverview: {
    present: number;
    absent: number;
    onLeave: number;
    newRequests: number;
  };
  recentActivities: Array<{
    id: number;
    activity: string;
    user: string;
    timestamp: string;
    category: "ACADEMIC" | "ADMINISTRATIVE" | "OPERATIONAL" | "FINANCIAL";
    priority: "LOW" | "MEDIUM" | "HIGH";
  }>;
  alerts: Array<{
    id: number;
    type: "WARNING" | "INFO" | "URGENT";
    message: string;
    timestamp: string;
    actionRequired: boolean;
  }>;
}

interface FinancialOverview {
  totalExpectedRevenue: number;
  totalCollectedRevenue: number;
  collectionRate: number;
  pendingPayments: number;
  monthlyCollectionTrends: Array<{
    month: string;
    collected: number;
    expected: number;
    collectionRate: number;
  }>;
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
}

interface OperationalSupport {
  maintenanceRequests: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    urgent: number;
  };
  facilityStatus: Array<{
    facility: string;
    status: "OPERATIONAL" | "MAINTENANCE" | "OUT_OF_ORDER";
    lastChecked: string;
    nextMaintenance: string;
    urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }>;
  inventoryAlerts: Array<{
    item: string;
    currentStock: number;
    minimumRequired: number;
    status: "LOW_STOCK" | "OUT_OF_STOCK" | "REORDER_NEEDED";
    supplier: string;
    lastOrdered: string;
  }>;
  transportManagement: {
    totalVehicles: number;
    operational: number;
    maintenance: number;
    routesActive: number;
    studentsTransported: number;
  };
  securityOverview: {
    incidentsToday: number;
    visitorsRegistered: number;
    securityAlerts: number;
    accessControlStatus: "NORMAL" | "ALERT" | "LOCKDOWN";
  };
}

export default function ManagerDashboard() {
  const { user, academicYear } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [financialData, setFinancialData] = useState<FinancialOverview | null>(null);
  const [operationalData, setOperationalData] = useState<OperationalSupport | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'operational' | 'staff'>('overview');

  useEffect(() => {
    if (academicYear?.id) {
      fetchDashboardData();
    }
  }, [academicYear?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [dashboardResponse, financialResponse, operationalResponse] = await Promise.all([
        apiService.get('/manager/dashboard', {
          params: { academicYearId: academicYear?.id }
        }),
        apiService.get('/principal/analytics/financial', {
          params: { academicYearId: academicYear?.id }
        }),
        apiService.get('/manager/operational-support')
      ]);

      setDashboardData(dashboardResponse.data);
      setFinancialData(financialResponse.data);
      setOperationalData(operationalResponse.data);
    } catch (error) {
      console.error('Error fetching manager dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-100';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-100';
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'CANCELLED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'URGENT': return 'border-red-200 bg-red-50';
      case 'WARNING': return 'border-yellow-200 bg-yellow-50';
      case 'INFO': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getFacilityStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL': return 'text-green-600 bg-green-100';
      case 'MAINTENANCE': return 'text-yellow-600 bg-yellow-100';
      case 'OUT_OF_ORDER': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
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
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-gray-600 mt-1">
            School operations and financial oversight for {academicYear?.name}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Staff"
          value={dashboardData?.totalStaff || 0}
          icon={UsersIcon}
          color="blue"
        />
        <StatsCard
          title="Total Students"
          value={dashboardData?.totalStudents || 0}
          icon={BuildingOfficeIcon}
          color="green"
        />
        <StatsCard
          title="Collection Rate"
          value={`${financialData?.collectionRate?.toFixed(1) || 0}%`}
          icon={CurrencyDollarIcon}
          color="purple"
        />
        <StatsCard
          title="Pending Tasks"
          value={dashboardData?.pendingTasks || 0}
          icon={ClipboardDocumentListIcon}
          color="orange"
        />
      </div>

      {/* Alerts Section */}
      {dashboardData?.alerts && dashboardData.alerts.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
              System Alerts
            </h3>
            <div className="space-y-3">
              {dashboardData.alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 border rounded-lg ${getAlertColor(alert.type)}`}
                >
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {alert.actionRequired && (
                    <p className="text-xs text-gray-600 mt-1">Action required</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'financial', label: 'Financial' },
            { id: 'operational', label: 'Operational' },
            { id: 'staff', label: 'Staff Management' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Operational Metrics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {dashboardData?.operationalMetrics.attendanceRate?.toFixed(1) || 0}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Discipline Issues</p>
                  <p className="text-2xl font-bold text-red-600">
                    {dashboardData?.operationalMetrics.disciplineIssues || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fee Collection</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {dashboardData?.operationalMetrics.feeCollection?.toFixed(1) || 0}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Maintenance</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {dashboardData?.operationalMetrics.maintenanceRequests || 0}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Activities
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {dashboardData?.recentActivities?.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.activity}</p>
                      <p className="text-xs text-gray-600">by {activity.user}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        activity.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                        activity.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {activity.priority}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Expected</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {financialData?.totalExpectedRevenue?.toLocaleString() || 0} FCFA
                    </p>
                  </div>
                  <CurrencyDollarIcon className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Collected</p>
                    <p className="text-2xl font-bold text-green-600">
                      {financialData?.totalCollectedRevenue?.toLocaleString() || 0} FCFA
                    </p>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending Payments</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {financialData?.pendingPayments?.toLocaleString() || 0} FCFA
                    </p>
                  </div>
                  <ClockIcon className="h-8 w-8 text-orange-500" />
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Payment Methods Breakdown
                </h3>
                <div className="space-y-3">
                  {financialData?.paymentMethodBreakdown?.map((method, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{method.method}</p>
                        <p className="text-sm text-gray-600">{method.transactionCount} transactions</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {method.amount.toLocaleString()} FCFA
                        </p>
                        <p className="text-sm text-gray-600">{method.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Outstanding Debts (Top 5)
                </h3>
                <div className="space-y-3">
                  {financialData?.outstandingDebts?.slice(0, 5).map((debt, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <div>
                        <p className="font-medium text-gray-900">{debt.studentName}</p>
                        <p className="text-sm text-gray-600">{debt.className}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-600">
                          {debt.amountOwed.toLocaleString()} FCFA
                        </p>
                        <p className="text-sm text-red-500">{debt.daysOverdue} days overdue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'operational' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Maintenance</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {operationalData?.maintenanceRequests.pending || 0}
                    </p>
                    <p className="text-xs text-gray-500">pending</p>
                  </div>
                  <WrenchScrewdriverIcon className="h-8 w-8 text-orange-500" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Vehicles</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {operationalData?.transportManagement.operational || 0}
                    </p>
                    <p className="text-xs text-gray-500">operational</p>
                  </div>
                  <BuildingOfficeIcon className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Security</p>
                    <p className="text-2xl font-bold text-green-600">
                      {operationalData?.securityOverview.incidentsToday || 0}
                    </p>
                    <p className="text-xs text-gray-500">incidents today</p>
                  </div>
                  <ExclamationTriangleIcon className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Inventory</p>
                    <p className="text-2xl font-bold text-red-600">
                      {operationalData?.inventoryAlerts.length || 0}
                    </p>
                    <p className="text-xs text-gray-500">alerts</p>
                  </div>
                  <ClipboardDocumentListIcon className="h-8 w-8 text-red-500" />
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Facility Status
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {operationalData?.facilityStatus?.map((facility, index) => (
                    <div key={index} className="flex justify-between items-center p-2 border border-gray-200 rounded">
                      <div>
                        <p className="font-medium text-gray-900">{facility.facility}</p>
                        <p className="text-sm text-gray-600">
                          Last checked: {new Date(facility.lastChecked).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded-full ${getFacilityStatusColor(facility.status)}`}>
                          {facility.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{facility.urgency}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Inventory Alerts
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {operationalData?.inventoryAlerts?.map((alert, index) => (
                    <div key={index} className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{alert.item}</p>
                          <p className="text-sm text-gray-600">
                            Stock: {alert.currentStock} / Required: {alert.minimumRequired}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          alert.status === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-800' :
                          alert.status === 'LOW_STOCK' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {alert.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Present</p>
                    <p className="text-2xl font-bold text-green-600">
                      {dashboardData?.staffOverview.present || 0}
                    </p>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Absent</p>
                    <p className="text-2xl font-bold text-red-600">
                      {dashboardData?.staffOverview.absent || 0}
                    </p>
                  </div>
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">On Leave</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {dashboardData?.staffOverview.onLeave || 0}
                    </p>
                  </div>
                  <CalendarIcon className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">New Requests</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {dashboardData?.staffOverview.newRequests || 0}
                    </p>
                  </div>
                  <DocumentTextIcon className="h-8 w-8 text-orange-500" />
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Today's Schedule
              </h3>
              <div className="space-y-3">
                {dashboardData?.todaysSchedule?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.activity}</p>
                      <p className="text-sm text-gray-600">{item.location}</p>
                      <p className="text-xs text-gray-500">
                        Attendees: {item.attendees.join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{item.time}</p>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
      </div>
      )}
    </div>
  );
} 