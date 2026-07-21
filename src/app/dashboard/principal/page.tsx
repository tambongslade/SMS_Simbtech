'use client';

import {
  UserGroupIcon,
  BanknotesIcon,
  ReceiptRefundIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  CalendarDaysIcon,
  DocumentChartBarIcon,
  BookOpenIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { QuickActionGrid, type QuickAction } from '@/components/dashboard/QuickActionGrid';

const quickActions: QuickAction[] = [
  {
    label: 'Students',
    description: 'Browse student profiles & classes',
    href: '/dashboard/principal/students',
    icon: UserGroupIcon,
    color: 'blue',
  },
  {
    label: 'Personnel',
    description: 'Manage staff & assignments',
    href: '/dashboard/principal/personnel-management',
    icon: UserGroupIcon,
    color: 'purple',
  },
  {
    label: 'Finance Requests',
    description: 'Approve requests & verifications',
    href: '/dashboard/principal/finance-requests',
    icon: BanknotesIcon,
    color: 'amber',
  },
  {
    label: 'Expenditures',
    description: 'Review school spending',
    href: '/dashboard/principal/expenditures',
    icon: ReceiptRefundIcon,
    color: 'rose',
  },
  {
    label: 'Discipline',
    description: 'Roll-call, actions & punishments',
    href: '/dashboard/principal/disciplinary-actions',
    icon: ClipboardDocumentListIcon,
    color: 'cyan',
  },
  {
    label: 'Examination Structure',
    description: 'Terms, sequences & exams',
    href: '/dashboard/principal/examination-structure',
    icon: CalendarDaysIcon,
    color: 'indigo',
  },
  {
    label: 'Report Card Management',
    description: 'Generate & review report cards',
    href: '/dashboard/principal/report-card-management',
    icon: DocumentChartBarIcon,
    color: 'teal',
  },
  {
    label: 'Schemes of Work',
    description: 'Review teacher schemes of work',
    href: '/dashboard/principal/schemes-of-work',
    icon: BookOpenIcon,
    color: 'green',
  },
  {
    label: 'Logbook Review',
    description: 'Review teacher logbooks',
    href: '/dashboard/principal/teacher-logbook',
    icon: ClipboardDocumentCheckIcon,
    color: 'blue',
  },
  {
    label: 'Fee Audit',
    description: 'Compare fee records & discrepancies',
    href: '/dashboard/principal/fee-comparison',
    icon: ClipboardDocumentCheckIcon,
    color: 'purple',
  },
  {
    label: 'Announcements',
    description: 'Post and view announcements',
    href: '/dashboard/principal/announcements',
    icon: BellIcon,
    color: 'amber',
  },
  {
    label: 'Messaging',
    description: 'Chat with staff and parents',
    href: '/dashboard/principal/messaging',
    icon: ChatBubbleLeftRightIcon,
    color: 'green',
  },
  {
    label: 'Overview',
    description: 'School stats & performance',
    href: '/dashboard/principal/overview',
    icon: ChartBarIcon,
    color: 'teal',
  },
];

export default function PrincipalDashboard() {
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
