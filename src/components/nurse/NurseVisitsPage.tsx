'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  HeartIcon,
  PlusIcon,
  XMarkIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import apiService from '@/lib/apiService';
import { useAuth } from '@/components/context/AuthContext';
import { HEALTH_CONDITIONS, enumLabel } from '@/lib/disciplineExtApi';
import {
  type HealthProfile,
  type NurseVisit,
  NURSE_LOG_ROLES,
  NURSE_DELETE_ROLES,
  getHealthProfile,
  createNurseVisit,
  listNurseVisits,
  updateNurseVisit,
  deleteNurseVisit,
} from '@/lib/nurseApi';

const CONDITION_LABELS: Record<string, string> = HEALTH_CONDITIONS.reduce(
  (acc, c) => ({ ...acc, [c.value]: c.label }),
  {} as Record<string, string>
);

const dt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

interface SearchStudent {
  id: number;
  name: string;
  matricule?: string;
  className?: string;
  subClassName?: string;
}

function VisitRow({ v, showStudent, canEdit, canDelete, onEdit, onDelete }: {
  v: NurseVisit;
  showStudent: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (v: NurseVisit) => void;
  onDelete: (v: NurseVisit) => void;
}) {
  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {showStudent && v.enrollment?.student?.name ? `${v.enrollment.student.name} — ` : ''}{v.reason}
            {v.sentHome && <span className="ml-2 text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded-full">Sent home</span>}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {dt(v.visitDate)}
            {v.period?.name ? ` · ${v.period.name}` : ''}
            {v.loggedBy?.name ? ` · logged by ${v.loggedBy.name}` : ''}
          </p>
          {(v.treatmentGiven || v.medicationGiven) && (
            <p className="text-xs text-gray-600 mt-0.5">
              {v.treatmentGiven || ''}{v.treatmentGiven && v.medicationGiven ? ' · ' : ''}
              {v.medicationGiven ? `💊 ${v.medicationGiven}` : ''}
            </p>
          )}
          {v.notes && <p className="text-xs text-gray-400 mt-0.5">{v.notes}</p>}
        </div>
        <div className="flex gap-1.5 shrink-0">
          {canEdit && (
            <button onClick={() => onEdit(v)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Edit visit">
              <PencilSquareIcon className="w-4 h-4" />
            </button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(v)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md" title="Delete visit">
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function NurseVisitsPage() {
  const { selectedRole, selectedAcademicYear } = useAuth();
  const canLog = NURSE_LOG_ROLES.includes(selectedRole || '');
  const canDelete = NURSE_DELETE_ROLES.includes(selectedRole || '');

  // Student search + profile
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<SearchStudent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<SearchStudent | null>(null);
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Visit list (all students)
  const [visits, setVisits] = useState<NurseVisit[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);

  // Log / edit modal
  const [modalVisit, setModalVisit] = useState<NurseVisit | 'new' | null>(null);

  useEffect(() => {
    if (term.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiService.get(`/students/search?q=${encodeURIComponent(term)}&limit=10${selectedAcademicYear?.id ? `&academicYearId=${selectedAcademicYear.id}` : ''}`);
        const inner = res.data?.data ?? res.data ?? [];
        setResults((Array.isArray(inner) ? inner : []).map((s: any) => {
          const enrollments: any[] = s.enrollments || [];
          const current = enrollments[enrollments.length - 1];
          const subClass = current?.subClass ?? current?.sub_class;
          return { id: s.id, name: s.name, matricule: s.matricule, className: subClass?.class?.name, subClassName: subClass?.name };
        }));
      } catch { setResults([]); } finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [term, selectedAcademicYear?.id]);

  const openProfile = useCallback(async (s: SearchStudent) => {
    setSelected(s);
    setProfile(null);
    setIsLoadingProfile(true);
    try {
      setProfile(await getHealthProfile(s.id, selectedAcademicYear?.id));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load health profile.');
    } finally {
      setIsLoadingProfile(false);
    }
  }, [selectedAcademicYear?.id]);

  const refreshVisits = useCallback(async () => {
    setIsLoadingVisits(true);
    try {
      const res = await listNurseVisits({
        academicYearId: selectedAcademicYear?.id,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: 50,
      });
      setVisits(res.data);
      setTotalPages(res.meta?.totalPages || 1);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load visits.');
    } finally {
      setIsLoadingVisits(false);
    }
  }, [selectedAcademicYear?.id, from, to, page]);

  useEffect(() => { refreshVisits(); }, [refreshVisits]);

  const handleDelete = async (v: NurseVisit) => {
    if (!window.confirm(`Delete this visit (${v.reason})?`)) return;
    try {
      await deleteNurseVisit(v.id);
      toast.success('Visit deleted.');
      refreshVisits();
      if (selected) openProfile(selected);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete visit.');
    }
  };

  const afterSave = () => {
    setModalVisit(null);
    refreshVisits();
    if (selected) openProfile(selected);
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HeartIcon className="w-7 h-7 text-rose-500" /> Nurse Visits
          </h1>
          <p className="text-sm text-gray-500 mt-1">Student health profiles and infirmary visit log.</p>
        </div>
        {canLog && (
          <button
            onClick={() => setModalVisit('new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" /> Log Visit
          </button>
        )}
      </div>

      {/* Student search / health profile */}
      {!selected ? (
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Look up a student's health profile</label>
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={term}
              onChange={e => setTerm(e.target.value)}
              placeholder="Search by name or matricule…"
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>
          {isSearching && <p className="text-xs text-gray-400 mt-2">Searching…</p>}
          {results.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-md divide-y divide-gray-100 max-h-56 overflow-y-auto">
              {results.map(s => (
                <button key={s.id} onClick={() => openProfile(s)} className="w-full text-left p-2.5 text-sm hover:bg-gray-50">
                  {s.name} <span className="text-xs text-gray-400">{s.matricule || ''}{s.subClassName ? ` · ${s.className || ''} ${s.subClassName}` : ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <button onClick={() => { setSelected(null); setProfile(null); }} className="inline-flex items-center gap-1.5 text-sm text-rose-600 hover:text-rose-800">
            <ArrowLeftIcon className="w-4 h-4" /> Back to search
          </button>
          {isLoadingProfile ? (
            <p className="text-sm text-gray-500 py-4">Loading health profile…</p>
          ) : profile ? (
            <>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{profile.student.name}</h2>
                <p className="text-xs text-gray-500">
                  {profile.student.matricule || ''}
                  {profile.enrollment?.subClass ? ` · ${profile.enrollment.class?.name || ''} ${profile.enrollment.subClass.name}` : ''}
                  {profile.student.gender ? ` · ${profile.student.gender}` : ''}
                  {profile.student.dateOfBirth ? ` · born ${new Date(profile.student.dateOfBirth).toLocaleDateString()}` : ''}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">Health conditions</p>
                {profile.student.healthConditions.length === 0 ? (
                  <p className="text-sm text-gray-400">None recorded.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.student.healthConditions.map(c => (
                      <span key={c} className="px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-medium rounded-full">
                        {CONDITION_LABELS[c] || enumLabel(c)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {profile.student.medicalNotes && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Medical notes</p>
                  <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-md p-2.5">{profile.student.medicalNotes}</p>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase">Recent visits ({profile.recentVisits.length})</p>
                  {canLog && (
                    <button onClick={() => setModalVisit('new')} className="text-xs text-rose-600 hover:text-rose-800 font-medium">
                      + Log visit for {profile.student.name.split(' ')[0]}
                    </button>
                  )}
                </div>
                {profile.recentVisits.length === 0 ? (
                  <p className="text-sm text-gray-400">No infirmary visits recorded.</p>
                ) : (
                  <ul className="divide-y divide-gray-50 border border-gray-100 rounded-md">
                    {profile.recentVisits.map(v => (
                      <VisitRow key={v.id} v={v} showStudent={false} canEdit={canLog} canDelete={canDelete}
                        onEdit={setModalVisit} onDelete={handleDelete} />
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* All visits */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-semibold text-sm text-gray-900">All Visits{selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}</h2>
          <div className="flex flex-wrap items-end gap-2">
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs" title="From" />
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs" title="To" />
            <button onClick={refreshVisits} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md" title="Refresh">
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        {isLoadingVisits ? (
          <p className="p-5 text-sm text-gray-500">Loading visits…</p>
        ) : visits.length === 0 ? (
          <p className="p-5 text-sm text-gray-400 text-center">No visits recorded for these filters.</p>
        ) : (
          <>
            <ul className="divide-y divide-gray-50">
              {visits.map(v => (
                <VisitRow key={v.id} v={v} showStudent canEdit={canLog} canDelete={canDelete}
                  onEdit={setModalVisit} onDelete={handleDelete} />
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between text-sm">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-rose-600 disabled:text-gray-300">← Prev</button>
                <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="text-rose-600 disabled:text-gray-300">Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {modalVisit && (
        <VisitModal
          visit={modalVisit === 'new' ? null : modalVisit}
          presetStudent={modalVisit === 'new' && selected ? selected : null}
          academicYearId={selectedAcademicYear?.id}
          onClose={() => setModalVisit(null)}
          onSaved={afterSave}
        />
      )}
    </div>
  );
}

function VisitModal({ visit, presetStudent, academicYearId, onClose, onSaved }: {
  visit: NurseVisit | null;
  presetStudent: SearchStudent | null;
  academicYearId?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!visit;
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<SearchStudent[]>([]);
  const [student, setStudent] = useState<SearchStudent | null>(presetStudent);
  const [reason, setReason] = useState(visit?.reason || '');
  const [visitDate, setVisitDate] = useState(() =>
    (visit?.visitDate ? new Date(visit.visitDate) : new Date()).toISOString().slice(0, 16));
  const [treatmentGiven, setTreatmentGiven] = useState(visit?.treatmentGiven || '');
  const [medicationGiven, setMedicationGiven] = useState(visit?.medicationGiven || '');
  const [notes, setNotes] = useState(visit?.notes || '');
  const [sentHome, setSentHome] = useState(!!visit?.sentHome);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEdit || term.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await apiService.get(`/students/search?q=${encodeURIComponent(term)}&limit=10${academicYearId ? `&academicYearId=${academicYearId}` : ''}`);
        const inner = res.data?.data ?? res.data ?? [];
        setResults((Array.isArray(inner) ? inner : []).map((s: any) => ({ id: s.id, name: s.name, matricule: s.matricule })));
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [term, isEdit, academicYearId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setIsSaving(true);
    try {
      if (isEdit && visit) {
        await updateNurseVisit(visit.id, {
          reason: reason.trim(),
          visitDate: new Date(visitDate).toISOString(),
          treatmentGiven: treatmentGiven || undefined,
          medicationGiven: medicationGiven || undefined,
          notes: notes || undefined,
          sentHome,
        });
        toast.success('Visit updated.');
      } else {
        if (!student) return;
        await createNurseVisit({
          studentId: student.id,
          reason: reason.trim(),
          academicYearId,
          visitDate: new Date(visitDate).toISOString(),
          treatmentGiven: treatmentGiven || undefined,
          medicationGiven: medicationGiven || undefined,
          notes: notes || undefined,
          sentHome,
        });
        toast.success(`Visit logged for ${student.name}.`);
      }
      onSaved();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save visit.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold mb-4">{isEdit ? 'Edit Visit' : 'Log Nurse Visit'}</h3>
        <form onSubmit={submit} className="space-y-3">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
              {student ? (
                <div className="flex items-center justify-between p-2 border rounded bg-gray-50 text-sm">
                  <span>{student.name} {student.matricule ? `(${student.matricule})` : ''}</span>
                  <button type="button" className="text-rose-600 text-xs" onClick={() => setStudent(null)}>Change</button>
                </div>
              ) : (
                <>
                  <input type="text" value={term} onChange={e => setTerm(e.target.value)}
                    placeholder="Search student…" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  {results.length > 0 && (
                    <div className="mt-1 border border-gray-200 rounded-md max-h-36 overflow-y-auto">
                      {results.map(s => (
                        <button key={s.id} type="button" onClick={() => { setStudent(s); setResults([]); setTerm(''); }}
                          className="w-full text-left p-2 text-sm hover:bg-gray-100 border-b border-gray-100 last:border-b-0">
                          {s.name} {s.matricule ? `(${s.matricule})` : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} required
              placeholder="e.g. Headache" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visit date & time</label>
            <input type="datetime-local" value={visitDate} onChange={e => setVisitDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Treatment given</label>
              <input type="text" value={treatmentGiven} onChange={e => setTreatmentGiven(e.target.value)}
                placeholder="e.g. Rested for 15 min" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medication given</label>
              <input type="text" value={medicationGiven} onChange={e => setMedicationGiven(e.target.value)}
                placeholder="e.g. Paracetamol 500 mg" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="e.g. Cleared to return to class" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={sentHome} onChange={e => setSentHome(e.target.checked)}
              className="h-4 w-4 text-rose-600 border-gray-300 rounded" />
            Student was sent home
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
            <button type="submit" disabled={isSaving || !reason.trim() || (!isEdit && !student)}
              className="px-4 py-2 bg-rose-600 text-white rounded-md text-sm hover:bg-rose-700 disabled:opacity-50">
              {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Log Visit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
