'use client';

import {
  ArchiveBoxIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { QuickActionGrid, type QuickAction } from '@/components/dashboard/QuickActionGrid';

const quickActions: QuickAction[] = [
  {
    label: 'Schemes of Work',
    description: "Review teacher schemes of work",
    href: '/dashboard/dean-of-studies/schemes-of-work',
    icon: BookOpenIcon,
    color: 'blue',
  },
  {
    label: 'Logbook Review',
    description: "Review teacher logbooks",
    href: '/dashboard/dean-of-studies/teacher-logbook',
    icon: ClipboardDocumentCheckIcon,
    color: 'purple',
  },
  {
    label: 'Chat',
    description: "Message staff in real time",
    href: '/dashboard/dean-of-studies/chat',
    icon: ChatBubbleLeftRightIcon,
    color: 'green',
  },
  {
    label: 'Inventory',
    description: "Your stock & transfers",
    href: '/dashboard/dean-of-studies/inventory',
    icon: ArchiveBoxIcon,
    color: 'amber',
  },
];

export default function DeanOfStudiesMenu() {
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
