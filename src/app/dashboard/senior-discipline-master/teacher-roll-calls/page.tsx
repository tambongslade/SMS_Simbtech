'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import apiService from '@/lib/apiService';
import {
  type TeacherRollCallSummary,
  listOversightRollCalls,
  getOversightRollCall,
} from '@/lib/teacherRollCallApi';

interface SubClassOption {
  id: number;
  name: string;
  className?: string;
}

// Oversight over teacher per-period roll calls (SDM, Dean of Discipline, VP,
// Principal, Manager, Super-Manager).
export default function TeacherRollCallsOversightPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [subClassId, setSubClassId] = useState<number | ''>('');
  const [onlyAbsences, setOnlyAbsences] = useState(true);
  const [subClasses, setSubClasses] = useState<SubClassOption[]>([]);

  const [rollCalls, setRollCalls] = useState<TeacherRollCallSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TeacherRollCallSummary | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.get('/classes/sub-classes?limit=200');
        setSubClasses((res.data || []).map((s: any) => ({ id: s.id, name: s.name, className: s.class?.name })));
      } catch { /* filter stays empty */ }
    })();
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setRollCalls(await listOversightRollCalls({
        date,
        subClassId: subClassId || undefined,
        onlyWithAbsences: onlyAbsences,
        limit: 200,
      }));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load roll calls.');
    } finally {
      setIsLoading(false);
    }
  }, [date, subClassId, onlyAbsences]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggleDetail = async (rc: TeacherRollCallSummary) => {
    if (expandedId === rc.id) { setExpandedId(null); setDetail(null); return; }
    setExpandedId(rc.id);
    setDetail(null);
    setIsLoadingDetail(true);
    try {
      setDetail(await getOversightRollCall(rc.id));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load detail.');
      setExpandedId(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const entryStudent = (e: any) => e.enrollment?.student || e.student || {};

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teacher Roll Calls</h1>
        <p className="text-sm text-gray-500 mt-1">Per-period roll calls submitted by teachers.</p>
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
            <option value="">All sub-classes</option>
            {subClasses.map(s => (
              <option key={s.id} value={s.id}>{s.className ? `${s.className} — ${s.name}` : s.name}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
          <input type="checkbox" checked={onlyAbsences} onChange={e => setOnlyAbsences(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
          Only with absences
        </label>
        <button onClick={refresh}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm">
          <ArrowPathIcon className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-gray-500">Loading roll calls…</p>
        ) : rollCalls.length === 0 ? (
          <p className="p-6 text-gray-500 text-center">
            No roll calls found for these filters{onlyAbsences ? ' (try unticking "Only with absences")' : ''}.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rollCalls.map(rc => {
              const absent = (rc.entries || []).filter(e => e.status === 'ABSENT').length;
              const late = (rc.entries || []).filter(e => e.status === 'LATE').length;
              const expanded = expandedId === rc.id;
              return (
                <li key={rc.id}>
                  <button onClick={() => toggleDetail(rc)} className="w-full px-4 py-3 text-left hover:bg-gray-50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-2">
                        {expanded ? <ChevronDownIcon className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {rc.teacherPeriod?.subject?.name || 'Subject'} — {rc.teacherPeriod?.subClass?.class?.name} {rc.teacherPeriod?.subClass?.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {rc.teacherPeriod?.teacher?.name || rc.recordedBy?.name || 'Teacher'}
                            {rc.teacherPeriod?.period?.startTime ? ` · ${rc.teacherPeriod.period.startTime}–${rc.teacherPeriod.period.endTime}` : ''}
                            {` · ${new Date(rc.date).toLocaleDateString()}`}
                            {rc.notes ? ` · ${rc.notes}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0 text-xs">
                        {absent > 0 && <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full">{absent} absent</span>}
                        {late > 0 && <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full">{late} late</span>}
                        {absent === 0 && late === 0 && <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full">all present</span>}
                        <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full">{rc._count?.entries ?? 0} students</span>
                      </div>
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-6 pb-3 bg-gray-50">
                      {isLoadingDetail ? (
                        <p className="text-sm text-gray-400 py-2">Loading detail…</p>
                      ) : detail ? (
                        <ul className="divide-y divide-gray-100">
                          {(detail.entries || []).map((e: any) => {
                            const s = entryStudent(e);
                            return (
                              <li key={e.id} className="py-1.5 flex items-center justify-between gap-2 text-sm">
                                <span className="text-gray-800">
                                  {s.name || 'Student'}
                                  <span className="text-xs text-gray-400"> {s.matricule || ''}</span>
                                  {e.notes && <span className="text-xs text-gray-500"> · {e.notes}</span>}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  e.status === 'ABSENT' ? 'bg-red-100 text-red-700'
                                    : e.status === 'LATE' ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {e.status.charAt(0) + e.status.slice(1).toLowerCase()}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
