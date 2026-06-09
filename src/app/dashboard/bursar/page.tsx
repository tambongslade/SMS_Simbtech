'use client';

import {
  CurrencyDollarIcon,
  BanknotesIcon,
  ReceiptRefundIcon,
  ClipboardDocumentListIcon,
  UserPlusIcon,
  DocumentChartBarIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { QuickActionGrid, type QuickAction } from '@/components/dashboard/QuickActionGrid';

const quickActions: QuickAction[] = [
  {
    label: 'Register Student',
    description: 'Add a new student & parent account',
    href: '/dashboard/bursar/student-registration',
    icon: UserPlusIcon,
    color: 'green',
  },
  {
    label: 'Fee Management',
    description: 'Record payments & manage fees',
    href: '/dashboard/bursar/fee-management',
    icon: CurrencyDollarIcon,
    color: 'blue',
  },
  {
    label: 'Fee Items',
    description: 'Configure fee items',
    href: '/dashboard/bursar/fee-items',
    icon: BanknotesIcon,
    color: 'teal',
  },
  {
    label: 'Overpayments & Refunds',
    description: 'Review and refund overpayments',
    href: '/dashboard/bursar/overpayments',
    icon: ReceiptRefundIcon,
    color: 'cyan',
  },
  {
    label: 'Finance Requests',
    description: 'Approvals & bank verifications',
    href: '/dashboard/bursar/finance-requests',
    icon: BanknotesIcon,
    color: 'amber',
  },
  {
    label: 'Expenditures',
    description: 'Record & review spending',
    href: '/dashboard/bursar/expenditures',
    icon: ReceiptRefundIcon,
    color: 'rose',
  },
  {
    label: 'Broken Property',
    description: 'Track damaged property charges',
    href: '/dashboard/bursar/broken-property',
    icon: ClipboardDocumentListIcon,
    color: 'purple',
  },
  {
    label: 'Report Card Readiness',
    description: 'Check fee clearance for reports',
    href: '/dashboard/bursar/report-card-readiness',
    icon: DocumentChartBarIcon,
    color: 'indigo',
  },
  {
    label: 'Financial Reports',
    description: 'View detailed financial reports',
    href: '/dashboard/bursar/reports',
    icon: DocumentChartBarIcon,
    color: 'blue',
  },
  {
    label: 'Announcements',
    description: 'Post and view announcements',
    href: '/dashboard/bursar/announcements',
    icon: BellIcon,
    color: 'amber',
  },
  {
    label: 'Messaging',
    description: 'Chat with staff and parents',
    href: '/dashboard/bursar/messaging',
    icon: ChatBubbleLeftRightIcon,
    color: 'green',
  },
  {
    label: 'Overview',
    description: 'Stats, payments & registrations',
    href: '/dashboard/bursar/overview',
    icon: ChartBarIcon,
    color: 'teal',
  },
];

export default function BursarDashboard() {
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
