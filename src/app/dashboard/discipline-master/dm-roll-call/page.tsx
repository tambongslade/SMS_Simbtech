'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import apiService from '@/lib/apiService';
import {
  ROLL_CALL_SLOTS,
  type RollCallSlot,
  type DMRollCallStatus,
  type DmRollCallStatusData,
  type DmRosterEntry,
  getDmRollCall,
  getDmRollCallStatus,
  recordDmRollCall,
} from '@/lib/disciplineExtApi';
import { sortSubClassesByLevel } from '@/lib/classOrdering';
import { useLanguage } from '@/components/context/LanguageContext';

interface SubClassOption {
  id: number;
  name: string;
  className?: string;
}

// The DM walks classrooms three times a day (after the 2nd, 5th, and 8th
// period bells). The backend now picks which of the three slots to record
// based on wall-clock time, so this page is stateless in that sense — the
// DM opens it, marks the exceptions, hits Save, and moves on to the next
// subclass. No slot dropdown to hunt through.
export default function DmRollCallPage() {
  const { t } = useLanguage();
  const STATUS_OPTIONS: { value: DMRollCallStatus; label: string; active: string; idle: string }[] = [
    { value: 'PRESENT', label: t('Present'), active: 'bg-green-600 text-white', idle: 'bg-green-50 text-green-700 hover:bg-green-100' },
    { value: 'LATE', label: t('Late'), active: 'bg-yellow-500 text-white', idle: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
    { value: 'ABSENT', label: t('Absent'), active: 'bg-red-600 text-white', idle: 'bg-red-50 text-red-700 hover:bg-red-100' },
  ];

  const [subClasses, setSubClasses] = useState<SubClassOption[]>([]);
  const [subClassId, setSubClassId] = useState<number | ''>('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [slotStatus, setSlotStatus] = useState<DmRollCallStatusData | null>(null);
  const [currentSlot, setCurrentSlot] = useState<RollCallSlot | null>(null);
  const [roster, setRoster] = useState<DmRosterEntry[]>([]);
  const [alreadyRecorded, setAlreadyRecorded] = useState(false);
  const [statuses, setStatuses] = useState<Record<number, DMRollCallStatus>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const subClassSelectRef = useRef<HTMLSelectElement>(null);

  // Load sub-classes the caller may actually record for. A plain DM only sees
  // their assigned sub-classes; admin/senior roles (VP/Principal/DoD/SDM/SM)
  // still see everything since they share this page for corrections.
  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.get('/discipline/dm-roll-call/my-subclasses');
        const list = (res.data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          className: s.class?.name,
        }));
        setSubClasses(sortSubClassesByLevel(list));
      } catch {
        toast.error(t('Failed to load your assigned sub-classes.'));
      }
    })();
  }, []);

  const refresh = useCallback(async () => {
    if (!subClassId || !date) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      // Both endpoints let the backend pick the current slot when the query
      // omits it. Fetching the status endpoint in parallel keeps the day
      // summary (3 traffic lights) live without extra clicks.
      const [statusData, rollCallData] = await Promise.all([
        getDmRollCallStatus(subClassId, date),
        getDmRollCall(subClassId, date),
      ]);
      setSlotStatus(statusData);
      setCurrentSlot((rollCallData as any).slot ?? null);
      setRoster(rollCallData.roster || []);
      setAlreadyRecorded(!!rollCallData.rollCall);
      // Pre-fill: recorded entries keep their status, unrecorded default to PRESENT.
      const next: Record<number, DMRollCallStatus> = {};
      (rollCallData.roster || []).forEach(r => {
        next[r.enrollmentId] = r.status ?? 'PRESENT';
      });
      setStatuses(next);
    } catch (error: any) {
      setSlotStatus(null);
      setCurrentSlot(null);
      setRoster([]);
      setLoadError(error.message || t('Failed to load roll call.'));
    } finally {
      setIsLoading(false);
    }
  }, [subClassId, date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const counts = useMemo(() => {
    const c = { PRESENT: 0, LATE: 0, ABSENT: 0 };
    roster.forEach(r => {
      const s = statuses[r.enrollmentId];
      if (s) c[s] += 1;
    });
    return c;
  }, [roster, statuses]);

  const setAll = (status: DMRollCallStatus) => {
    const next: Record<number, DMRollCallStatus> = {};
    roster.forEach(r => { next[r.enrollmentId] = status; });
    setStatuses(next);
  };

  // Reset just enough state to record another subclass immediately without
  // re-entering the date. The subclass dropdown is auto-focused so the DM
  // can keep his rhythm.
  const resetForNext = () => {
    setSubClassId('');
    setSlotStatus(null);
    setCurrentSlot(null);
    setRoster([]);
    setAlreadyRecorded(false);
    setStatuses({});
    setLoadError(null);
    setTimeout(() => subClassSelectRef.current?.focus(), 50);
  };

  const handleSubmit = async () => {
    if (!subClassId || roster.length === 0) return;
    setIsSubmitting(true);
    try {
      // No slot in the payload — backend picks based on server time.
      const result = await recordDmRollCall({
        subClassId: Number(subClassId),
        date,
        entries: roster.map(r => ({ enrollmentId: r.enrollmentId, status: statuses[r.enrollmentId] || 'PRESENT' })),
      });
      const newWarnings = (result.triggers || []).reduce((n, tr) => n + (tr.warnings?.length || 0), 0);
      const newSummons = (result.triggers || []).reduce((n, tr) => n + (tr.summons?.length || 0), 0);
      const slotLabel = ROLL_CALL_SLOTS.find(s => s.value === result.slot)?.label ?? result.slot;
      const base = t('Roll call saved') + (result.slot ? ` (${slotLabel})` : '') + '.';
      toast.success(
        newWarnings || newSummons
          ? `${base} ${newWarnings} ${t('Warnings')}, ${newSummons} ${t('Summons')}.`
          : base
      );
      resetForNext();
    } catch (error: any) {
      toast.error(error.message || t('Failed to save roll call.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const slotBadge = (s: RollCallSlot) => {
    const info = slotStatus?.slots?.[s];
    if (!info) return null;
    return info.status === 'recorded' ? (
      <CheckCircleIcon className="w-4 h-4 text-green-500" />
    ) : (
      <XCircleIcon className="w-4 h-4 text-gray-300" />
    );
  };

  const currentSlotLabel = currentSlot
    ? ROLL_CALL_SLOTS.find(s => s.value === currentSlot)?.label ?? currentSlot
    : '';

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 max-w-3xl mx-auto overflow-x-clip">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('Roll Call')}</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          {t('Record attendance. The slot is picked automatically from the time you save.')}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="min-w-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('Sub-class')}</label>
          <select
            ref={subClassSelectRef}
            value={subClassId}
            onChange={e => setSubClassId(Number(e.target.value) || '')}
            className="block w-full min-w-0 rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm bg-white"
          >
            <option value="">{t('Select sub-class')}</option>
            {subClasses.map(s => (
              <option key={s.id} value={s.id}>
                {s.className ? `${s.className} — ${s.name}` : s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 min-w-0">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('Date')}</label>
            {/* appearance-none + min-w-0 stop iOS date inputs from forcing the
                page wider than the screen */}
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="block w-full min-w-0 max-w-full appearance-none rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm bg-white"
            />
          </div>
          <button
            onClick={refresh}
            disabled={!subClassId || isLoading}
            title={t('Refresh')}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 text-sm shrink-0"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('Refresh')}</span>
          </button>
        </div>
      </div>

      {/* Day summary — passive traffic lights for the three slots, and the
          slot the current save will be recorded to. No manual switching. */}
      {subClassId && slotStatus && (
        <div className="bg-white rounded-lg shadow px-3 sm:px-4 py-2.5 text-xs sm:text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-gray-500">{t('Today')}:</span>
          {ROLL_CALL_SLOTS.map(s => (
            <span key={s.value} className={`inline-flex items-center gap-1 ${currentSlot === s.value ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
              {slotBadge(s.value)}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.label.split(' (')[0]}</span>
            </span>
          ))}
          {currentSlotLabel && (
            <span className="ml-auto text-[11px] sm:text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              {t('Will save to')}: {currentSlotLabel}
            </span>
          )}
        </div>
      )}

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-4 text-sm">{loadError}</div>
      )}

      {!subClassId ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          {t('Select a sub-class to start.')}
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">{t('Loading roster…')}</div>
      ) : roster.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-3 sm:px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs sm:text-sm text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold text-gray-900">{roster.length} {t('students')}</span>
              <span className="text-green-700">{counts.PRESENT} P</span>
              <span className="text-yellow-700">{counts.LATE} L</span>
              <span className="text-red-700">{counts.ABSENT} A</span>
              {alreadyRecorded && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                  <ClockIcon className="w-3 h-3" /> {t('recorded — saving replaces')}
                </span>
              )}
            </div>
            <button
              onClick={() => setAll('PRESENT')}
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap"
            >
              {t('Mark all present')}
            </button>
          </div>

          <ul className="divide-y divide-gray-100">
            {roster.map(r => (
              <li key={r.enrollmentId} className="px-3 sm:px-6 py-2 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  {/* First two names only — keeps the row short so the action
                      buttons sit right next to the name */}
                  <p className="text-[13px] sm:text-sm font-medium text-gray-900 truncate" title={r.student.name}>
                    {r.student.name.trim().split(/\s+/).slice(0, 2).join(' ')}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">{r.student.matricule || '—'}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setStatuses(prev => ({ ...prev, [r.enrollmentId]: opt.value }))}
                      className={`w-10 sm:w-auto px-0 sm:px-3 py-2 sm:py-1.5 rounded-md text-xs font-semibold transition-colors ${
                        statuses[r.enrollmentId] === opt.value ? opt.active : opt.idle
                      }`}
                      title={opt.label}
                    >
                      <span className="sm:hidden">{opt.label.charAt(0)}</span>
                      <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>

          {/* Sticky save bar — stays visible while scrolling long rosters */}
          <div className="sticky bottom-0 px-3 sm:px-6 py-3 border-t border-gray-200 bg-white/95 backdrop-blur flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs text-gray-500">
              {counts.PRESENT} {t('present')} · {counts.LATE} {t('late')} · {counts.ABSENT} {t('absent')}
            </span>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium shrink-0"
            >
              {isSubmitting ? t('Saving…') : alreadyRecorded ? t('Replace Roll Call') : t('Save Roll Call')}
            </button>
          </div>
        </div>
      ) : (
        !loadError && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            {t('No students found for this sub-class.')}
          </div>
        )
      )}
    </div>
  );
}
