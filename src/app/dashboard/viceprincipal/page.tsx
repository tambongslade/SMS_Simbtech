'use client'
import { UserGroupIcon, AcademicCapIcon, BuildingLibraryIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';

const stats = [
  {
    title: 'Total Classes',
    value: '30',
    icon: AcademicCapIcon,
    color: 'primary'
  },
  {
    title: 'Total Subjects',
    value: '50',
    icon: ClipboardDocumentCheckIcon,
    color: 'success'
  },
  {
    title: 'Teachers Assigned',
    value: '78',
    icon: UserGroupIcon,
    color: 'secondary'
  },
];

export default function VicePrincipalDashboard() {
  return (
    <div className="flex">
      {/* Main Content */}
      <div className="flex-1 p-4">
        <h1 className="text-2xl font-bold">Vice Principal Dashboard</h1>
        <p>Welcome to the Vice Principal dashboard. Here you can assign subjects and oversee academic data.</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {stats.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-semibold">Subject Assignment</h2>
          <p>Assign subjects to teachers and manage class schedules.</p>
        </div>
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Academic Monitoring</h2>
          <p>Track academic progress and ensure compliance with academic standards.</p>
        </div>
      </div>
    </div>
  );
} 