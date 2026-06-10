'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui';
import {
  getPeriodRollCall,
  submitPeriodRollCall,
  type PeriodRollCallData,
  type PeriodRollCallStatus,
} from '@/lib/disciplineApi';

interface PeriodRollCallProps {
  teacherPeriodId: number;
  // Called after a successful save (e.g. to close a modal / refresh a list).
  onSaved?: () => void;
}

// In-class roll call for a single teacher period: PRESENT | ABSENT only.
export function PeriodRollCall({ teacherPeriodId, onSaved }: PeriodRollCallProps) {
  const [data, setData] = useState<PeriodRollCallData | null>(null);
  const [statuses, setStatuses] = useState<Record<number, PeriodRollCallStatus>>({}); // by enrollmentId
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getPeriodRollCall(teacherPeriodId);
      setData(res);
      const initial: Record<number, PeriodRollCallStatus> = {};
      res.students.forEach((s) => {
        initial[s.enrollmentId] = s.status ?? 'PRESENT';
      });
      setStatuses(initial);
    } catch {
      // apiService already toasts the backend message (incl. 403 not-owner).
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [teacherPeriodId]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = (enrollmentId: number, status: PeriodRollCallStatus) =>
    setStatuses((prev) => ({ ...prev, [enrollmentId]: status }));

  const counts = useMemo(() => {
    const values = Object.values(statuses);
    return {
      present: values.filter((s) => s === 'PRESENT').length,
      absent: values.filter((s) => s === 'ABSENT').length,
    };
  }, [statuses]);

  const handleSubmit = async () => {
    if (!data) return;
    setIsSubmitting(true);
    try {
      // The endpoint is idempotent, so we send the full roster every time.
      const result = await submitPeriodRollCall(
        teacherPeriodId,
        data.students.map((s) => ({
          enrollmentId: s.enrollmentId,
          status: statuses[s.enrollmentId] ?? 'PRESENT',
        })),
      );
      toast.success(
        `Roll call saved — ${result.updated} recorded${
          result.skipped?.length ? `, ${result.skipped.length} skipped` : ''
        }.`,
      );
      onSaved?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message !== 'Unauthorized') {
        toast.error(message || 'Failed to save roll call.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-gray-500">Loading roster…</div>;
  }

  if (!data) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        Could not load this period’s roster.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-700">
          <span className="font-semibold">
            {data.subClass.className ? `${data.subClass.className} · ` : ''}
            {data.subClass.name}
          </span>{' '}
          — {data.subject.name} · {data.period.startTime}–{data.period.endTime}
          <div className="text-xs text-gray-500 mt-0.5">
            {data.students.length} students · {counts.present} present · {counts.absent} absent
          </div>
        </div>
        <Button color="primary" size="sm" isLoading={isSubmitting} onClick={handleSubmit}>
          Save Roll Call
        </Button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
        {data.students.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">No students enrolled in this period.</div>
        ) : (
          data.students.map((s) => {
            const status = statuses[s.enrollmentId] ?? 'PRESENT';
            return (
              <div key={s.enrollmentId} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">{s.fullName}</div>
                  {s.matricule && <div className="text-xs text-gray-400">{s.matricule}</div>}
                </div>
                <div className="inline-flex rounded-md border border-gray-200 overflow-hidden text-xs">
                  {(['PRESENT', 'ABSENT'] as PeriodRollCallStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(s.enrollmentId, st)}
                      className={`px-4 py-1.5 font-medium ${
                        status === st
                          ? st === 'PRESENT'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-red-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {st === 'PRESENT' ? 'Present' : 'Absent'}
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
