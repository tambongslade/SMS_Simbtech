'use client'
import { UserGroupIcon, AcademicCapIcon, BuildingLibraryIcon, ClipboardDocumentCheckIcon, BellIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';

const stats = [
  {
    title: 'Total Fees Due',
    value: '$2,000',
    icon: ClipboardDocumentCheckIcon,
    color: 'primary'
  },
  {
    title: 'Total Announcements',
    value: '15',
    icon: BellIcon,
    color: 'success'
  },
  {
    title: 'Upcoming Events',
    value: '3',
    icon: CalendarIcon,
    color: 'secondary'
  },
];

export default function ParentStudentDashboard() {
  return (
    <div className="flex">
      {/* Main Content */}
      <div className="flex-1 p-4">
        <h1 className="text-2xl font-bold">Parent/Student Dashboard</h1>
        <p>Welcome to the Parent/Student dashboard. Here you can view fees, results, and announcements.</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {stats.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-semibold">Fee Overview</h2>
          <p>View fee status, payment history, and remaining balance.</p>
        </div>
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Academic Results</h2>
          <p>Check academic results and performance statistics.</p>
        </div>
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Announcements</h2>
          <p>Stay updated with the latest school announcements and events.</p>
        </div>
      </div>
    </div>
  );
} 