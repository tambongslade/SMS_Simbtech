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
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { QuickActionGrid, type QuickAction } from '@/components/dashboard/QuickActionGrid';

const quickActions: QuickAction[] = [
  {
    label: 'Morning Roll-Call',
    description: 'Record the morning roll-call',
    href: '/dashboard/discipline-master/roll-call',
    icon: ClipboardDocumentCheckIcon,
    color: 'blue',
  },
  {
    label: 'Slot Roll Call (2/5/8)',
    description: 'Record the three daily control slots',
    href: '/dashboard/discipline-master/dm-roll-call',
    icon: ClockIcon,
    color: 'indigo',
  },
  {
    label: 'Warnings & Summons',
    description: 'Follow up warnings & parent summons',
    href: '/dashboard/discipline-master/warnings-summons',
    icon: BellIcon,
    color: 'amber',
  },
  {
    label: 'Attendance & Lateness',
    description: 'Absences, lateness & excuses',
    href: '/dashboard/discipline-master/attendance',
    icon: ClipboardDocumentListIcon,
    color: 'cyan',
  },
  {
    label: 'Disciplinary Actions',
    description: 'Record & review incidents',
    href: '/dashboard/discipline-master/disciplinary-actions',
    icon: ClipboardDocumentListIcon,
    color: 'rose',
  },
  {
    label: 'Saturday Punishments',
    description: 'Schedule & track punishments',
    href: '/dashboard/discipline-master/punishments',
    icon: CalendarDaysIcon,
    color: 'purple',
  },
  {
    label: 'Broken Property',
    description: 'Track damaged property charges',
    href: '/dashboard/discipline-master/broken-property',
    icon: BanknotesIcon,
    color: 'teal',
  },
  {
    label: 'Report Requests',
    description: 'Request & review student reports',
    href: '/dashboard/discipline-master/report-requests',
    icon: DocumentChartBarIcon,
    color: 'green',
  },
  {
    label: 'Student Profiles',
    description: 'Browse student discipline profiles',
    href: '/dashboard/discipline-master/students',
    icon: UserGroupIcon,
    color: 'blue',
  },
  {
    label: 'Reports',
    description: 'Discipline reports & exports',
    href: '/dashboard/discipline-master/reports',
    icon: DocumentChartBarIcon,
    color: 'purple',
  },
  {
    label: 'Seized Items',
    description: 'Confiscated items & custody',
    href: '/dashboard/discipline-master/seized-items',
    icon: ClipboardDocumentListIcon,
    color: 'amber',
  },
  {
    label: 'Chat',
    description: 'Message staff in real time',
    href: '/dashboard/discipline-master/chat',
    icon: ChatBubbleLeftRightIcon,
    color: 'green',
  },
  {
    label: 'Overview',
    description: 'Dashboard stats & analytics',
    href: '/dashboard/discipline-master/overview',
    icon: ChartBarIcon,
    color: 'indigo',
  },
];

export default function DisciplineMasterMenu() {
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
