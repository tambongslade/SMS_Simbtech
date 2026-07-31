'use client';

import { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  DocumentChartBarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { QuickActionGrid, type QuickAction } from '@/components/dashboard/QuickActionGrid';
import ChildPicker from './components/ChildPicker';

const quickActions: QuickAction[] = [
  {
    label: 'My Children',
    description: "Your children's profiles & results",
    href: '/dashboard/parent-student/children',
    icon: UserGroupIcon,
    color: 'blue',
  },
  {
    label: 'Results & Report Cards',
    description: "Marks, rankings & report card PDFs",
    href: '/dashboard/parent-student/child-snapshot',
    icon: DocumentChartBarIcon,
    color: 'indigo',
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

  // Matricule-based parents (no JWT) land on the full-screen child picker —
  // one profile card per child, like a streaming app. Students and legacy
  // token-holding accounts keep the quick-action menu.
  const [isPortalParent, setIsPortalParent] = useState<boolean | null>(null);
  useEffect(() => {
    setIsPortalParent(!localStorage.getItem('token') && !!localStorage.getItem('parentPortal'));
  }, []);

  if (isPortalParent === null) return null;
  if (isPortalParent) return <ChildPicker />;

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
