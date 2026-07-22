'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { XMarkIcon, PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import apiService from '@/lib/apiService';
import {
  HEALTH_CONDITIONS,
  enumLabel,
  type HealthCondition,
  type PreviousSchool,
  type SiblingInfo,
  getPreviousSchools,
  addPreviousSchool,
  updatePreviousSchool,
  deletePreviousSchool,
  getSiblings,
} from '@/lib/disciplineExtApi';

interface AcademicYearOption {
  id: number;
  name: string;
}

interface StudentExtrasModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: number;
  studentName: string;
  /** Current values, if the caller already has them; the health tab is prefilled from these. */
  initialHealthConditions?: HealthCondition[] | null;
  initialMedicalNotes?: string | null;
  initialAdmissionAcademicYearId?: number | null;
  /** Called after the health/admission tab saves, so the parent list can refresh. */
  onSaved?: () => void;
}

type Tab = 'health' | 'schools' | 'siblings';

export function StudentExtrasModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  initialHealthConditions,
  initialMedicalNotes,
  initialAdmissionAcademicYearId,
  onSaved,
}: StudentExtrasModalProps) {
  const [tab, setTab] = useState<Tab>('health');

  // Health & admission
  const [healthConditions, setHealthConditions] = useState<HealthCondition[]>(initialHealthConditions || []);
  const [medicalNotes, setMedicalNotes] = useState(initialMedicalNotes || '');
  const [admissionYearId, setAdmissionYearId] = useState<number | ''>(initialAdmissionAcademicYearId || '');
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [isSavingHealth, setIsSavingHealth] = useState(false);

  // Previous schools
  const [schools, setSchools] = useState<PreviousSchool[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [editingSchool, setEditingSchool] = useState<PreviousSchool | 'new' | null>(null);
  const [schoolForm, setSchoolForm] = useState({ schoolName: '', fromYear: '', toYear: '', notes: '' });
  const [isSavingSchool, setIsSavingSchool] = useState(false);

  // Siblings
  const [siblings, setSiblings] = useState<SiblingInfo[]>([]);
  const [isLoadingSiblings, setIsLoadingSiblings] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTab('health');
    setHealthConditions(initialHealthConditions || []);
    setMedicalNotes(initialMedicalNotes || '');
    setAdmissionYearId(initialAdmissionAcademicYearId || '');
    setEditingSchool(null);
    (async () => {
      try {
        const res = await apiService.get('/academic-years');
        setAcademicYears((res.data || []).map((y: any) => ({ id: y.id, name: y.name })));
      } catch { /* year picker stays empty */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, studentId]);

  const loadSchools = useCallback(async () => {
    setIsLoadingSchools(true);
    try {
      setSchools(await getPreviousSchools(studentId));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load previous schools.');
    } finally {
      setIsLoadingSchools(false);
    }
  }, [studentId]);

  const loadSiblings = useCallback(async () => {
    setIsLoadingSiblings(true);
    try {
      setSiblings(await getSiblings(studentId));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load siblings.');
    } finally {
      setIsLoadingSiblings(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (!isOpen) return;
    if (tab === 'schools') loadSchools();
    if (tab === 'siblings') loadSiblings();
  }, [isOpen, tab, loadSchools, loadSiblings]);

  if (!isOpen) return null;

  const toggleCondition = (c: HealthCondition) => {
    setHealthConditions(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]));
  };

  const saveHealth = async () => {
    setIsSavingHealth(true);
    try {
      await apiService.put(`/students/${studentId}`, {
        healthConditions,
        medicalNotes: medicalNotes || null,
        ...(admissionYearId ? { admissionAcademicYearId: Number(admissionYearId) } : {}),
      });
      toast.success('Student health & admission info saved.');
      onSaved?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save.');
    } finally {
      setIsSavingHealth(false);
    }
  };

  const startSchoolEdit = (s: PreviousSchool | 'new') => {
    setEditingSchool(s);
    setSchoolForm(
      s === 'new'
        ? { schoolName: '', fromYear: '', toYear: '', notes: '' }
        : { schoolName: s.schoolName, fromYear: s.fromYear || '', toYear: s.toYear || '', notes: s.notes || '' }
    );
  };

  const saveSchool = async () => {
    if (!schoolForm.schoolName.trim()) return;
    setIsSavingSchool(true);
    try {
      const body = {
        schoolName: schoolForm.schoolName.trim(),
        fromYear: schoolForm.fromYear || undefined,
        toYear: schoolForm.toYear || undefined,
        notes: schoolForm.notes || undefined,
      };
      if (editingSchool === 'new') {
        await addPreviousSchool(studentId, body);
        toast.success('Previous school added.');
      } else if (editingSchool) {
        await updatePreviousSchool(studentId, editingSchool.id, body);
        toast.success('Previous school updated.');
      }
      setEditingSchool(null);
      loadSchools();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save previous school.');
    } finally {
      setIsSavingSchool(false);
    }
  };

  const removeSchool = async (s: PreviousSchool) => {
    if (!window.confirm(`Delete "${s.schoolName}" from previous schools?`)) return;
    try {
      await deletePreviousSchool(studentId, s.id);
      toast.success('Previous school deleted.');
      loadSchools();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete previous school.');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-5 sm:p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold mb-1">Student Profile Extras</h2>
        <p className="text-sm text-gray-500 mb-4">{studentName}</p>

        <div className="flex gap-2 border-b border-gray-200 mb-4">
          {([
            ['health', 'Health & Admission'],
            ['schools', 'Previous Schools'],
            ['siblings', 'Siblings'],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'health' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Health conditions</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {HEALTH_CONDITIONS.map(c => (
                  <label key={c.value} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={healthConditions.includes(c.value)}
                      onChange={() => toggleCondition(c.value)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medical notes</label>
              <textarea
                value={medicalNotes}
                onChange={e => setMedicalNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="e.g. Peanut allergy — carries epi-pen"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admission academic year</label>
              <select
                value={admissionYearId}
                onChange={e => setAdmissionYearId(Number(e.target.value) || '')}
                className="w-full rounded-md border-gray-300 border px-3 py-2 text-sm"
              >
                <option value="">Not set</option>
                {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">Any year is valid, including future ones (pre-registration).</p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={saveHealth}
                disabled={isSavingHealth}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingHealth ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {tab === 'schools' && (
          <div className="space-y-3">
            {isLoadingSchools ? (
              <p className="text-gray-500 text-sm py-4">Loading…</p>
            ) : (
              <>
                {schools.length === 0 && !editingSchool && (
                  <p className="text-gray-500 text-sm py-2">No previous schools recorded.</p>
                )}
                <ul className="divide-y divide-gray-100">
                  {schools.map(s => (
                    <li key={s.id} className="py-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.schoolName}</p>
                        <p className="text-xs text-gray-500">
                          {[s.fromYear, s.toYear].filter(Boolean).join(' → ') || 'Years not specified'}
                          {s.notes ? ` · ${s.notes}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => startSchoolEdit(s)} className="text-blue-600 hover:text-blue-800" title="Edit">
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => removeSchool(s)} className="text-red-500 hover:text-red-700" title="Delete">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {editingSchool ? (
                  <div className="border border-gray-200 rounded-md p-3 space-y-3 bg-gray-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">School name</label>
                        <input
                          type="text"
                          value={schoolForm.schoolName}
                          onChange={e => setSchoolForm(f => ({ ...f, schoolName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="e.g. Sacred Heart College"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">From year</label>
                        <input
                          type="text"
                          value={schoolForm.fromYear}
                          onChange={e => setSchoolForm(f => ({ ...f, fromYear: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder='e.g. "2018" or "2018-2019"'
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">To year</label>
                        <input
                          type="text"
                          value={schoolForm.toYear}
                          onChange={e => setSchoolForm(f => ({ ...f, toYear: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder='e.g. "2020"'
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                        <input
                          type="text"
                          value={schoolForm.notes}
                          onChange={e => setSchoolForm(f => ({ ...f, notes: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="e.g. KG to Grade 2"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingSchool(null)} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
                      <button
                        onClick={saveSchool}
                        disabled={isSavingSchool || !schoolForm.schoolName.trim()}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSavingSchool ? 'Saving…' : editingSchool === 'new' ? 'Add School' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => startSchoolEdit('new')}
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <PlusIcon className="w-4 h-4" /> Add previous school
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'siblings' && (
          <div>
            {isLoadingSiblings ? (
              <p className="text-gray-500 text-sm py-4">Loading…</p>
            ) : siblings.length === 0 ? (
              <p className="text-gray-500 text-sm py-2">
                No siblings found. Siblings are derived from shared linked parents.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {siblings.map(sib => (
                  <li key={sib.student.id} className="py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {sib.student.name}
                      {sib.student.matricule && <span className="text-gray-400 font-normal"> · {sib.student.matricule}</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {sib.currentEnrollment?.subClass
                        ? `${sib.currentEnrollment.subClass.class?.name || ''} ${sib.currentEnrollment.subClass.name}`.trim()
                        : 'Not enrolled this year'}
                    </p>
                    {sib.sharedParents.length > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Shared parent{sib.sharedParents.length > 1 ? 's' : ''}:{' '}
                        {sib.sharedParents
                          .map(p => `${p.parent.name}${p.targetRelationship ? ` (${enumLabel(p.targetRelationship)})` : ''}`)
                          .join(', ')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentExtrasModal;
