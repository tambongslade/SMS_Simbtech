'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { BellAlertIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { Button, Input, Select } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import {
  getRollCall,
  submitRollCall,
  getAbsencesFormData,
  recordLatenessBulk,
  createAbsencesBulk,
  listSubClassOptions,
  todayStr,
  type RollCallData,
  type RollCallStatus,
  type AbsenceFormPeriod,
  type NewAlert,
  type SubClassOption,
} from '@/lib/disciplineApi';

interface RowState {
  status: RollCallStatus;
  arrivalTime: string;
  reason: string;
  actionTaken: string;
  periodIds: number[]; // empty → full-day absence
}

const DEFAULT_ROW: RowState = {
  status: 'PRESENT',
  arrivalTime: '',
  reason: '',
  actionTaken: '',
  periodIds: [],
};

const minutesBetween = (start: string, arrival: string): number | undefined => {
  const [sh, sm] = start.split(':').map(Number);
  const [ah, am] = arrival.split(':').map(Number);
  if ([sh, sm, ah, am].some((n) => isNaN(n))) return undefined;
  return Math.max(0, ah * 60 + am - (sh * 60 + sm));
};

interface RollCallProps {
  // Where the "review alerts" banner should send the DM.
  punishmentsHref: string;
}

export function RollCall({ punishmentsHref }: RollCallProps) {
  const { selectedAcademicYear } = useAuth();

  const [subClasses, setSubClasses] = useState<SubClassOption[]>([]);
  const [subClassId, setSubClassId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState('07:30');

  const [roster, setRoster] = useState<RollCallData | null>(null);
  const [periods, setPeriods] = useState<AbsenceFormPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rowsState, setRowsState] = useState<Record<number, RowState>>({}); // by studentId
  // Students the user has touched this session — only these are submitted so
  // pre-filled rows that are already on the server are left untouched.
  const [dirty, setDirty] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAlerts, setNewAlerts] = useState<NewAlert[]>([]);

  useEffect(() => {
    listSubClassOptions().then((options) => {
      setSubClasses(options);
      if (options.length === 0) {
        toast.error('Could not load the subclass list. Please contact the administrator.');
      }
    });
  }, []);

  const loadRoster = async () => {
    const id = Number(subClassId);
    if (!Number.isFinite(id) || id <= 0) {
      toast.error('Pick a subclass first.');
      return;
    }
    setIsLoading(true);
    setNewAlerts([]);
    try {
      // Primary source of truth for the roster + each student's current status.
      const data = await getRollCall(id, date, selectedAcademicYear?.id);
      // Periods power the per-period absence selection; tolerate roles/days that
      // can't load them by degrading to full-day absences.
      let loadedPeriods: AbsenceFormPeriod[] = [];
      try {
        const form = await getAbsencesFormData(id, date, selectedAcademicYear?.id);
        loadedPeriods = form.periods || [];
      } catch {
        loadedPeriods = [];
      }

      setRoster(data);
      setPeriods(loadedPeriods);
      const initial: Record<number, RowState> = {};
      data.students.forEach((s) => {
        initial[s.studentId] = { ...DEFAULT_ROW, status: s.status || 'PRESENT' };
      });
      setRowsState(initial);
      setDirty(new Set());
    } catch {
      // apiService already toasts the backend message.
      setRoster(null);
      setPeriods([]);
    } finally {
      setIsLoading(false);
    }
  };

  const markDirty = (studentId: number) =>
    setDirty((prev) => (prev.has(studentId) ? prev : new Set(prev).add(studentId)));

  const setRow = (studentId: number, patch: Partial<RowState>) => {
    setRowsState((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || DEFAULT_ROW), ...patch },
    }));
    markDirty(studentId);
  };

  const togglePeriod = (studentId: number, periodId: number) => {
    setRowsState((prev) => {
      const row = prev[studentId] || DEFAULT_ROW;
      const has = row.periodIds.includes(periodId);
      return {
        ...prev,
        [studentId]: {
          ...row,
          periodIds: has ? row.periodIds.filter((p) => p !== periodId) : [...row.periodIds, periodId],
        },
      };
    });
    markDirty(studentId);
  };

  const counts = useMemo(() => {
    const values = Object.values(rowsState);
    return {
      present: values.filter((r) => r.status === 'PRESENT').length,
      late: values.filter((r) => r.status === 'LATE').length,
      absent: values.filter((r) => r.status === 'ABSENT').length,
    };
  }, [rowsState]);

  const handleSubmit = async () => {
    if (!roster) return;

    // Only act on students the user changed this session.
    const changed = roster.students.filter((s) => dirty.has(s.studentId));
    if (changed.length === 0) {
      toast.error('No changes to save — tap a student to mark them late or absent.');
      return;
    }

    const presentEntries = changed.filter((s) => rowsState[s.studentId]?.status === 'PRESENT');
    const lateEntries = changed.filter((s) => rowsState[s.studentId]?.status === 'LATE');
    const absentEntries = changed.filter((s) => rowsState[s.studentId]?.status === 'ABSENT');

    const missingArrival = lateEntries.find((s) => !rowsState[s.studentId].arrivalTime);
    if (missingArrival) {
      toast.error(`Enter the arrival time for ${missingArrival.name}.`);
      return;
    }

    setIsSubmitting(true);
    setNewAlerts([]);
    const messages: string[] = [];
    try {
      // PRESENT → unified roll-call. Idempotent reconcile: clears any existing
      // morning record for a student who turned out to be present after all.
      if (presentEntries.length > 0) {
        const result = await submitRollCall({
          subClassId: Number(subClassId),
          date,
          academicYearId: selectedAcademicYear?.id,
          entries: presentEntries.map((s) => ({ enrollmentId: s.enrollmentId, status: 'PRESENT' as const })),
        });
        messages.push(`${result.updated} marked present`);
      }

      // LATE → lateness-bulk so minutes-late / reason / action and the 3-strike
      // Saturday-punishment alerts survive (the unified endpoint drops them).
      if (lateEntries.length > 0) {
        const result = await recordLatenessBulk({
          date,
          academicYearId: selectedAcademicYear?.id,
          records: lateEntries.map((s) => {
            const row = rowsState[s.studentId];
            return {
              studentId: s.studentId,
              arrivalTime: row.arrivalTime,
              minutesLate: minutesBetween(startTime, row.arrivalTime),
              reason: row.reason.trim() || undefined,
              actionTaken: row.actionTaken.trim() || undefined,
            };
          }),
        });
        messages.push(`${result.successfulRecords} lateness record(s) saved`);
        if (result.failedRecords > 0) {
          toast.error(
            `${result.failedRecords} lateness record(s) failed${
              result.errors?.length
                ? `: ${result.errors.map((e) => e.error || e.message).filter(Boolean).join('; ')}`
                : ''
            }`,
          );
        }
        if (result.newAlerts?.length) setNewAlerts(result.newAlerts);
      }

      // ABSENT → absences-bulk so the per-period selection is preserved.
      if (absentEntries.length > 0) {
        const result = await createAbsencesBulk({
          date,
          subClassId: Number(subClassId),
          academicYearId: selectedAcademicYear?.id,
          absences: absentEntries.map((s) => {
            const row = rowsState[s.studentId];
            return {
              studentId: s.studentId,
              ...(row.periodIds.length > 0 ? { periodIds: row.periodIds } : {}),
            };
          }),
        });
        messages.push(`${result.created} absence row(s) created`);
        if (result.skipped?.length) {
          toast.error(
            `${result.skipped.length} student(s) skipped: ${result.skipped
              .map((sk) => sk.reason)
              .join('; ')}`,
          );
        }
      }

      if (messages.length) toast.success(messages.join(' · '));
      // Reload so the roster reflects the saved statuses and the dirty set clears.
      await loadRoster();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message !== 'Unauthorized') {
        toast.error(message || 'Failed to save roll-call.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const nameById = (studentId: number) =>
    roster?.students.find((s) => s.studentId === studentId)?.name || `Student #${studentId}`;

  return (
    <div className="space-y-4">
      {/* Pickers */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="min-w-[220px]">
          <Select
            label="Subclass *"
            value={subClassId}
            onChange={(e) => setSubClassId(e.target.value)}
            options={[
              { value: '', label: 'Select subclass…' },
              ...subClasses.map((sc) => ({
                value: String(sc.id),
                label: sc.className ? `${sc.className} · ${sc.name}` : sc.name,
              })),
            ]}
          />
        </div>
        <div className="min-w-[160px]">
          <Input label="Date *" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="min-w-[130px]">
          <Input
            label="School start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            helperText="Used to compute minutes late"
          />
        </div>
        <Button color="primary" leftIcon={ClipboardDocumentCheckIcon} isLoading={isLoading} onClick={loadRoster}>
          Load Roster
        </Button>
      </div>

      {/* 3-strike banner from the last submission */}
      {newAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <BellAlertIcon className="h-5 w-5 text-amber-500 mt-0.5" />
            <div className="text-sm text-amber-800">
              <span className="font-semibold">
                {newAlerts.length} new 3-strike alert{newAlerts.length === 1 ? '' : 's'}
              </span>{' '}
              — {newAlerts.map((a) => `${nameById(a.studentId)} (${a.latenessCountInTerm} lates)`).join(', ')}
            </div>
          </div>
          <Link
            href={punishmentsHref}
            className="text-sm font-medium text-amber-800 underline hover:text-amber-900"
          >
            Schedule now →
          </Link>
        </div>
      )}

      {/* Roster */}
      {roster && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-700">
              <span className="font-semibold">
                {roster.subclass.className ? `${roster.subclass.className} · ` : ''}
                {roster.subclass.name}
              </span>{' '}
              — {roster.students.length} students · {counts.present} present · {counts.late} late ·{' '}
              {counts.absent} absent
            </div>
            <Button color="primary" size="sm" isLoading={isSubmitting} onClick={handleSubmit}>
              Save Roll-Call
            </Button>
          </div>

          <div className="divide-y divide-gray-100">
            {roster.students.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">No students in this subclass.</div>
            ) : (
              roster.students.map((s) => {
                const row = rowsState[s.studentId] || DEFAULT_ROW;
                return (
                  <div key={s.enrollmentId} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{s.name}</div>
                        {s.matricule && <div className="text-xs text-gray-400">{s.matricule}</div>}
                      </div>
                      <div className="inline-flex rounded-md border border-gray-200 overflow-hidden text-xs">
                        {(['PRESENT', 'LATE', 'ABSENT'] as RollCallStatus[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setRow(s.studentId, { status: st })}
                            className={`px-3 py-1.5 font-medium ${
                              row.status === st
                                ? st === 'PRESENT'
                                  ? 'bg-emerald-600 text-white'
                                  : st === 'LATE'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-red-600 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {st === 'PRESENT' ? 'Present' : st === 'LATE' ? 'Late' : 'Absent'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Late details */}
                    {row.status === 'LATE' && (
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 bg-amber-50/60 rounded-lg p-3">
                        <Input
                          label="Arrival time *"
                          type="time"
                          value={row.arrivalTime}
                          onChange={(e) => setRow(s.studentId, { arrivalTime: e.target.value })}
                          helperText={
                            row.arrivalTime
                              ? `${minutesBetween(startTime, row.arrivalTime) ?? '—'} min late`
                              : undefined
                          }
                        />
                        <Input
                          label="Reason"
                          value={row.reason}
                          onChange={(e) => setRow(s.studentId, { reason: e.target.value })}
                          placeholder="e.g. Bus broke down"
                        />
                        <Input
                          label="Action taken"
                          value={row.actionTaken}
                          onChange={(e) => setRow(s.studentId, { actionTaken: e.target.value })}
                          placeholder="e.g. Verbal warning"
                        />
                      </div>
                    )}

                    {/* Absence details */}
                    {row.status === 'ABSENT' && (
                      <div className="mt-2 bg-red-50/60 rounded-lg p-3 space-y-2">
                        <div className="text-xs text-gray-600">
                          {row.periodIds.length === 0
                            ? 'Full-day absence. Or pick the missed periods:'
                            : `Absent for ${row.periodIds.length} period(s):`}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {periods.length === 0 ? (
                            <span className="text-xs text-gray-400">
                              No periods on this day — recorded as full-day.
                            </span>
                          ) : (
                            periods.map((p) => {
                              const active = row.periodIds.includes(p.teacherPeriodId);
                              return (
                                <button
                                  key={p.teacherPeriodId}
                                  type="button"
                                  onClick={() => togglePeriod(s.studentId, p.teacherPeriodId)}
                                  title={`${p.subjectName || ''} ${p.teacherName ? `— ${p.teacherName}` : ''}`}
                                  className={`px-2 py-1 rounded text-xs border ${
                                    active
                                      ? 'bg-red-600 text-white border-red-600'
                                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                  }`}
                                >
                                  {p.periodName}
                                  {p.startTime ? ` (${p.startTime})` : ''}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
