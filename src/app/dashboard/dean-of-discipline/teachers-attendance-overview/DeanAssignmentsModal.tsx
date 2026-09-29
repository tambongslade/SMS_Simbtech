'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Modal } from '@/components/ui';
import { useLanguage } from '@/components/context/LanguageContext';
import { sortSubClassesByLevel } from '@/lib/classOrdering';
import {
  type DeanAssignment,
  listDeansWithAssignments,
  setDeanSubClasses,
} from '@/lib/teacherAttendanceApi';

interface SubClassOption {
  id: number;
  name: string;
  className: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  subClasses: SubClassOption[];
  academicYearId?: number;
  /** Called after a successful save so the page can reload its data. */
  onSaved: () => void;
}

// Lets a Manager / Super Manager choose which sub-classes each Dean of Discipline
// is responsible for. Those are the classes the dean sees in "My classes".
export default function DeanAssignmentsModal({ isOpen, onClose, subClasses, academicYearId, onSaved }: Props) {
  const { t } = useLanguage();
  const [deans, setDeans] = useState<DeanAssignment[]>([]);
  const [deanId, setDeanId] = useState<number | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const list = await listDeansWithAssignments(academicYearId);
        if (cancelled) return;
        setDeans(list);
        const first = list[0];
        setDeanId(first ? first.id : null);
        setPicked(new Set(first?.subClassIds ?? []));
      } catch (error) {
        toast.error(error instanceof Error && error.message ? error.message : t('Failed to load deans of discipline.'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, academicYearId, t]);

  const selectDean = (id: number) => {
    setDeanId(id);
    setPicked(new Set(deans.find(d => d.id === id)?.subClassIds ?? []));
  };

  const byClass = useMemo(() => {
    const map = new Map<string, SubClassOption[]>();
    sortSubClassesByLevel(subClasses).forEach(sc => {
      const arr = map.get(sc.className) ?? [];
      arr.push(sc);
      map.set(sc.className, arr);
    });
    return Array.from(map.entries());
  }, [subClasses]);

  const toggle = (id: number) =>
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleClass = (items: SubClassOption[]) =>
    setPicked(prev => {
      const next = new Set(prev);
      const allIn = items.every(i => next.has(i.id));
      items.forEach(i => (allIn ? next.delete(i.id) : next.add(i.id)));
      return next;
    });

  const save = async () => {
    if (deanId == null) return;
    setIsSaving(true);
    try {
      await setDeanSubClasses(deanId, Array.from(picked), academicYearId);
      toast.success(t('Classes assigned.'));
      setDeans(prev => prev.map(d => (d.id === deanId ? { ...d, subClassIds: Array.from(picked) } : d)));
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : t('Failed to save assignments.'));
    } finally {
      setIsSaving(false);
    }
  };

  const dean = deans.find(d => d.id === deanId);
  const dirty = dean ? dean.subClassIds.length !== picked.size || dean.subClassIds.some(id => !picked.has(id)) : false;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('Assign classes to Deans of Discipline')} size="lg">
      {isLoading ? (
        <div className="p-6 text-center text-sm text-gray-500">{t('Loading...')}</div>
      ) : deans.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-500">{t('No users with the Dean of Discipline role were found.')}</div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('Dean of Discipline')}</label>
            <select
              value={deanId ?? ''}
              onChange={e => selectDean(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              {deans.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.subClassIds.length})
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[50vh] overflow-y-auto border rounded-md divide-y">
            {byClass.map(([className, items]) => {
              const allIn = items.every(i => picked.has(i.id));
              return (
                <div key={className} className="p-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <input
                      type="checkbox"
                      checked={allIn}
                      onChange={() => toggleClass(items)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    {className}
                  </label>
                  <div className="mt-2 ml-6 flex flex-wrap gap-x-4 gap-y-1">
                    {items.map(sc => (
                      <label key={sc.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={picked.has(sc.id)}
                          onChange={() => toggle(sc.id)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        {sc.name}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {picked.size} {t('sub-classes selected')}
            </span>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm">
                {t('Close')}
              </button>
              <button
                onClick={save}
                disabled={isSaving || !dirty}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {isSaving ? t('Saving...') : t('Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
