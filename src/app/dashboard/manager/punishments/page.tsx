'use client';

import { LatenessAlerts, PunishmentRegister } from '@/components/discipline';

export default function ManagerPunishmentsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Saturday Punishments</h1>
        <p className="text-gray-600 mt-1">
          Review 3-strike lateness alerts and manage the punishment register.
        </p>
      </div>
      <LatenessAlerts />
      <PunishmentRegister />
    </div>
  );
}
