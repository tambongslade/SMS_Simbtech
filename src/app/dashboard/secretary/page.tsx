'use client';

import {
  UserGroupIcon,
  AcademicCapIcon,
  DocumentChartBarIcon,
  UserPlusIcon,
  BanknotesIcon,
  ReceiptRefundIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { QuickActionGrid, type QuickAction } from '@/components/dashboard/QuickActionGrid';

const quickActions: QuickAction[] = [
  {
    label: 'Register Student',
    description: 'Create a new student & parent account',
    href: '/dashboard/secretary/students?create=1',
    icon: UserPlusIcon,
    color: 'green',
  },
  {
    label: 'Students',
    description: 'View profiles, photos & classes',
    href: '/dashboard/secretary/students',
    icon: UserGroupIcon,
    color: 'blue',
  },
  {
    label: 'Teachers',
    description: 'Create and view teacher accounts',
    href: '/dashboard/secretary/teachers',
    icon: AcademicCapIcon,
    color: 'purple',
  },
  {
    label: 'Class Lists',
    description: 'Export class & subclass lists',
    href: '/dashboard/secretary/class-lists',
    icon: DocumentChartBarIcon,
    color: 'cyan',
  },
  {
    label: 'Bank Verifications',
    description: 'Verify parent-claimed deposits',
    href: '/dashboard/secretary/finance-requests',
    icon: BanknotesIcon,
    color: 'amber',
  },
  {
    label: 'Expenditures',
    description: 'Review school spending',
    href: '/dashboard/secretary/expenditures',
    icon: ReceiptRefundIcon,
    color: 'rose',
  },
  {
    label: 'Overview',
    description: 'Stats & totals at a glance',
    href: '/dashboard/secretary/overview',
    icon: ChartBarIcon,
    color: 'indigo',
  },
];

export default function SecretaryDashboard() {
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
