'use client';

import { useMemo } from 'react';
import { useAuth } from '@/components/context/AuthContext';
import { useLanguage } from '@/components/context/LanguageContext';
import { QuickActionGrid } from '@/components/dashboard/QuickActionGrid';
import { getQuickActionsForRole } from '@/lib/roleMenus';

export default function BursarDashboard() {
  const { selectedAcademicYear, user } = useAuth();
  const { t } = useLanguage();
  const quickActions = useMemo(() => getQuickActionsForRole('bursar', t), [t]);

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
