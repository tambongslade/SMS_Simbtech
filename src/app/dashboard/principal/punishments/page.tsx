'use client';

import { LatenessAlerts, PunishmentRegister } from '@/components/discipline';
import { useState } from 'react';
import { useLanguage } from '@/components/context/LanguageContext';

export default function PrincipalPunishmentsPage() {
  const { t } = useLanguage();
  // Reload the register when a punishment is scheduled from the alerts panel.
  const [registerVersion, setRegisterVersion] = useState(0);
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('Saturday Punishments')}</h1>
        <p className="text-gray-600 mt-1">
          {t('Review 3-strike lateness alerts and manage the punishment register.')}
        </p>
      </div>
      <LatenessAlerts onScheduled={() => setRegisterVersion((v) => v + 1)} />
      <PunishmentRegister refreshToken={registerVersion} />
    </div>
  );
}
