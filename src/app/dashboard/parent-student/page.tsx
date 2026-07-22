'use client';

import {
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  DocumentChartBarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { QuickActionGrid, type QuickAction } from '@/components/dashboard/QuickActionGrid';

const quickActions: QuickAction[] = [
  {
    label: 'My Children',
    description: "Your children's profiles & results",
    href: '/dashboard/parent-student/children',
    icon: UserGroupIcon,
    color: 'blue',
  },
  {
    label: 'Chat',
    description: "Message teachers & staff",
    href: '/dashboard/parent-student/chat',
    icon: ChatBubbleLeftRightIcon,
    color: 'green',
  },
  {
    label: 'Analytics',
    description: "Performance analytics",
    href: '/dashboard/parent-student/analytics',
    icon: DocumentChartBarIcon,
    color: 'purple',
  },
  {
    label: 'Settings',
    description: "Account settings",
    href: '/dashboard/parent-student/settings',
    icon: Cog6ToothIcon,
    color: 'amber',
  },
  {
    label: 'Overview',
    description: "Dashboard at a glance",
    href: '/dashboard/parent-student/overview',
    icon: ChartBarIcon,
    color: 'teal',
  },
];

export default function ParentStudentMenu() {
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
