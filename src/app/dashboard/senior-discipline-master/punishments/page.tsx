'use client';

import { LatenessAlerts, PunishmentRegister } from '@/components/discipline';
import { useLanguage } from '@/components/context/LanguageContext';

export default function SeniorDisciplineMasterPunishmentsPage() {
  const { t } = useLanguage();
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('Saturday Punishments')}</h1>
        <p className="text-gray-600 mt-1">
          {t('Review 3-strike lateness alerts and manage the punishment register.')}
        </p>
      </div>
      <LatenessAlerts />
      <PunishmentRegister />
    </div>
  );
}
