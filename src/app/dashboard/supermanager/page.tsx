'use client'
import { UserGroupIcon, AcademicCapIcon, BuildingLibraryIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';

const stats = [
  {
    title: 'Total Academic Years',
    value: '5',
    icon: AcademicCapIcon,
    color: 'primary'
  },
  {
    title: 'Total Fees Collected',
    value: '$500,000',
    icon: ClipboardDocumentCheckIcon,
    color: 'success'
  },
  {
    title: 'Total Events',
    value: '20',
    icon: BuildingLibraryIcon,
    color: 'secondary'
  },
];

export default function SuperManagerDashboard() {
  return (
    <div className="flex">
      {/* Main Content */}
      <div className="flex-1 p-4">
        <h1 className="text-2xl font-bold">Super Manager Dashboard</h1>
        <p>Welcome to the Super Manager dashboard. Here you can manage academic years, fees, and school calendars.</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {stats.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-semibold">Academic Year Management</h2>
          <p>Configure academic year start/end dates, semester dates, and school fees.</p>
        </div>
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Fee Management</h2>
          <p>Set up registration fees and manage fee payment deadlines.</p>
        </div>
        <div className="mt-4">
          <h2 className="text-xl font-semibold">School Calendar</h2>
          <p>Manage school events and holidays.</p>
        </div>
      </div>
    </div>
  );
} 