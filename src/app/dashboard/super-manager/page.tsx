'use client';

import {
  ArchiveBoxIcon,
  BanknotesIcon,
  BookOpenIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  DocumentChartBarIcon,
  MegaphoneIcon,
  ReceiptRefundIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { QuickActionGrid, type QuickAction } from '@/components/dashboard/QuickActionGrid';

const quickActions: QuickAction[] = [
  {
    label: 'Personnel Management',
    description: "Manage all staff accounts",
    href: '/dashboard/super-manager/personnel-management',
    icon: UserGroupIcon,
    color: 'blue',
  },
  {
    label: 'Classes & Subclasses',
    description: "Manage classes & subclasses",
    href: '/dashboard/super-manager/classes',
    icon: BuildingLibraryIcon,
    color: 'indigo',
  },
  {
    label: 'Student Management',
    description: "Manage all students",
    href: '/dashboard/super-manager/student-management',
    icon: UserGroupIcon,
    color: 'purple',
  },
  {
    label: 'Subject Management',
    description: "Manage subjects",
    href: '/dashboard/super-manager/subject-management',
    icon: BookOpenIcon,
    color: 'teal',
  },
  {
    label: 'Fees Management',
    description: "Fees & payments",
    href: '/dashboard/super-manager/fees-management',
    icon: CurrencyDollarIcon,
    color: 'green',
  },
  {
    label: 'Fee Audit & Control',
    description: "Audit fee records",
    href: '/dashboard/super-manager/fee-comparison',
    icon: ClipboardDocumentCheckIcon,
    color: 'cyan',
  },
  {
    label: 'Expense Requisition',
    description: "Approvals & verifications",
    href: '/dashboard/super-manager/finance-requests',
    icon: BanknotesIcon,
    color: 'amber',
  },
  {
    label: 'Expenditures',
    description: "Review school spending",
    href: '/dashboard/super-manager/expenditures',
    icon: ReceiptRefundIcon,
    color: 'rose',
  },
  {
    label: 'Discipline Overview',
    description: "Read-only discipline analytics",
    href: '/dashboard/super-manager/overview?module=discipline',
    icon: ClipboardDocumentListIcon,
    color: 'amber',
  },
  {
    label: 'Teacher Roll Calls',
    description: "Review per-period roll calls",
    href: '/dashboard/super-manager/teacher-roll-calls',
    icon: ClipboardDocumentCheckIcon,
    color: 'blue',
  },
  {
    label: 'Examination Structure',
    description: "Terms, sequences & exams",
    href: '/dashboard/super-manager/examination-structure',
    icon: CalendarDaysIcon,
    color: 'indigo',
  },
  {
    label: 'Marks Management',
    description: "Manage student marks",
    href: '/dashboard/super-manager/marks-management',
    icon: ClipboardDocumentCheckIcon,
    color: 'purple',
  },
  {
    label: 'Report Card Generation',
    description: "Generate report cards",
    href: '/dashboard/super-manager/report-card-generation',
    icon: DocumentChartBarIcon,
    color: 'teal',
  },
  {
    label: 'Academic Year',
    description: "Academic year setup",
    href: '/dashboard/super-manager/academic-years',
    icon: CalendarIcon,
    color: 'green',
  },
  {
    label: 'Timetable',
    description: "Timetable management",
    href: '/dashboard/super-manager/timetable',
    icon: CalendarIcon,
    color: 'cyan',
  },
  {
    label: 'Communication',
    description: "Announcements & notifications",
    href: '/dashboard/super-manager/communication',
    icon: MegaphoneIcon,
    color: 'amber',
  },
  {
    label: 'Settings',
    description: "System settings",
    href: '/dashboard/super-manager/settings',
    icon: Cog6ToothIcon,
    color: 'rose',
  },
  {
    label: 'Chat',
    description: "Message staff in real time",
    href: '/dashboard/super-manager/chat',
    icon: ChatBubbleLeftRightIcon,
    color: 'green',
  },
  {
    label: 'Inventory',
    description: "Catalog, grants & transfers",
    href: '/dashboard/super-manager/inventory',
    icon: ArchiveBoxIcon,
    color: 'blue',
  },
  {
    label: 'Overview',
    description: "System stats at a glance",
    href: '/dashboard/super-manager/overview',
    icon: ChartBarIcon,
    color: 'teal',
  },
];

export default function SuperManagerMenu() {
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
