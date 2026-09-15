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
import { useLanguage } from '@/components/context/LanguageContext';

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

// Localized labels are built inside the component so t() can be used.

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
  const { t } = useLanguage();
  const STATUS_OPTIONS: { value: TeacherAttendanceStatus; label: string; active: string; idle: string }[] = [
    { value: 'PRESENT', label: t('Present'), active: 'bg-green-600 text-white', idle: 'bg-green-50 text-green-700 hover:bg-green-100' },
    { value: 'LATE', label: t('Late'), active: 'bg-yellow-500 text-white', idle: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
    { value: 'ABSENT', label: t('Absent'), active: 'bg-red-600 text-white', idle: 'bg-red-50 text-red-700 hover:bg-red-100' },
  ];
  const CHECKS: { key: keyof Pick<RowState, 'wellDressed' | 'classManagement' | 'punctuality' | 'assiduity'>; label: string }[] = [
    { key: 'wellDressed', label: t('Well dressed') },
    { key: 'classManagement', label: t('Class management') },
    { key: 'punctuality', label: t('Punctuality') },
    { key: 'assiduity', label: t('Assiduity') },
  ];
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [subClassId, setSubClassId] = useState<number | ''>('');
  const [subClasses, setSubClasses] = useState<SubClassOption[]>([]);

  const [day, setDay] = useState<TeacherAttendanceDay | null>(null);
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');

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
      toast.error(error.message || t('Failed to load teacher attendance.'));
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

  const uniqueTeacherCount = useMemo(
    () => new Set((day?.periods || []).map(p => p.teacher?.id).filter(Boolean)).size,
    [day],
  );

  // Rows filtered by teacher-name search. Everything else in the page (counts,
  // save) still uses the full day.periods list so filtering doesn't skew totals.
  const visiblePeriods = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return day?.periods || [];
    return (day?.periods || []).filter(p =>
      (p.teacher?.name || '').toLowerCase().includes(q) ||
      (p.teacher?.matricule || '').toLowerCase().includes(q),
    );
  }, [day, teacherSearch]);

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
      toast.success(t('Teacher attendance saved for the day.'));
      refresh();
    } catch (error: any) {
      toast.error(error.message || t('Failed to save teacher attendance.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('Teacher Attendance')}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('Per-period teacher check: presence, dressing, punctuality, class management and assiduity.')}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('Date')}</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('Sub-class')}</label>
          <select value={subClassId} onChange={e => setSubClassId(Number(e.target.value) || '')}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
            <option value="">{t('My assigned sub-classes')}</option>
            {subClasses.map(s => (
              <option key={s.id} value={s.id}>{s.className ? `${s.className} — ${s.name}` : s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('Search teacher')}</label>
          <input
            type="text"
            value={teacherSearch}
            onChange={e => setTeacherSearch(e.target.value)}
            placeholder={t('Name or matricule')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button onClick={refresh}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm">
          <ArrowPathIcon className="w-4 h-4" /> {t('Refresh')}
        </button>
      </div>

      {/* Summary — clarifies periods vs teachers so 282 periods across 39 teachers isn't read as "282 teachers" */}
      {day && day.periods.length > 0 && (
        <div className="bg-white rounded-lg shadow p-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
          <span className="font-semibold text-gray-700">
            {day.periods.length} {t('periods across')} {uniqueTeacherCount} {t('teachers')}
          </span>
          <span className="text-green-700">{counts.PRESENT} {t('present')}</span>
          <span className="text-yellow-700">{counts.LATE} {t('late')}</span>
          <span className="text-red-700">{counts.ABSENT} {t('absent')}</span>
          <span className="text-gray-400">{recordedCount}/{day.periods.length} {t('saved')}</span>
          {teacherSearch && (
            <span className="ml-auto text-blue-600">
              {t('Showing')} {visiblePeriods.length} {t('of')} {day.periods.length} {t('periods')}
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">{t("Loading the day's periods…")}</div>
      ) : !day || day.periods.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          {t('No teaching periods found for this date')}{subClassId ? ` ${t('and')} ${t('Sub-class').toLowerCase()}` : ''}.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {visiblePeriods.length === 0 && teacherSearch && (
              <div className="bg-white rounded-lg shadow p-6 text-center text-sm text-gray-500">
                {t('No teacher matches')} &quot;{teacherSearch}&quot;.
              </div>
            )}
            {visiblePeriods.map(p => {
              const r = rows[p.teacherPeriodId] || defaultRow();
              return (
                <div key={p.teacherPeriodId} className="bg-white rounded-lg shadow p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {p.teacher?.name || t('Teacher')}
                        {p.attendance && (
                          <span className="inline-flex items-center gap-1 ml-2 text-xs text-green-700">
                            <CheckCircleIcon className="w-3.5 h-3.5" /> {t('saved')}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.subject?.name || t('Subject')} · {p.subClass?.class?.name} {p.subClass?.name}
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
                        placeholder={t('Reason (e.g. Arrived 10 min late)')}
                        className="px-3 py-1.5 border border-gray-200 rounded-md text-xs"
                      />
                      <input
                        type="text"
                        value={r.notes}
                        onChange={e => setRow(p.teacherPeriodId, { notes: e.target.value })}
                        placeholder={t('Notes (e.g. Class was noisy)')}
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
              {isSaving ? t('Saving…') : `${t('Save Day')} (${day.periods.length} ${t('periods')})`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
