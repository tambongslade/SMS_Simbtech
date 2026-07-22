'use client';

import {
  AcademicCapIcon,
  UserGroupIcon,
  BanknotesIcon,
  ReceiptRefundIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  CalendarIcon,
  DocumentChartBarIcon,
  BookOpenIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { QuickActionGrid, type QuickAction } from '@/components/dashboard/QuickActionGrid';

const quickActions: QuickAction[] = [
  {
    label: 'Students',
    description: 'Manage students, parents & enrollment',
    href: '/dashboard/vice-principal/students',
    icon: UserGroupIcon,
    color: 'blue',
  },
  {
    label: 'Classes',
    description: 'Manage classes & subclasses',
    href: '/dashboard/vice-principal/classes',
    icon: AcademicCapIcon,
    color: 'blue',
  },
  {
    label: 'Subjects',
    description: 'Subjects & teacher assignments',
    href: '/dashboard/vice-principal/subjects',
    icon: ClipboardDocumentCheckIcon,
    color: 'purple',
  },
  {
    label: 'Teachers',
    description: 'View & manage teachers',
    href: '/dashboard/vice-principal/teachers',
    icon: UserGroupIcon,
    color: 'cyan',
  },
  {
    label: 'Interviews',
    description: 'Interview & assign new students',
    href: '/dashboard/vice-principal/interviews',
    icon: UserGroupIcon,
    color: 'green',
  },
  {
    label: 'Timetable',
    description: 'Build & review timetables',
    href: '/dashboard/vice-principal/timetable',
    icon: CalendarIcon,
    color: 'indigo',
  },
  {
    label: 'Schemes of Work',
    description: 'Review teacher schemes of work',
    href: '/dashboard/vice-principal/schemes-of-work',
    icon: BookOpenIcon,
    color: 'teal',
  },
  {
    label: 'Logbook Review',
    description: 'Review teacher logbooks',
    href: '/dashboard/vice-principal/teacher-logbook',
    icon: ClipboardDocumentCheckIcon,
    color: 'blue',
  },
  {
    label: 'Marks Submission',
    description: 'Track marks submission status',
    href: '/dashboard/vice-principal/marks-submission',
    icon: ClipboardDocumentListIcon,
    color: 'amber',
  },
  {
    label: 'Report Card Management',
    description: 'Generate & review report cards',
    href: '/dashboard/vice-principal/report-card-management',
    icon: DocumentChartBarIcon,
    color: 'purple',
  },
  {
    label: 'Finance Requests',
    description: 'Approve requests & verifications',
    href: '/dashboard/vice-principal/finance-requests',
    icon: BanknotesIcon,
    color: 'amber',
  },
  {
    label: 'Expenditures',
    description: 'Review school spending',
    href: '/dashboard/vice-principal/expenditures',
    icon: ReceiptRefundIcon,
    color: 'rose',
  },
  {
    label: 'Discipline',
    description: 'Roll-call, actions & punishments',
    href: '/dashboard/vice-principal/disciplinary-actions',
    icon: ClipboardDocumentListIcon,
    color: 'cyan',
  },
  {
    label: 'Seized Items',
    description: 'Confiscated items & custody',
    href: '/dashboard/vice-principal/seized-items',
    icon: ClipboardDocumentListIcon,
    color: 'amber',
  },
      {
    label: 'Overview',
    description: 'Assignments, interviews & stats',
    href: '/dashboard/vice-principal/overview',
    icon: ChartBarIcon,
    color: 'teal',
  },
];

export default function VicePrincipalDashboard() {
  const { selectedAcademicYear, user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-gray-600 mt-0.5">
          What would you like to do?
          {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}
        </p>
      </div>

      <QuickActionGrid actions={quickActions} />
    </div>
  );
}
