'use client';

import {
  ArchiveBoxIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { QuickActionGrid, type QuickAction } from '@/components/dashboard/QuickActionGrid';

const quickActions: QuickAction[] = [
  {
    label: 'Control Fee Management',
    description: "Record & verify control fees",
    href: '/dashboard/controller/fee-management',
    icon: ClipboardDocumentCheckIcon,
    color: 'blue',
  },
  {
    label: 'Chat',
    description: "Message staff in real time",
    href: '/dashboard/controller/chat',
    icon: ChatBubbleLeftRightIcon,
    color: 'green',
  },
  {
    label: 'Inventory',
    description: "Your stock & transfers",
    href: '/dashboard/controller/inventory',
    icon: ArchiveBoxIcon,
    color: 'purple',
  },
];

export default function ControllerMenu() {
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
