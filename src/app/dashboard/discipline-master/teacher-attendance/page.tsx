'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import apiService from '@/lib/apiService';
import { useAuth } from '@/components/context/AuthContext';
import {
  type TeacherAttendanceDay,
  type TeacherAttendanceStatus,
  getTeacherAttendanceDay,
  saveTeacherAttendanceDay,
} from '@/lib/teacherAttendanceApi';
import { sortSubClassesByLevel } from '@/lib/classOrdering';

interface SubClassOption {
  id: number;
  name: string;
  className?: string;
}

interface RowState {
  status: TeacherAttendanceStatus;
  wellDressed: boolean;
  classManagement: boolean;
  punctuality: boolean;
  assiduity: boolean;
  reason: string;
  notes: string;
}

const STATUS_OPTIONS: { value: TeacherAttendanceStatus; label: string; active: string; idle: string }[] = [
  { value: 'PRESENT', label: 'Present', active: 'bg-green-600 text-white', idle: 'bg-green-50 text-green-700 hover:bg-green-100' },
  { value: 'LATE', label: 'Late', active: 'bg-yellow-500 text-white', idle: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
  { value: 'ABSENT', label: 'Absent', active: 'bg-red-600 text-white', idle: 'bg-red-50 text-red-700 hover:bg-red-100' },
];

const CHECKS: { key: keyof Pick<RowState, 'wellDressed' | 'classManagement' | 'punctuality' | 'assiduity'>; label: string }[] = [
  { key: 'wellDressed', label: 'Well dressed' },
  { key: 'classManagement', label: 'Class management' },
  { key: 'punctuality', label: 'Punctuality' },
  { key: 'assiduity', label: 'Assiduity' },
];

// Fresh rows default to Present with all conduct checks positive — the DM
// only marks what went wrong.
const defaultRow = (): RowState => ({
  status: 'PRESENT',
  wellDressed: true,
  classManagement: true,
  punctuality: true,
  assiduity: true,
  reason: '',
  notes: '',
});

export default function TeacherAttendancePage() {
  const { selectedAcademicYear } = useAuth();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [subClassId, setSubClassId] = useState<number | ''>('');
  const [subClasses, setSubClasses] = useState<SubClassOption[]>([]);

  const [day, setDay] = useState<TeacherAttendanceDay | null>(null);
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.get('/classes/sub-classes?limit=200');
        setSubClasses(sortSubClassesByLevel((res.data || []).map((s: any) => ({ id: s.id, name: s.name, className: s.class?.name }))));
      } catch { /* filter stays empty */ }
    })();
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getTeacherAttendanceDay(date, subClassId || undefined, selectedAcademicYear?.id);
      setDay(data);
      const next: Record<number, RowState> = {};
      (data.periods || []).forEach(p => {
        next[p.teacherPeriodId] = p.attendance
          ? {
              status: p.attendance.status,
              wellDressed: !!p.attendance.wellDressed,
              classManagement: !!p.attendance.classManagement,
              punctuality: !!p.attendance.punctuality,
              assiduity: !!p.attendance.assiduity,
              reason: p.attendance.reason || '',
              notes: p.attendance.notes || '',
            }
          : defaultRow();
      });
      setRows(next);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load teacher attendance.');
      setDay(null);
    } finally {
      setIsLoading(false);
    }
  }, [date, subClassId, selectedAcademicYear?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const setRow = (id: number, patch: Partial<RowState>) =>
    setRows(prev => ({ ...prev, [id]: { ...(prev[id] || defaultRow()), ...patch } }));

  const counts = useMemo(() => {
    const c = { PRESENT: 0, LATE: 0, ABSENT: 0 };
    (day?.periods || []).forEach(p => { c[rows[p.teacherPeriodId]?.status || 'PRESENT'] += 1; });
    return c;
  }, [day, rows]);

  const recordedCount = useMemo(() => (day?.periods || []).filter(p => p.attendance).length, [day]);

  const handleSave = async () => {
    if (!day || day.periods.length === 0) return;
    setIsSaving(true);
    try {
      await saveTeacherAttendanceDay({
        date,
        academicYearId: selectedAcademicYear?.id,
        entries: day.periods.map(p => {
          const r = rows[p.teacherPeriodId] || defaultRow();
          return {
            teacherPeriodId: p.teacherPeriodId,
            status: r.status,
            wellDressed: r.wellDressed,
            classManagement: r.classManagement,
            punctuality: r.punctuality,
            assiduity: r.assiduity,
            reason: r.reason.trim() || undefined,
            notes: r.notes.trim() || undefined,
          };
        }),
      });
      toast.success('Teacher attendance saved for the day.');
      refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save teacher attendance.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teacher Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Per-period teacher check: presence, dressing, punctuality, class management and assiduity.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sub-class</label>
          <select value={subClassId} onChange={e => setSubClassId(Number(e.target.value) || '')}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
            <option value="">My assigned sub-classes</option>
            {subClasses.map(s => (
              <option key={s.id} value={s.id}>{s.className ? `${s.className} — ${s.name}` : s.name}</option>
            ))}
          </select>
        </div>
        <button onClick={refresh}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm">
          <ArrowPathIcon className="w-4 h-4" /> Refresh
        </button>
        {day && day.periods.length > 0 && (
          <div className="text-xs text-gray-600 flex gap-3 ml-auto">
            <span className="text-green-700">{counts.PRESENT} present</span>
            <span className="text-yellow-700">{counts.LATE} late</span>
            <span className="text-red-700">{counts.ABSENT} absent</span>
            <span className="text-gray-400">{recordedCount}/{day.periods.length} saved</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Loading the day's periods…</div>
      ) : !day || day.periods.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No teaching periods found for this date{subClassId ? ' and sub-class' : ''}.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {day.periods.map(p => {
              const r = rows[p.teacherPeriodId] || defaultRow();
              return (
                <div key={p.teacherPeriodId} className="bg-white rounded-lg shadow p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {p.teacher?.name || 'Teacher'}
                        {p.attendance && (
                          <span className="inline-flex items-center gap-1 ml-2 text-xs text-green-700">
                            <CheckCircleIcon className="w-3.5 h-3.5" /> saved
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.subject?.name || 'Subject'} · {p.subClass?.class?.name} {p.subClass?.name}
                        {p.period?.startTime ? ` · ${p.period.name || ''} ${p.period.startTime}–${p.period.endTime}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {STATUS_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setRow(p.teacherPeriodId, { status: opt.value })}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${r.status === opt.value ? opt.active : opt.idle}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                    {CHECKS.map(c => (
                      <label key={c.key} className="flex items-center gap-1.5 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={r[c.key]}
                          onChange={e => setRow(p.teacherPeriodId, { [c.key]: e.target.checked } as Partial<RowState>)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>

                  {(r.status !== 'PRESENT' || r.reason || r.notes) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      <input
                        type="text"
                        value={r.reason}
                        onChange={e => setRow(p.teacherPeriodId, { reason: e.target.value })}
                        placeholder="Reason (e.g. Arrived 10 min late)"
                        className="px-3 py-1.5 border border-gray-200 rounded-md text-xs"
                      />
                      <input
                        type="text"
                        value={r.notes}
                        onChange={e => setRow(p.teacherPeriodId, { notes: e.target.value })}
                        placeholder="Notes (e.g. Class was noisy)"
                        className="px-3 py-1.5 border border-gray-200 rounded-md text-xs"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end sticky bottom-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium shadow-lg"
            >
              {isSaving ? 'Saving…' : `Save Day (${day.periods.length} periods)`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
