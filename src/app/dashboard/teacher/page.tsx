'use client';

import {
  UserGroupIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  BuildingLibraryIcon,
  CalendarIcon,
  BookOpenIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { QuickActionGrid, type QuickAction } from '@/components/dashboard/QuickActionGrid';

const quickActions: QuickAction[] = [
  {
    label: 'Period Roll Call',
    description: 'Take roll call for your current class',
    href: '/dashboard/teacher/period-roll-call',
    icon: ClockIcon,
    color: 'blue',
  },
  {
    label: 'Submit Marks',
    description: 'Enter and submit student marks',
    href: '/dashboard/teacher/submit-marks',
    icon: ClipboardDocumentCheckIcon,
    color: 'green',
  },
  {
    label: 'My Students',
    description: 'Students in your classes',
    href: '/dashboard/teacher/students',
    icon: UserGroupIcon,
    color: 'purple',
  },
  {
    label: 'My Subjects',
    description: 'Subjects & classes you teach',
    href: '/dashboard/teacher/subjects',
    icon: AcademicCapIcon,
    color: 'cyan',
  },
  {
    label: 'Timetable',
    description: 'Your weekly teaching schedule',
    href: '/dashboard/teacher/timetable',
    icon: CalendarIcon,
    color: 'indigo',
  },
  {
    label: 'Logbook',
    description: 'Fill in your teaching logbook',
    href: '/dashboard/teacher/logbook',
    icon: BookOpenIcon,
    color: 'teal',
  },
  {
    label: 'Question Management',
    description: 'Manage your question bank',
    href: '/dashboard/teacher/question-management',
    icon: BuildingLibraryIcon,
    color: 'amber',
  },
  {
    label: 'Exams',
    description: 'Exam papers & schedules',
    href: '/dashboard/teacher/exams',
    icon: BuildingLibraryIcon,
    color: 'rose',
  },
  {
    label: 'Roll Call',
    description: 'General morning roll call',
    href: '/dashboard/teacher/roll-call',
    icon: ClipboardDocumentCheckIcon,
    color: 'blue',
  },
  {
    label: 'Chat',
    description: 'Message staff & parents in real time',
    href: '/dashboard/teacher/chat',
    icon: ChatBubbleLeftRightIcon,
    color: 'green',
  },
  {
    label: 'Inventory',
    description: 'Your stock & transfers',
    href: '/dashboard/teacher/inventory',
    icon: ArchiveBoxIcon,
    color: 'purple',
  },
  {
    label: 'Overview',
    description: 'Your stats at a glance',
    href: '/dashboard/teacher/overview',
    icon: ChartBarIcon,
    color: 'teal',
  },
];

export default function TeacherMenu() {
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
