'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { XMarkIcon, ArrowPathIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import apiService from '@/lib/apiService';
import { useAuth } from '@/components/context/AuthContext';
import {
  listDisciplineMasters,
  assignDisciplineMaster,
  unassignDisciplineMaster,
  type DisciplineMasterUser,
} from '@/lib/disciplineExtApi';
import { sortSubClassesByLevel } from '@/lib/classOrdering';

interface SubClassOption {
  id: number;
  name: string;
  className?: string;
}

// Assign Discipline Masters to the subclasses they supervise. The DM slot
// roll-call endpoints only accept subclasses assigned here (admin roles bypass).
export default function DmAssignmentsPage() {
  const { selectedAcademicYear } = useAuth();
  const yearId = selectedAcademicYear?.id;

  const [dms, setDms] = useState<DisciplineMasterUser[]>([]);
  const [subClasses, setSubClasses] = useState<SubClassOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingPick, setPendingPick] = useState<Record<number, number | ''>>({}); // dmId -> subClassId
  const [busyDm, setBusyDm] = useState<number | null>(null);
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
      toast.error(error.message || 'Failed to load discipline masters.');
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

  const handleAssign = async (dm: DisciplineMasterUser) => {
    const subClassId = pendingPick[dm.id];
    if (!subClassId) return;
    setBusyDm(dm.id);
    try {
      await assignDisciplineMaster(dm.id, Number(subClassId), yearId);
      toast.success(`${dm.name} assigned to ${subClassLabel(Number(subClassId))}.`);
      setLocalAssignments(prev => ({ ...prev, [dm.id]: [...(prev[dm.id] || []), Number(subClassId)] }));
      setPendingPick(prev => ({ ...prev, [dm.id]: '' }));
      refresh();
    } catch (error: any) {
      // Duplicate assignment surfaces as a 500 (P2002) — treat as already assigned
      const msg = String(error.message || '');
      if (msg.includes('P2002') || msg.toLowerCase().includes('unique') || msg.includes('500')) {
        toast(`${dm.name} is already assigned to that subclass.`, { icon: 'ℹ️' });
        setLocalAssignments(prev => ({ ...prev, [dm.id]: [...(prev[dm.id] || []), Number(subClassId)] }));
      } else {
        toast.error(msg || 'Failed to assign.');
      }
    } finally {
      setBusyDm(null);
    }
  };

  const handleUnassign = async (dm: DisciplineMasterUser, subClassId: number) => {
    if (!window.confirm(`Remove ${dm.name} from ${subClassLabel(subClassId)}?`)) return;
    setBusyDm(dm.id);
    try {
      await unassignDisciplineMaster(dm.id, subClassId, yearId);
      toast.success('Assignment removed.');
      setLocalAssignments(prev => ({ ...prev, [dm.id]: (prev[dm.id] || []).filter(id => id !== subClassId) }));
      setDms(prev => prev.map(d => (d.id === dm.id
        ? { ...d, assignments: d.assignments.filter(a => a.subClassId !== subClassId) }
        : d)));
      refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove assignment.');
    } finally {
      setBusyDm(null);
    }
  };

  const assignedCount = useMemo(() => dms.reduce((n, dm) => n + assignedFor(dm).length, 0), [dms, assignedFor]);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DM Assignments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Assign discipline masters to the subclasses they supervise
            {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''} · {assignedCount} active assignment{assignedCount === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
        >
          <ArrowPathIcon className="w-4 h-4" /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Loading discipline masters…</div>
      ) : dms.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No users with the Discipline Master role were found.
        </div>
      ) : (
        <div className="space-y-4">
          {dms.map(dm => {
            const assigned = assignedFor(dm);
            const available = subClasses.filter(s => !assigned.includes(s.id));
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
                          title="Remove assignment"
                        >
                          <XMarkIcon className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <select
                    value={pendingPick[dm.id] ?? ''}
                    onChange={e => setPendingPick(prev => ({ ...prev, [dm.id]: Number(e.target.value) || '' }))}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                    disabled={busyDm === dm.id}
                  >
                    <option value="">Select subclass to assign…</option>
                    {available.map(s => (
                      <option key={s.id} value={s.id}>{s.className ? `${s.className} — ${s.name}` : s.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAssign(dm)}
                    disabled={!pendingPick[dm.id] || busyDm === dm.id}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium shrink-0"
                  >
                    <UserPlusIcon className="w-4 h-4" /> Assign
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
