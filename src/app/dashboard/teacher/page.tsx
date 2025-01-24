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
    title: 'Subjects Taught',
    value: '5', 

    icon: AcademicCapIcon,
    color: 'success'
  },
  {
    title: 'Exams Created',
    value: '10',
    icon: ClipboardDocumentCheckIcon,
    color: 'secondary'
  },
];

export default function TeacherDashboard() {
  return (
    <div className="flex">
      {/* Main Content */}
      <div className="flex-1 p-4">
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <p>Welcome to the Teacher dashboard. Here you can create/edit questions, enter marks, and manage discipline data.</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {stats.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-semibold">Question Management</h2>
          <p>Create and edit exam questions for various subjects.</p>
        </div>
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Marks Entry</h2>
          <p>Enter student marks and track academic performance.</p>
        </div>
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Discipline Management</h2>
          <p>Manage discipline data and communicate with staff.</p>
        </div>
      </div>
    </div>
  );
} 