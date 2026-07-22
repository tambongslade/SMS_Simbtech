'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import {
  type PeriodRollCallData,
  type TeacherRollCallStatus,
  type TeacherRollCallSummary,
  getCurrentPeriod,
  getPeriodRollCall,
  submitRollCall,
  listMyRollCalls,
} from '@/lib/teacherRollCallApi';

const STATUS_OPTIONS: { value: TeacherRollCallStatus; label: string; active: string; idle: string }[] = [
  { value: 'PRESENT', label: 'Present', active: 'bg-green-600 text-white', idle: 'bg-green-50 text-green-700 hover:bg-green-100' },
  { value: 'LATE', label: 'Late', active: 'bg-yellow-500 text-white', idle: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
  { value: 'ABSENT', label: 'Absent', active: 'bg-red-600 text-white', idle: 'bg-red-50 text-red-700 hover:bg-red-100' },
];

function PeriodRollCallInner() {
  const searchParams = useSearchParams();
  const requestedPeriodId = searchParams.get('teacherPeriodId');

  const [data, setData] = useState<PeriodRollCallData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statuses, setStatuses] = useState<Record<number, TeacherRollCallStatus>>({});
  const [entryNotes, setEntryNotes] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [recent, setRecent] = useState<TeacherRollCallSummary[]>([]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = requestedPeriodId
        ? await getPeriodRollCall(Number(requestedPeriodId))
        : await getCurrentPeriod();
      setData(result);
      // Default everyone to PRESENT — only absentees need marking
      const next: Record<number, TeacherRollCallStatus> = {};
      const nextNotes: Record<number, string> = {};
      result.roster.forEach(r => {
        next[r.enrollmentId] = r.status ?? 'PRESENT';
        if (r.entry?.notes) nextNotes[r.enrollmentId] = r.entry.notes;
      });
      setStatuses(next);
      setEntryNotes(nextNotes);
      setNotes(result.rollCall?.notes || '');
    } catch (error: any) {
      toast.error(error.message || 'Failed to load your current period.');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [requestedPeriodId]);

  const loadRecent = useCallback(async () => {
    const from = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    try {
      setRecent(await listMyRollCalls({ from, limit: 30 }));
    } catch { /* recent list is best-effort */ }
  }, []);

  useEffect(() => { load(); loadRecent(); }, [load, loadRecent]);

  const counts = useMemo(() => {
    const c = { PRESENT: 0, LATE: 0, ABSENT: 0 };
    (data?.roster || []).forEach(r => { c[statuses[r.enrollmentId] || 'PRESENT'] += 1; });
    return c;
  }, [data, statuses]);

  const handleSubmit = async () => {
    if (!data?.period) return;
    setIsSubmitting(true);
    try {
      await submitRollCall({
        teacherPeriodId: data.period.teacherPeriodId,
        notes: notes || undefined,
        entries: (data.roster || []).map(r => ({
          enrollmentId: r.enrollmentId,
          status: statuses[r.enrollmentId] || 'PRESENT',
          notes: entryNotes[r.enrollmentId] || undefined,
        })),
      });
      toast.success(data.rollCall ? 'Roll call updated.' : 'Roll call recorded.');
      load();
      loadRecent();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit roll call.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Period Roll Call</h1>
          <p className="text-sm text-gray-500 mt-1">
            {requestedPeriodId ? 'Selected period' : 'Auto-detected from your timetable'}
          </p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm">
          <ArrowPathIcon className="w-4 h-4" /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Checking your timetable…</div>
      ) : !data?.period ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <ClockIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No class right now</p>
          <p className="text-sm text-gray-400 mt-1">
            When one of your timetable periods is in progress, the roster will appear here automatically.
          </p>
        </div>
      ) : (
        <>
          {/* Period card */}
          <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900">
                {data.period.subject?.name} — {data.period.subClass?.class?.name} {data.period.subClass?.name}
              </p>
              <p className="text-xs text-gray-500">
                {data.period.periodName || 'Period'} · {data.period.startTime}–{data.period.endTime}
                {data.rollCall && (
                  <span className="inline-flex items-center gap-1 ml-2 text-green-700">
                    <CheckCircleIcon className="w-3.5 h-3.5" /> Already recorded — saving replaces it
                  </span>
                )}
              </p>
            </div>
            <div className="text-xs text-gray-600 flex gap-3">
              <span className="text-green-700">{counts.PRESENT} present</span>
              <span className="text-yellow-700">{counts.LATE} late</span>
              <span className="text-red-700">{counts.ABSENT} absent</span>
            </div>
          </div>

          {/* Roster */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {data.roster.map(r => {
                const status = statuses[r.enrollmentId] || 'PRESENT';
                return (
                  <li key={r.enrollmentId} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{r.student.name}</p>
                        <p className="text-xs text-gray-500">{r.student.matricule || '—'}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {STATUS_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setStatuses(prev => ({ ...prev, [r.enrollmentId]: opt.value }))}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${status === opt.value ? opt.active : opt.idle}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {status !== 'PRESENT' && (
                      <input
                        type="text"
                        value={entryNotes[r.enrollmentId] || ''}
                        onChange={e => setEntryNotes(prev => ({ ...prev, [r.enrollmentId]: e.target.value }))}
                        placeholder="Note (optional, e.g. sent home sick)"
                        className="mt-2 w-full px-3 py-1.5 border border-gray-200 rounded-md text-xs"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="px-4 py-3 border-t border-gray-200 space-y-3">
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Roll call notes (optional, e.g. 3 late after break)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || data.roster.length === 0}
                  className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {isSubmitting ? 'Saving…' : data.rollCall ? 'Update Roll Call' : 'Submit Roll Call'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Recent roll calls */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-900">My recent roll calls (7 days)</div>
        {recent.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">No roll calls recorded in the last 7 days.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {recent.map(rc => {
              const absent = (rc.entries || []).filter(e => e.status === 'ABSENT').length;
              const late = (rc.entries || []).filter(e => e.status === 'LATE').length;
              return (
                <li key={rc.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {rc.teacherPeriod?.subject?.name} — {rc.teacherPeriod?.subClass?.class?.name} {rc.teacherPeriod?.subClass?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(rc.date).toLocaleDateString()} · {rc._count?.entries ?? 0} students
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0 text-xs">
                    {absent > 0 && <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full">{absent} absent</span>}
                    {late > 0 && <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full">{late} late</span>}
                    {absent === 0 && late === 0 && <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full">all present</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function PeriodRollCallPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading…</div>}>
      <PeriodRollCallInner />
    </Suspense>
  );
}
