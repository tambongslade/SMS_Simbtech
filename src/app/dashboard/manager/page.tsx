'use client';

import {
  AcademicCapIcon,
  ArchiveBoxIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  DocumentChartBarIcon,
  ReceiptRefundIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { QuickActionGrid, type QuickAction } from '@/components/dashboard/QuickActionGrid';

const quickActions: QuickAction[] = [
  {
    label: 'Financial Reports',
    description: "View financial reports",
    href: '/dashboard/manager/financial-reports',
    icon: DocumentChartBarIcon,
    color: 'blue',
  },
  {
    label: 'Finance Requests',
    description: "Approvals & verifications",
    href: '/dashboard/manager/finance-requests',
    icon: BanknotesIcon,
    color: 'amber',
  },
  {
    label: 'Expenditures',
    description: "Review school spending",
    href: '/dashboard/manager/expenditures',
    icon: ReceiptRefundIcon,
    color: 'rose',
  },
  {
    label: 'Discipline',
    description: "Roll-call, actions & punishments",
    href: '/dashboard/manager/disciplinary-actions',
    icon: ClipboardDocumentListIcon,
    color: 'cyan',
  },
  {
    label: 'Teacher Roll Calls',
    description: "Review per-period roll calls",
    href: '/dashboard/manager/teacher-roll-calls',
    icon: ClipboardDocumentCheckIcon,
    color: 'indigo',
  },
  {
    label: 'Academic Reports',
    description: "Academic performance reports",
    href: '/dashboard/manager/academic-reports',
    icon: AcademicCapIcon,
    color: 'purple',
  },
  {
    label: 'Departments',
    description: "Department management",
    href: '/dashboard/manager/departments',
    icon: BuildingLibraryIcon,
    color: 'teal',
  },
  {
    label: 'Fee Audit',
    description: "Compare fee records",
    href: '/dashboard/manager/fee-comparison',
    icon: ClipboardDocumentCheckIcon,
    color: 'green',
  },
  {
    label: 'Chat',
    description: "Message staff in real time",
    href: '/dashboard/manager/chat',
    icon: ChatBubbleLeftRightIcon,
    color: 'green',
  },
  {
    label: 'Inventory',
    description: "Catalog, grants & transfers",
    href: '/dashboard/manager/inventory',
    icon: ArchiveBoxIcon,
    color: 'blue',
  },
  {
    label: 'Overview',
    description: "Stats at a glance",
    href: '/dashboard/manager/overview',
    icon: ChartBarIcon,
    color: 'teal',
  },
];

export default function ManagerMenu() {
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
