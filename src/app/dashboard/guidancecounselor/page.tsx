'use client'
import { UserGroupIcon, AcademicCapIcon, BuildingLibraryIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';

const stats = [
  {
    title: 'Total Students',
    value: '200',
    icon: UserGroupIcon,
    color: 'primary'
  },
  {
    title: 'Remarks Added',
    value: '50',
    icon: ClipboardDocumentCheckIcon,
    color: 'success'
  },
  {
    title: 'Behavior Issues',
    value: '10',
    icon: BuildingLibraryIcon,
    color: 'secondary'
  },
];

export default function GuidanceCounselorDashboard() {
  return (
    <div className="flex">
      {/* Main Content */}
      <div className="flex-1 p-4">
        <h1 className="text-2xl font-bold">Guidance Counselor Dashboard</h1>
        <p>Welcome to the Guidance Counselor dashboard. Here you can add student remarks and monitor behavior and performance issues.</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {stats.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-semibold">Student Remarks</h2>
          <p>Add remarks and notes on student behavior and performance.</p>
        </div>
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Behavior Monitoring</h2>
          <p>Monitor and address student behavior and special concerns.</p>
        </div>
      </div>
    </div>
  );
} 