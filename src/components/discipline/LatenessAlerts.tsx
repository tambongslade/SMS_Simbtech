'use client';

import { useCallback, useEffect, useState } from 'react';
import { BellAlertIcon, ArrowPathIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import { getLatenessAlerts, type LatenessAlert } from '@/lib/disciplineApi';
import { SchedulePunishmentModal, type PunishmentPrefill } from './SchedulePunishmentModal';

interface LatenessAlertsProps {
  // Called after a punishment is scheduled so parent views can refresh.
  onScheduled?: () => void;
}

/**
 * "Pending punishments" widget — term-scoped 3-strike lateness alerts,
 * excluding students who already have a Saturday punishment scheduled.
 */
export function LatenessAlerts({ onScheduled }: LatenessAlertsProps) {
  const { selectedAcademicYear } = useAuth();
  const [alerts, setAlerts] = useState<LatenessAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [prefill, setPrefill] = useState<PunishmentPrefill | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setAlerts(await getLatenessAlerts(selectedAcademicYear?.id));
    } catch {
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAcademicYear?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const openSchedule = (alert: LatenessAlert) => {
    setPrefill({
      studentId: alert.student.id,
      studentName: alert.student.name,
      reason: `${alert.latenessCountInTerm} lates in ${alert.term?.name || 'the current term'}`,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellAlertIcon className={`h-6 w-6 ${alerts.length ? 'text-amber-500' : 'text-gray-300'}`} />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">3-Strike Alerts</h2>
            <p className="text-sm text-gray-500">
              Students owing a Saturday punishment for repeated lateness this term.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" leftIcon={ArrowPathIcon} onClick={load} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500 py-6">Loading alerts…</div>
      ) : alerts.length === 0 ? (
        <div className="text-center text-gray-500 py-6">
          No pending alerts — everyone is caught up. 🎉
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {alerts.map((a) => (
            <div key={a.enrollmentId} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {a.student.name}
                  {a.student.matricule && (
                    <span className="text-gray-400 font-normal"> · {a.student.matricule}</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {[a.className, a.subClassName].filter(Boolean).join(' · ')}
                  {a.term?.name ? ` — ${a.term.name}` : ''}
                </div>
                <div className="text-xs mt-0.5">
                  <span className="text-amber-700 font-medium">
                    {a.latenessCountInTerm} lates this term
                  </span>
                  <span className="text-gray-400">
                    {' '}
                    · {a.pendingPunishmentsScheduled} scheduled · owes {a.punishmentsOwed}
                  </span>
                </div>
              </div>
              <Button size="xs" color="warning" leftIcon={CalendarDaysIcon} onClick={() => openSchedule(a)}>
                Schedule
              </Button>
            </div>
          ))}
        </div>
      )}

      <SchedulePunishmentModal
        isOpen={!!prefill}
        prefill={prefill}
        onClose={() => setPrefill(null)}
        onCreated={() => {
          load();
          onScheduled?.();
        }}
      />
    </div>
  );
}
