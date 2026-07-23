'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

interface SubClassOption {
  id: number;
  name: string;
  className?: string;
}

const STATUS_OPTIONS: { value: DMRollCallStatus; label: string; active: string; idle: string }[] = [
  { value: 'PRESENT', label: 'Present', active: 'bg-green-600 text-white', idle: 'bg-green-50 text-green-700 hover:bg-green-100' },
  { value: 'LATE', label: 'Late', active: 'bg-yellow-500 text-white', idle: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
  { value: 'ABSENT', label: 'Absent', active: 'bg-red-600 text-white', idle: 'bg-red-50 text-red-700 hover:bg-red-100' },
];

export default function DmRollCallPage() {
  const [subClasses, setSubClasses] = useState<SubClassOption[]>([]);
  const [subClassId, setSubClassId] = useState<number | ''>('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [slot, setSlot] = useState<RollCallSlot>('SLOT_2');

  const [slotStatus, setSlotStatus] = useState<DmRollCallStatusData | null>(null);
  const [roster, setRoster] = useState<DmRosterEntry[]>([]);
  const [alreadyRecorded, setAlreadyRecorded] = useState(false);
  const [statuses, setStatuses] = useState<Record<number, DMRollCallStatus>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load sub-classes once
  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.get('/classes/sub-classes?limit=200');
        const list = (res.data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          className: s.class?.name,
        }));
        setSubClasses(list);
      } catch {
        toast.error('Failed to load sub-classes.');
      }
    })();
  }, []);

  const refresh = useCallback(async () => {
    if (!subClassId || !date) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [statusData, rollCallData] = await Promise.all([
        getDmRollCallStatus(subClassId, date),
        getDmRollCall(subClassId, date, slot),
      ]);
      setSlotStatus(statusData);
      setRoster(rollCallData.roster || []);
      setAlreadyRecorded(!!rollCallData.rollCall);
      // Pre-fill: recorded entries keep their status, unrecorded default to PRESENT
      const next: Record<number, DMRollCallStatus> = {};
      (rollCallData.roster || []).forEach(r => {
        next[r.enrollmentId] = r.status ?? 'PRESENT';
      });
      setStatuses(next);
    } catch (error: any) {
      setSlotStatus(null);
      setRoster([]);
      setLoadError(error.message || 'Failed to load roll call.');
    } finally {
      setIsLoading(false);
    }
  }, [subClassId, date, slot]);

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

  const handleSubmit = async () => {
    if (!subClassId || roster.length === 0) return;
    setIsSubmitting(true);
    try {
      const result = await recordDmRollCall({
        subClassId: Number(subClassId),
        date,
        slot,
        entries: roster.map(r => ({ enrollmentId: r.enrollmentId, status: statuses[r.enrollmentId] || 'PRESENT' })),
      });
      const newWarnings = (result.triggers || []).reduce((n, t) => n + (t.warnings?.length || 0), 0);
      const newSummons = (result.triggers || []).reduce((n, t) => n + (t.summons?.length || 0), 0);
      toast.success(
        newWarnings || newSummons
          ? `Roll call saved. Auto-created ${newWarnings} warning(s) and ${newSummons} summons.`
          : 'Roll call saved.'
      );
      refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save roll call.');
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
      <XCircleIcon className="w-4 h-4 text-red-400" />
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Roll Call</h1>
        <p className="text-sm text-gray-500 mt-1">
          Record attendance for the three daily control slots. Absences and lateness automatically feed the discipline system.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sub-class</label>
          <select
            value={subClassId}
            onChange={e => setSubClassId(Number(e.target.value) || '')}
            className="block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="">Select sub-class</option>
            {subClasses.map(s => (
              <option key={s.id} value={s.id}>
                {s.className ? `${s.className} — ${s.name}` : s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={refresh}
            disabled={!subClassId || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 text-sm"
          >
            <ArrowPathIcon className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Slot tabs (traffic-light strip) */}
      {subClassId && (
        <div className="flex gap-2">
          {ROLL_CALL_SLOTS.map(s => (
            <button
              key={s.value}
              onClick={() => setSlot(s.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium ${
                slot === s.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
              }`}
            >
              {s.label}
              {slotBadge(s.value)}
            </button>
          ))}
        </div>
      )}

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-4 text-sm">{loadError}</div>
      )}

      {!subClassId ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Select a sub-class to start.
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Loading roster…</div>
      ) : roster.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-600 flex items-center gap-3">
              <span className="font-semibold text-gray-900">{roster.length} students</span>
              <span className="text-green-700">{counts.PRESENT} present</span>
              <span className="text-yellow-700">{counts.LATE} late</span>
              <span className="text-red-700">{counts.ABSENT} absent</span>
              {alreadyRecorded && (
                <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                  <ClockIcon className="w-3 h-3" /> Already recorded — saving replaces it
                </span>
              )}
            </div>
            <button
              onClick={() => setAll('PRESENT')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Mark all present
            </button>
          </div>

          <ul className="divide-y divide-gray-100">
            {roster.map(r => (
              <li key={r.enrollmentId} className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.student.name}</p>
                  <p className="text-xs text-gray-500">{r.student.matricule || '—'}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setStatuses(prev => ({ ...prev, [r.enrollmentId]: opt.value }))}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                        statuses[r.enrollmentId] === opt.value ? opt.active : opt.idle
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>

          <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {isSubmitting ? 'Saving…' : alreadyRecorded ? 'Replace Roll Call' : 'Save Roll Call'}
            </button>
          </div>
        </div>
      ) : (
        !loadError && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No students found for this sub-class.
          </div>
        )
      )}
    </div>
  );
}
