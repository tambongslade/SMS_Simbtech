'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { XMarkIcon, ArrowPathIcon, UserPlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import apiService from '@/lib/apiService';
import { useAuth } from '@/components/context/AuthContext';
import {
  listDisciplineMasters,
  assignDisciplineMaster,
  unassignDisciplineMaster,
  type DisciplineMasterUser,
} from '@/lib/disciplineExtApi';
import { sortSubClassesByLevel } from '@/lib/classOrdering';
import { useLanguage } from '@/components/context/LanguageContext';

interface SubClassOption {
  id: number;
  name: string;
  className?: string;
}

// Assign Discipline Masters to the subclasses they supervise. The DM slot
// roll-call endpoints only accept subclasses assigned here (admin roles bypass).
export default function DmAssignmentsPage() {
  const { selectedAcademicYear } = useAuth();
  const { t } = useLanguage();
  const yearId = selectedAcademicYear?.id;

  const [dms, setDms] = useState<DisciplineMasterUser[]>([]);
  const [subClasses, setSubClasses] = useState<SubClassOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // dmId -> Set of subClassIds pending assignment
  const [pendingPick, setPendingPick] = useState<Record<number, Set<number>>>({});
  const [busyDm, setBusyDm] = useState<number | null>(null);
  // dmId -> filter input for the subclass picker
  const [filter, setFilter] = useState<Record<number, string>>({});
  // Fallback assignment tracking for when the users endpoint doesn't include
  // roleAssignments — reflects changes made in this session.
  const [localAssignments, setLocalAssignments] = useState<Record<number, number[]>>({});

  const subClassLabel = useCallback((id: number) => {
    const s = subClasses.find(x => x.id === id);
    return s ? (s.className ? `${s.className} — ${s.name}` : s.name) : `Subclass #${id}`;
  }, [subClasses]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dmList, subRes] = await Promise.all([
        listDisciplineMasters(yearId),
        apiService.get('/classes/sub-classes?limit=200'),
      ]);
      setDms(dmList);
      setSubClasses(sortSubClassesByLevel((subRes.data || []).map((s: any) => ({ id: s.id, name: s.name, className: s.class?.name }))));
    } catch (error: any) {
      toast.error(error.message || t('Failed to load discipline masters.'));
    } finally {
      setIsLoading(false);
    }
  }, [yearId]);

  useEffect(() => { refresh(); }, [refresh]);

  const assignedFor = useCallback((dm: DisciplineMasterUser): number[] => {
    const fromApi = dm.assignments.map(a => a.subClassId!).filter(Boolean);
    const local = localAssignments[dm.id] || [];
    return Array.from(new Set([...fromApi, ...local]));
  }, [localAssignments]);

  const togglePick = (dmId: number, subClassId: number) => {
    setPendingPick(prev => {
      const current = new Set(prev[dmId] ?? []);
      if (current.has(subClassId)) current.delete(subClassId);
      else current.add(subClassId);
      return { ...prev, [dmId]: current };
    });
  };

  const clearPicks = (dmId: number) => {
    setPendingPick(prev => ({ ...prev, [dmId]: new Set() }));
  };

  const selectAllVisible = (dmId: number, visibleIds: number[]) => {
    setPendingPick(prev => {
      const current = new Set(prev[dmId] ?? []);
      visibleIds.forEach(id => current.add(id));
      return { ...prev, [dmId]: current };
    });
  };

  // Fires N assign calls in parallel and reports partial success. Duplicates
  // (P2002) are treated as "already assigned" not errors so re-runs are safe.
  const handleAssign = async (dm: DisciplineMasterUser) => {
    const picks = Array.from(pendingPick[dm.id] ?? []);
    if (picks.length === 0) return;
    setBusyDm(dm.id);
    const results = await Promise.allSettled(
      picks.map(id => assignDisciplineMaster(dm.id, id, yearId).then(() => id)),
    );

    const succeeded: number[] = [];
    const alreadyAssigned: number[] = [];
    const failed: { id: number; msg: string }[] = [];
    results.forEach((res, i) => {
      const id = picks[i];
      if (res.status === 'fulfilled') {
        succeeded.push(id);
        return;
      }
      const msg = String(res.reason?.message || res.reason || '');
      if (msg.includes('P2002') || msg.toLowerCase().includes('unique') || msg.includes('500')) {
        alreadyAssigned.push(id);
      } else {
        failed.push({ id, msg });
      }
    });

    const newlyAssigned = [...succeeded, ...alreadyAssigned];
    if (newlyAssigned.length > 0) {
      setLocalAssignments(prev => ({
        ...prev,
        [dm.id]: Array.from(new Set([...(prev[dm.id] || []), ...newlyAssigned])),
      }));
    }

    if (failed.length === 0 && succeeded.length > 0) {
      toast.success(`${dm.name}: ${succeeded.length} ${succeeded.length === 1 ? t('subclass assigned') : t('subclasses assigned')}.`);
    } else if (failed.length === 0 && alreadyAssigned.length > 0) {
      toast(`${dm.name} ${t('was already assigned to the selected subclasses.')}`, { icon: 'ℹ️' });
    } else if (failed.length > 0 && succeeded.length + alreadyAssigned.length > 0) {
      toast.error(`${dm.name}: ${succeeded.length + alreadyAssigned.length} ${t('assigned')}, ${failed.length} ${t('failed')}.`);
    } else if (failed.length > 0) {
      toast.error(`${dm.name}: ${t('Failed to assign.')} ${failed[0].msg}`);
    }

    clearPicks(dm.id);
    setBusyDm(null);
    refresh();
  };

  const handleUnassign = async (dm: DisciplineMasterUser, subClassId: number) => {
    if (!window.confirm(`Remove ${dm.name} from ${subClassLabel(subClassId)}?`)) return;
    setBusyDm(dm.id);
    try {
      await unassignDisciplineMaster(dm.id, subClassId, yearId);
      toast.success(t('Assignment removed.'));
      setLocalAssignments(prev => ({ ...prev, [dm.id]: (prev[dm.id] || []).filter(id => id !== subClassId) }));
      setDms(prev => prev.map(d => (d.id === dm.id
        ? { ...d, assignments: d.assignments.filter(a => a.subClassId !== subClassId) }
        : d)));
      refresh();
    } catch (error: any) {
      toast.error(error.message || t('Failed to remove assignment.'));
    } finally {
      setBusyDm(null);
    }
  };

  const assignedCount = useMemo(() => dms.reduce((n, dm) => n + assignedFor(dm).length, 0), [dms, assignedFor]);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('DM Assignments')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('Assign discipline masters to the subclasses they supervise')}
            {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''} · {assignedCount} {assignedCount === 1 ? t('active assignment') : t('active assignments')}
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
        >
          <ArrowPathIcon className="w-4 h-4" /> {t('Refresh')}
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">{t('Loading discipline masters…')}</div>
      ) : dms.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          {t('No users with the Discipline Master role were found.')}
        </div>
      ) : (
        <div className="space-y-4">
          {dms.map(dm => {
            const assigned = assignedFor(dm);
            const available = subClasses.filter(s => !assigned.includes(s.id));
            const term = (filter[dm.id] ?? '').trim().toLowerCase();
            const visible = term
              ? available.filter(s =>
                  s.name.toLowerCase().includes(term)
                  || (s.className ?? '').toLowerCase().includes(term),
                )
              : available;
            const picks = pendingPick[dm.id] ?? new Set<number>();
            const pickedCount = picks.size;

            return (
              <div key={dm.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{dm.name}</p>
                    <p className="text-xs text-gray-500">{dm.matricule || `User #${dm.id}`}</p>
                  </div>
                  <span className="text-xs text-gray-400">{assigned.length} subclass{assigned.length === 1 ? '' : 'es'}</span>
                </div>

                {assigned.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {assigned.map(id => (
                      <span key={id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                        {subClassLabel(id)}
                        <button
                          type="button"
                          disabled={busyDm === dm.id}
                          onClick={() => handleUnassign(dm, id)}
                          title={t('Remove assignment')}
                        >
                          <XMarkIcon className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {available.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">{t('No more subclasses to assign.')}</p>
                ) : (
                  <div className="border border-gray-200 rounded-md">
                    <div className="flex flex-col sm:flex-row gap-2 p-2 border-b border-gray-100 bg-gray-50 rounded-t-md">
                      <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                          type="search"
                          placeholder={t('Filter by class or subclass…')}
                          value={filter[dm.id] ?? ''}
                          onChange={e => setFilter(prev => ({ ...prev, [dm.id]: e.target.value }))}
                          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          disabled={busyDm === dm.id}
                        />
                      </div>
                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => selectAllVisible(dm.id, visible.map(s => s.id))}
                          disabled={busyDm === dm.id || visible.length === 0}
                          className="px-2 py-1.5 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {t('Select all')} ({visible.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => clearPicks(dm.id)}
                          disabled={busyDm === dm.id || pickedCount === 0}
                          className="px-2 py-1.5 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {t('Clear')}
                        </button>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                      {visible.length === 0 ? (
                        <p className="text-xs text-gray-400 italic text-center py-4">
                          {term ? t('No matches.') : t('No subclasses to show.')}
                        </p>
                      ) : (
                        visible.map(s => {
                          const checked = picks.has(s.id);
                          return (
                            <label
                              key={s.id}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm hover:bg-blue-50 ${checked ? 'bg-blue-50' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePick(dm.id, s.id)}
                                disabled={busyDm === dm.id}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-gray-500 text-xs w-16 shrink-0">{s.className}</span>
                              <span className="text-gray-900">{s.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2 border-t border-gray-100 bg-gray-50 rounded-b-md">
                      <span className="text-xs text-gray-500">
                        {pickedCount === 0 ? t('None selected') : `${pickedCount} ${pickedCount === 1 ? t('selected') : t('selected')}`}
                      </span>
                      <button
                        onClick={() => handleAssign(dm)}
                        disabled={pickedCount === 0 || busyDm === dm.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                      >
                        <UserPlusIcon className="w-4 h-4" />
                        {busyDm === dm.id
                          ? t('Assigning…')
                          : pickedCount > 1
                            ? `${t('Assign')} ${pickedCount}`
                            : t('Assign')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
