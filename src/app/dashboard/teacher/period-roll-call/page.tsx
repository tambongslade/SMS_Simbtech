'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, ClockIcon, CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import {
  type PeriodRollCallData,
  type TeacherRollCallStatus,
  type TeacherRollCallSummary,
  type TodayPeriod,
  getCurrentPeriod,
  getPeriodRollCall,
  getMyPeriodsForToday,
  submitRollCall,
  listMyRollCalls,
} from '@/lib/teacherRollCallApi';
import { useLanguage } from '@/components/context/LanguageContext';

const STATUS_OPTIONS: { value: TeacherRollCallStatus; label: string; active: string; idle: string }[] = [
  { value: 'PRESENT', label: 'Present', active: 'bg-green-600 text-white', idle: 'bg-green-50 text-green-700 hover:bg-green-100' },
  { value: 'LATE', label: 'Late', active: 'bg-yellow-500 text-white', idle: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
  { value: 'ABSENT', label: 'Absent', active: 'bg-red-600 text-white', idle: 'bg-red-50 text-red-700 hover:bg-red-100' },
];
// Labels above are translated via t() at render time.

// "ends in 23 min" chip from the period's HH:mm end time vs the client clock
const minutesToEnd = (endTime?: string): number | null => {
  if (!endTime) return null;
  const [h, m] = endTime.split(':').map(Number);
  if (Number.isNaN(h)) return null;
  const end = new Date();
  end.setHours(h, m || 0, 0, 0);
  const mins = Math.round((end.getTime() - Date.now()) / 60000);
  return mins >= 0 ? mins : null;
};

// Classify a period vs. now: past / current / upcoming.
type PeriodPhase = 'past' | 'current' | 'upcoming';
const phaseFor = (startTime?: string, endTime?: string): PeriodPhase => {
  if (!startTime || !endTime) return 'upcoming';
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMin = sh * 60 + (sm || 0);
  const endMin = eh * 60 + (em || 0);
  if (nowMin < startMin) return 'upcoming';
  if (nowMin >= endMin) return 'past';
  return 'current';
};

const phaseLabel = (p: PeriodPhase) => (p === 'current' ? 'Now' : p === 'past' ? 'Done' : 'Later');
const phaseClasses = (p: PeriodPhase) =>
  p === 'current'
    ? 'bg-blue-100 text-blue-700 border-blue-200'
    : p === 'past'
    ? 'bg-gray-100 text-gray-600 border-gray-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';

const relativeStart = (n: { isToday: boolean; minutesToStart: number | null; dayOfWeek: string }): string => {
  if (n.isToday && n.minutesToStart != null) {
    if (n.minutesToStart >= 60) {
      const h = Math.floor(n.minutesToStart / 60);
      return `in ${h}h ${n.minutesToStart % 60}m`;
    }
    return `in ${n.minutesToStart} min`;
  }
  const day = (n.dayOfWeek || '').toLowerCase();
  return day ? day.charAt(0).toUpperCase() + day.slice(1) : '';
};

function PeriodRollCallInner() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedPeriodId = searchParams.get('teacherPeriodId');

  const [data, setData] = useState<PeriodRollCallData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statuses, setStatuses] = useState<Record<number, TeacherRollCallStatus>>({});
  const [entryNotes, setEntryNotes] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [recent, setRecent] = useState<TeacherRollCallSummary[]>([]);
  const [todayPeriods, setTodayPeriods] = useState<TodayPeriod[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);

  const loadToday = useCallback(async () => {
    setLoadingToday(true);
    try {
      setTodayPeriods(await getMyPeriodsForToday());
    } catch {
      setTodayPeriods([]);
    } finally {
      setLoadingToday(false);
    }
  }, []);

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
      toast.error(error.message || t('Failed to load your current period.'));
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

  useEffect(() => { load(); loadRecent(); loadToday(); }, [load, loadRecent, loadToday]);

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
      toast.success(data.rollCall ? t('Roll call updated.') : t('Roll call recorded.'));
      load();
      loadRecent();
    } catch (error: any) {
      toast.error(error.message || t('Failed to submit roll call.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('Period Roll Call')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {requestedPeriodId ? t('Selected period') : t('Auto-detected from your timetable')}
          </p>
        </div>
        <button onClick={() => { load(); loadToday(); }} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm">
          <ArrowPathIcon className="w-4 h-4" /> {t('Refresh')}
        </button>
      </div>

      {/* Today's schedule — periods in start-time order so teacher can jump to any one */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-sm text-gray-900">{t("Today's Periods")}</span>
          <span className="text-xs text-gray-400">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>
        {loadingToday ? (
          <div className="p-4 text-sm text-gray-500">{t('Loading your schedule…')}</div>
        ) : todayPeriods.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">{t('No periods scheduled for you today.')}</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {todayPeriods.map(p => {
              const phase = phaseFor(p.startTime, p.endTime);
              const isSelected = Number(requestedPeriodId) === p.teacherPeriodId;
              const recorded = p.rollCallId != null;
              return (
                <li key={p.teacherPeriodId}>
                  <button
                    onClick={() => router.push(`/dashboard/teacher/period-roll-call?teacherPeriodId=${p.teacherPeriodId}`)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/60' : ''}`}
                  >
                    <div className="w-16 shrink-0 text-center">
                      <div className="text-sm font-semibold text-gray-800 tabular-nums">{p.startTime}</div>
                      <div className="text-[10px] text-gray-400 tabular-nums">–{p.endTime}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.subject?.name || t('Class')} — {p.subClass?.class?.name} {p.subClass?.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {p.periodName || t('Period')}
                        {recorded && (
                          <span className="ml-2 inline-flex items-center gap-1 text-green-700">
                            <CheckCircleIcon className="w-3 h-3" /> {t('Recorded')}
                            {p.absent > 0 && <span className="text-red-600 ml-1">· {p.absent} {t('absent')}</span>}
                            {p.late > 0 && <span className="text-yellow-700 ml-1">· {p.late} {t('late')}</span>}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${phaseClasses(phase)}`}>
                      {phaseLabel(phase)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">{t('Checking your timetable…')}</div>
      ) : !data?.period ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <ClockIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">{t('No class right now')}</p>
          <p className="text-sm text-gray-400 mt-1">
            {t('When one of your timetable periods is in progress, the roster will appear here automatically.')}
          </p>
        </div>
      ) : (
        <>
          {/* Period card — "Mathematics • Form 3A • 42 students" */}
          <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900">
                {data.period.subject?.name} — {data.period.subClass?.class?.name} {data.period.subClass?.name}
                <span className="text-gray-400 font-normal"> · {data.totalStudents || data.roster.length} {t('students')}</span>
              </p>
              <p className="text-xs text-gray-500">
                {data.period.periodName || t('Period')} · {data.period.startTime}–{data.period.endTime}
                {(() => {
                  const mins = minutesToEnd(data.period?.endTime);
                  return mins != null ? (
                    <span className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                      <ClockIcon className="w-3 h-3" /> {t('ends in')} {mins} {t('min')}
                    </span>
                  ) : null;
                })()}
                {data.rollCall && (
                  <span className="inline-flex items-center gap-1 ml-2 text-green-700">
                    <CheckCircleIcon className="w-3.5 h-3.5" /> {t('Already recorded — saving replaces it')}
                  </span>
                )}
              </p>
            </div>
            <div className="text-xs text-gray-600 flex gap-3">
              <span className="text-green-700">{counts.PRESENT} {t('present')}</span>
              <span className="text-yellow-700">{counts.LATE} {t('late')}</span>
              <span className="text-red-700">{counts.ABSENT} {t('absent')}</span>
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
                            {t(opt.label)}
                          </button>
                        ))}
                      </div>
                    </div>
                    {status !== 'PRESENT' && (
                      <input
                        type="text"
                        value={entryNotes[r.enrollmentId] || ''}
                        onChange={e => setEntryNotes(prev => ({ ...prev, [r.enrollmentId]: e.target.value }))}
                        placeholder={t('Note (optional, e.g. sent home sick)')}
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
                placeholder={t('Roll call notes (optional, e.g. 3 late after break)')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || data.roster.length === 0}
                  className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {isSubmitting ? t('Saving…') : data.rollCall ? t('Update Roll Call') : t('Submit Roll Call')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Next class card */}
      {!isLoading && data?.nextPeriod && (
        <button
          onClick={() => router.push(`/dashboard/teacher/period-roll-call?teacherPeriodId=${data.nextPeriod!.teacherPeriodId}`)}
          className="w-full bg-white rounded-lg shadow p-4 flex items-center justify-between gap-3 text-left hover:shadow-md transition-shadow"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-0.5">{t('Next class')}</p>
            <p className="text-sm font-medium text-gray-900 truncate">
              {data.nextPeriod.subject?.name} — {data.nextPeriod.subClass?.class?.name} {data.nextPeriod.subClass?.name}
            </p>
            <p className="text-xs text-gray-500">
              {data.nextPeriod.periodName || t('Period')} · {data.nextPeriod.startTime}–{data.nextPeriod.endTime}
              <span className="text-blue-600 font-medium"> · {relativeStart(data.nextPeriod)}</span>
            </p>
          </div>
          <ArrowRightIcon className="w-5 h-5 text-gray-300 shrink-0" />
        </button>
      )}

      {/* Recent roll calls */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-900">{t('My recent roll calls (7 days)')}</div>
        {recent.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">{t('No roll calls recorded in the last 7 days.')}</p>
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
                      {new Date(rc.date).toLocaleDateString()} · {rc._count?.entries ?? 0} {t('students')}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0 text-xs">
                    {absent > 0 && <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full">{absent} {t('absent')}</span>}
                    {late > 0 && <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full">{late} {t('late')}</span>}
                    {absent === 0 && late === 0 && <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full">{t('all present')}</span>}
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
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
      <PeriodRollCallInner />
    </Suspense>
  );
}
