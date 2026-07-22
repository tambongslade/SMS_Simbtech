'use client';

import {
  AcademicCapIcon,
  ArchiveBoxIcon,
  BookOpenIcon,
  CalendarIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  DocumentChartBarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { QuickActionGrid, type QuickAction } from '@/components/dashboard/QuickActionGrid';

const quickActions: QuickAction[] = [
  {
    label: 'Department Staff',
    description: "Teachers in your department",
    href: '/dashboard/hod/staff',
    icon: UserGroupIcon,
    color: 'blue',
  },
  {
    label: 'Period Tracking',
    description: "Track department periods",
    href: '/dashboard/hod/periods',
    icon: CalendarIcon,
    color: 'indigo',
  },
  {
    label: 'Curriculum',
    description: "Department curriculum",
    href: '/dashboard/hod/curriculum',
    icon: AcademicCapIcon,
    color: 'purple',
  },
  {
    label: 'Schemes of Work',
    description: "Review schemes of work",
    href: '/dashboard/hod/schemes-of-work',
    icon: BookOpenIcon,
    color: 'teal',
  },
  {
    label: 'Logbook Review',
    description: "Review teacher logbooks",
    href: '/dashboard/hod/teacher-logbook',
    icon: ClipboardDocumentCheckIcon,
    color: 'cyan',
  },
  {
    label: 'Performance',
    description: "Department performance",
    href: '/dashboard/hod/performance',
    icon: DocumentChartBarIcon,
    color: 'amber',
  },
  {
    label: 'Chat',
    description: "Message staff in real time",
    href: '/dashboard/hod/chat',
    icon: ChatBubbleLeftRightIcon,
    color: 'green',
  },
  {
    label: 'Inventory',
    description: "Your stock & transfers",
    href: '/dashboard/hod/inventory',
    icon: ArchiveBoxIcon,
    color: 'rose',
  },
  {
    label: 'Overview',
    description: "Department stats at a glance",
    href: '/dashboard/hod/overview',
    icon: ChartBarIcon,
    color: 'teal',
  },
];

export default function HodMenu() {
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
