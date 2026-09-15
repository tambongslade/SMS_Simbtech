'use client';

import { RollCall } from '@/components/discipline';
import { useLanguage } from '@/components/context/LanguageContext';

export default function ManagerRollCallPage() {
  const { t } = useLanguage();
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('Morning Roll-Call')}</h1>
        <p className="text-gray-600 mt-1">
          {t('Pick a subclass and date, mark who is late or absent, then save — lateness and absences are recorded in one pass.')}
        </p>
      </div>
      <RollCall punishmentsHref="/dashboard/manager/punishments" />
    </div>
  );
}
