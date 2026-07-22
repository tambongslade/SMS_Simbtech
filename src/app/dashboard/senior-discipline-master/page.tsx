'use client';

import {
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  DocumentChartBarIcon,
  BellIcon,
  ClockIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { QuickActionGrid, type QuickAction } from '@/components/dashboard/QuickActionGrid';

const quickActions: QuickAction[] = [
  {
    label: 'Morning Roll-Call',
    description: 'Record the morning roll-call',
    href: '/dashboard/senior-discipline-master/roll-call',
    icon: ClipboardDocumentCheckIcon,
    color: 'blue',
  },
  {
    label: 'Slot Roll Call (2/5/8)',
    description: 'Record the three daily control slots',
    href: '/dashboard/senior-discipline-master/dm-roll-call',
    icon: ClockIcon,
    color: 'indigo',
  },
  {
    label: 'Warnings & Summons',
    description: 'Follow up warnings & parent summons',
    href: '/dashboard/senior-discipline-master/warnings-summons',
    icon: BellIcon,
    color: 'amber',
  },
  {
    label: 'Disciplinary Actions',
    description: 'Record & review incidents',
    href: '/dashboard/senior-discipline-master/disciplinary-actions',
    icon: ClipboardDocumentListIcon,
    color: 'rose',
  },
  {
    label: 'Saturday Punishments',
    description: 'Schedule & track punishments',
    href: '/dashboard/senior-discipline-master/punishments',
    icon: CalendarDaysIcon,
    color: 'purple',
  },
  {
    label: 'Broken Property',
    description: 'Track damaged property charges',
    href: '/dashboard/senior-discipline-master/broken-property',
    icon: BanknotesIcon,
    color: 'cyan',
  },
  {
    label: 'Students',
    description: 'Per-student discipline records',
    href: '/dashboard/senior-discipline-master/students',
    icon: UserGroupIcon,
    color: 'blue',
  },
  {
    label: 'Report Requests',
    description: 'Request & review student reports',
    href: '/dashboard/senior-discipline-master/report-requests',
    icon: DocumentChartBarIcon,
    color: 'teal',
  },
  {
    label: 'DM Assignments',
    description: 'Assign DMs to their subclasses',
    href: '/dashboard/senior-discipline-master/dm-assignments',
    icon: UserGroupIcon,
    color: 'indigo',
  },
  {
    label: 'Chat',
    description: 'Message staff in real time',
    href: '/dashboard/senior-discipline-master/chat',
    icon: ChatBubbleLeftRightIcon,
    color: 'green',
  },
];

export default function SeniorDisciplineMasterMenu() {
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
