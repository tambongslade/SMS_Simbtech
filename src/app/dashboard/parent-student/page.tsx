'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/components/context/AuthContext';
import { useLanguage } from '@/components/context/LanguageContext';
import { QuickActionGrid } from '@/components/dashboard/QuickActionGrid';
import { getQuickActionsForRole } from '@/lib/roleMenus';
import ChildPicker from './components/ChildPicker';

export default function ParentStudentMenu() {
  const { selectedAcademicYear, user } = useAuth();
  const { t } = useLanguage();
  const quickActions = useMemo(() => getQuickActionsForRole('parent-student', t), [t]);

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
          {t('Welcome')}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-gray-600 mt-0.5">
          {t('What would you like to do?')}
          {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}
        </p>
      </div>
      <QuickActionGrid actions={quickActions} />
    </div>
  );
}
