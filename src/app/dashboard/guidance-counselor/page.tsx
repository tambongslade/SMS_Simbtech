'use client';

import {
  ArchiveBoxIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { QuickActionGrid, type QuickAction } from '@/components/dashboard/QuickActionGrid';

const quickActions: QuickAction[] = [
  {
    label: 'Students',
    description: "Student profiles & counseling",
    href: '/dashboard/guidance-counselor/students',
    icon: UserGroupIcon,
    color: 'blue',
  },
  {
    label: 'Remarks',
    description: "Student remarks",
    href: '/dashboard/guidance-counselor/remarks',
    icon: ClipboardDocumentCheckIcon,
    color: 'purple',
  },
  {
    label: 'Behavior',
    description: "Behavior monitoring",
    href: '/dashboard/guidance-counselor/behavior',
    icon: BuildingLibraryIcon,
    color: 'amber',
  },
  {
    label: 'Chat',
    description: "Message staff in real time",
    href: '/dashboard/guidance-counselor/chat',
    icon: ChatBubbleLeftRightIcon,
    color: 'green',
  },
  {
    label: 'Inventory',
    description: "Your stock & transfers",
    href: '/dashboard/guidance-counselor/inventory',
    icon: ArchiveBoxIcon,
    color: 'rose',
  },
  {
    label: 'Overview',
    description: "Counseling stats at a glance",
    href: '/dashboard/guidance-counselor/overview',
    icon: ChartBarIcon,
    color: 'teal',
  },
];

export default function GuidanceCounselorMenu() {
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
