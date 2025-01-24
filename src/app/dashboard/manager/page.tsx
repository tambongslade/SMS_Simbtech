'use client'
import { UserGroupIcon, AcademicCapIcon, BuildingLibraryIcon, ClipboardDocumentCheckIcon, DocumentChartBarIcon } from '@heroicons/react/24/outline';
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';

const stats = [
  {
    title: 'Total Budget',
    value: '$1,000,000',
    icon: ClipboardDocumentCheckIcon,
    color: 'primary'
  },
  {
    title: 'Total Reports',
    value: '50',
    icon: DocumentChartBarIcon,
    color: 'success'
  },
  {
    title: 'Departments',
    value: '6',
    icon: BuildingLibraryIcon,
    color: 'secondary'
  },
];

export default function ManagerDashboard() {
  return (
    <div className="flex">
      {/* Main Content */}
      <div className="flex-1 p-4">
        <h1 className="text-2xl font-bold">Manager Dashboard</h1>
        <p>Welcome to the Manager dashboard. Here you can oversee financial and academic data.</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {stats.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-semibold">Financial Oversight</h2>
          <p>Review financial reports and manage budget allocations.</p>
        </div>
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Academic Oversight</h2>
          <p>Monitor academic performance and oversee curriculum implementation.</p>
        </div>
      </div>
    </div>
  );
} 