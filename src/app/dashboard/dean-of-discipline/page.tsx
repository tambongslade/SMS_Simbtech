'use client';

import {
  ArchiveBoxIcon,
  BanknotesIcon,
  BellIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  DocumentChartBarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { QuickActionGrid, type QuickAction } from '@/components/dashboard/QuickActionGrid';

const quickActions: QuickAction[] = [
  {
    label: 'Morning Roll-Call',
    description: "Record the morning roll-call",
    href: '/dashboard/dean-of-discipline/roll-call',
    icon: ClipboardDocumentCheckIcon,
    color: 'blue',
  },
  {
    label: 'Roll Call',
    description: "The three daily control slots",
    href: '/dashboard/dean-of-discipline/dm-roll-call',
    icon: ClockIcon,
    color: 'indigo',
  },
  {
    label: 'Warnings & Summons',
    description: "Warnings & parent summons",
    href: '/dashboard/dean-of-discipline/warnings-summons',
    icon: BellIcon,
    color: 'amber',
  },
  {
    label: 'DM Assignments',
    description: "Assign DMs to subclasses",
    href: '/dashboard/dean-of-discipline/dm-assignments',
    icon: UserGroupIcon,
    color: 'purple',
  },
  {
    label: 'Teacher Roll Calls',
    description: "Review per-period roll calls",
    href: '/dashboard/dean-of-discipline/teacher-roll-calls',
    icon: ClipboardDocumentCheckIcon,
    color: 'cyan',
  },
  {
    label: 'Disciplinary Actions',
    description: "Record & review incidents",
    href: '/dashboard/dean-of-discipline/disciplinary-actions',
    icon: ClipboardDocumentListIcon,
    color: 'rose',
  },
  {
    label: 'Saturday Punishments',
    description: "Schedule & track punishments",
    href: '/dashboard/dean-of-discipline/punishments',
    icon: CalendarDaysIcon,
    color: 'teal',
  },
  {
    label: 'Broken Property',
    description: "Damaged property charges",
    href: '/dashboard/dean-of-discipline/broken-property',
    icon: BanknotesIcon,
    color: 'green',
  },
  {
    label: 'Report Requests',
    description: "Request student reports",
    href: '/dashboard/dean-of-discipline/report-requests',
    icon: DocumentChartBarIcon,
    color: 'blue',
  },
  {
    label: 'Seized Items',
    description: 'Confiscated items & custody',
    href: '/dashboard/dean-of-discipline/seized-items',
    icon: ClipboardDocumentListIcon,
    color: 'amber',
  },
  {
    label: 'Chat',
    description: "Message staff in real time",
    href: '/dashboard/dean-of-discipline/chat',
    icon: ChatBubbleLeftRightIcon,
    color: 'green',
  },
  {
    label: 'Inventory',
    description: "Your stock & transfers",
    href: '/dashboard/dean-of-discipline/inventory',
    icon: ArchiveBoxIcon,
    color: 'rose',
  },
];

export default function DeanOfDisciplineMenu() {
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
