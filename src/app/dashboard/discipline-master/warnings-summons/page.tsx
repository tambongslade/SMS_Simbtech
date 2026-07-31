'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { PlusIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import apiService from '@/lib/apiService';
import {
  WARNING_REASONS,
  SUMMONS_STATUSES,
  enumLabel,
  type DisciplineWarning,
  type ParentSummons,
  type SummonsStatus,
  type WarningReason,
  listWarnings,
  createWarning,
  resolveWarning,
  listSummons,
  createSummons,
  updateSummons,
} from '@/lib/disciplineExtApi';

interface SubClassOption {
  id: number;
  name: string;
  className?: string;
}

// Escalation dots: level 1 fires at ≥3 unexcused absences, 2 at ≥6, 3 at ≥9
function WarningLevelDots({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`Warning level ${level}`}>
      {[1, 2, 3].map(i => (
        <span
          key={i}
          className={`w-2.5 h-2.5 rounded-full ${
            i <= level ? (level >= 3 ? 'bg-red-500' : level === 2 ? 'bg-orange-500' : 'bg-yellow-500') : 'bg-gray-200'
          }`}
        />
      ))}
    </span>
  );
}

function summonsStatusBadge(status: SummonsStatus) {
  const styles: Record<SummonsStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    SCHEDULED: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    MISSED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status]}`}>
      {enumLabel(status)}
    </span>
  );
}

// Student search used by both create modals to resolve an enrollmentId
function StudentEnrollmentSearch({
  onSelect,
  selectedLabel,
  onClear,
}: {
  onSelect: (enrollmentId: number, label: string) => void;
  selectedLabel: string | null;
  onClear: () => void;
}) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (term.length < 3) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        // /students/search returns a double-nested envelope: { data: { data: [...] } }
        const res = await apiService.get(`/students/search?q=${encodeURIComponent(term)}&limit=10`);
        const inner = res.data?.data ?? res.data ?? [];
        setResults(Array.isArray(inner) ? inner : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [term]);

  if (selectedLabel) {
    return (
      <div className="flex items-center justify-between p-2 border rounded bg-gray-50">
        <span className="text-sm text-gray-700">Selected: {selectedLabel}</span>
        <button type="button" className="text-blue-600 text-sm" onClick={onClear}>Change</button>
      </div>
    );
  }

  return (
    <div>
      <input
        type="text"
        value={term}
        onChange={e => setTerm(e.target.value)}
        placeholder="Search student (min 3 characters)…"
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
      />
      {searching && <p className="text-xs text-gray-400 mt-1">Searching…</p>}
      {results.length > 0 && (
        <div className="mt-1 border border-gray-200 rounded-md max-h-40 overflow-y-auto">
          {results.map((s: any) => {
            // Most recent enrollment (same heuristic as the secretary student mapper)
            const enrollments: any[] = s.enrollments || [];
            const enrollment = enrollments[enrollments.length - 1];
            const enrollmentId = enrollment?.id;
            const cls = enrollment?.subClass?.name || enrollment?.sub_class?.name || '';
            return (
              <button
                key={s.id}
                type="button"
                disabled={!enrollmentId}
                onClick={() => enrollmentId && onSelect(enrollmentId, `${s.name} (${s.matricule || 'no matricule'})`)}
                className="w-full text-left p-2 text-sm hover:bg-gray-100 border-b border-gray-100 last:border-b-0 disabled:opacity-50"
              >
                {s.name} {s.matricule ? `(${s.matricule})` : ''} {cls && <span className="text-gray-400">— {cls}</span>}
                {!enrollmentId && <span className="text-red-400 ml-1">not enrolled</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function WarningsSummonsPage() {
  const [activeTab, setActiveTab] = useState<'warnings' | 'summons'>('warnings');
  const [subClasses, setSubClasses] = useState<SubClassOption[]>([]);
  const [subClassFilter, setSubClassFilter] = useState<number | ''>('');

  // Warnings state
  const [warnings, setWarnings] = useState<DisciplineWarning[]>([]);
  const [warningsResolvedFilter, setWarningsResolvedFilter] = useState<'false' | 'true' | 'all'>('false');
  const [isLoadingWarnings, setIsLoadingWarnings] = useState(false);
  const [showCreateWarning, setShowCreateWarning] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<DisciplineWarning | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  // Summons state
  const [summons, setSummons] = useState<ParentSummons[]>([]);
  const [summonsStatusFilter, setSummonsStatusFilter] = useState<SummonsStatus | 'all'>('PENDING');
  const [isLoadingSummons, setIsLoadingSummons] = useState(false);
  const [showCreateSummons, setShowCreateSummons] = useState(false);
  const [editSummons, setEditSummons] = useState<ParentSummons | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.get('/classes/sub-classes?limit=200');
        setSubClasses((res.data || []).map((s: any) => ({ id: s.id, name: s.name, className: s.class?.name })));
      } catch { /* filter stays empty */ }
    })();
  }, []);

  const refreshWarnings = useCallback(async () => {
    setIsLoadingWarnings(true);
    try {
      const data = await listWarnings({
        subClassId: subClassFilter || undefined,
        resolved: warningsResolvedFilter === 'all' ? undefined : warningsResolvedFilter === 'true',
      });
      setWarnings(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load warnings.');
    } finally {
      setIsLoadingWarnings(false);
    }
  }, [subClassFilter, warningsResolvedFilter]);

  const refreshSummons = useCallback(async () => {
    setIsLoadingSummons(true);
    try {
      const data = await listSummons({
        subClassId: subClassFilter || undefined,
        status: summonsStatusFilter === 'all' ? undefined : summonsStatusFilter,
      });
      setSummons(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load summons.');
    } finally {
      setIsLoadingSummons(false);
    }
  }, [subClassFilter, summonsStatusFilter]);

  useEffect(() => { refreshWarnings(); }, [refreshWarnings]);
  useEffect(() => { refreshSummons(); }, [refreshSummons]);

  const handleResolve = async () => {
    if (!resolveTarget) return;
    setIsSaving(true);
    try {
      await resolveWarning(resolveTarget.id, resolveNotes);
      toast.success('Warning resolved.');
      setResolveTarget(null);
      setResolveNotes('');
      refreshWarnings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to resolve warning.');
    } finally {
      setIsSaving(false);
    }
  };

  const studentCell = (item: { enrollment?: { student?: { name?: string; matricule?: string }; subClass?: any } }) => (
    <div>
      <div className="text-sm font-medium text-gray-900">{item.enrollment?.student?.name || '—'}</div>
      <div className="text-xs text-gray-500">
        {item.enrollment?.student?.matricule || ''}
        {item.enrollment?.subClass?.class?.name ? ` · ${item.enrollment.subClass.class.name}${item.enrollment.subClass.name ? ` ${item.enrollment.subClass.name}` : ''}` : ''}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warnings & Parent Summons</h1>
          <p className="text-sm text-gray-500 mt-1">
            Automatic and manual discipline follow-up. Excused absences reverse related warnings and summons automatically.
          </p>
        </div>
        <button
          onClick={() => (activeTab === 'warnings' ? setShowCreateWarning(true) : setShowCreateSummons(true))}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          <PlusIcon className="w-4 h-4" />
          {activeTab === 'warnings' ? 'New Warning' : 'New Summons'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['warnings', 'summons'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${
              activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'warnings' ? `Warnings (${warnings.length})` : `Summons (${summons.length})`}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sub-class</label>
          <select
            value={subClassFilter}
            onChange={e => setSubClassFilter(Number(e.target.value) || '')}
            className="rounded-md border-gray-300 border px-3 py-2 text-sm"
          >
            <option value="">All sub-classes</option>
            {subClasses.map(s => (
              <option key={s.id} value={s.id}>{s.className ? `${s.className} — ${s.name}` : s.name}</option>
            ))}
          </select>
        </div>
        {activeTab === 'warnings' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={warningsResolvedFilter}
              onChange={e => setWarningsResolvedFilter(e.target.value as any)}
              className="rounded-md border-gray-300 border px-3 py-2 text-sm"
            >
              <option value="false">Unresolved (action needed)</option>
              <option value="true">Resolved</option>
              <option value="all">All</option>
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={summonsStatusFilter}
              onChange={e => setSummonsStatusFilter(e.target.value as any)}
              className="rounded-md border-gray-300 border px-3 py-2 text-sm"
            >
              {SUMMONS_STATUSES.map(s => <option key={s} value={s}>{enumLabel(s)}</option>)}
              <option value="all">All</option>
            </select>
          </div>
        )}
        <button
          onClick={() => (activeTab === 'warnings' ? refreshWarnings() : refreshSummons())}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
        >
          <ArrowPathIcon className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Warnings list */}
      {activeTab === 'warnings' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoadingWarnings ? (
            <p className="p-6 text-gray-500">Loading warnings…</p>
          ) : warnings.length === 0 ? (
            <p className="p-6 text-gray-500 text-center">No warnings found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issued</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {warnings.map(w => (
                    <tr key={w.id} className={w.resolved ? 'opacity-60' : ''}>
                      <td className="px-4 py-3">{studentCell(w)}</td>
                      <td className="px-4 py-3"><WarningLevelDots level={w.warningLevel} /></td>
                      <td className="px-4 py-3 text-sm text-gray-700">{enumLabel(w.reason)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                        <p className="line-clamp-2">{w.description}</p>
                        {w.resolved && w.resolvedNotes && (
                          <p className="text-xs text-green-700 mt-1">Resolved: {w.resolvedNotes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {w.createdAt ? new Date(w.createdAt).toLocaleDateString() : '—'}
                        {w.issuedBy?.name && <div className="text-xs">{w.issuedBy.name}</div>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {w.resolved ? (
                          <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">Resolved</span>
                        ) : (
                          <button
                            onClick={() => { setResolveTarget(w); setResolveNotes(''); }}
                            className="px-3 py-1 text-sm text-green-700 border border-green-200 rounded-md hover:bg-green-50"
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Summons list */}
      {activeTab === 'summons' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoadingSummons ? (
            <p className="p-6 text-gray-500">Loading summons…</p>
          ) : summons.length === 0 ? (
            <p className="p-6 text-gray-500 text-center">No summons found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summons.map(s => (
                    <tr key={s.id} className={s.status === 'CANCELLED' ? 'opacity-60' : ''}>
                      <td className="px-4 py-3">{studentCell(s)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {s.parent?.name || '—'}
                        {s.parent?.phone && <div className="text-xs text-gray-500">{s.parent.phone}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                        <p className="line-clamp-2">{s.reason}</p>
                        <p className="text-xs text-gray-400">{enumLabel(s.triggerType)}</p>
                      </td>
                      <td className="px-4 py-3">{summonsStatusBadge(s.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {s.scheduledDate ? new Date(s.scheduledDate).toLocaleString() : '—'}
                        {s.attended != null && (
                          <div className="text-xs">{s.attended ? 'Parent attended' : 'Parent did not attend'}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setEditSummons(s)}
                          className="px-3 py-1 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showCreateWarning && (
        <CreateWarningModal
          onClose={() => setShowCreateWarning(false)}
          onCreated={() => { setShowCreateWarning(false); refreshWarnings(); }}
        />
      )}
      {showCreateSummons && (
        <CreateSummonsModal
          onClose={() => setShowCreateSummons(false)}
          onCreated={() => { setShowCreateSummons(false); refreshSummons(); }}
        />
      )}
      {editSummons && (
        <UpdateSummonsModal
          summons={editSummons}
          onClose={() => setEditSummons(null)}
          onSaved={() => { setEditSummons(null); refreshSummons(); }}
        />
      )}

      {/* Resolve warning modal */}
      {resolveTarget && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setResolveTarget(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold mb-1">Resolve Warning</h3>
            <p className="text-sm text-gray-500 mb-4">
              {resolveTarget.enrollment?.student?.name} — level {resolveTarget.warningLevel}, {enumLabel(resolveTarget.reason)}
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resolution notes</label>
            <textarea
              value={resolveNotes}
              onChange={e => setResolveNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="e.g. Behaviour improved; case closed"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setResolveTarget(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
              <button onClick={handleResolve} disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50">
                {isSaving ? 'Saving…' : 'Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateWarningModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [enrollmentId, setEnrollmentId] = useState<number | null>(null);
  const [studentLabel, setStudentLabel] = useState<string | null>(null);
  const [level, setLevel] = useState(1);
  const [reason, setReason] = useState<WarningReason>('MISCONDUCT');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentId) return;
    setIsSaving(true);
    try {
      await createWarning({ enrollmentId, warningLevel: level, reason, description });
      toast.success('Warning created.');
      onCreated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create warning.');
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
        <h3 className="text-lg font-semibold mb-4">New Warning</h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
            <StudentEnrollmentSearch
              selectedLabel={studentLabel}
              onSelect={(id, label) => { setEnrollmentId(id); setStudentLabel(label); }}
              onClear={() => { setEnrollmentId(null); setStudentLabel(null); }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select value={level} onChange={e => setLevel(Number(e.target.value))} className="w-full rounded-md border-gray-300 border px-3 py-2 text-sm">
                {[1, 2, 3].map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <select value={reason} onChange={e => setReason(e.target.value as WarningReason)} className="w-full rounded-md border-gray-300 border px-3 py-2 text-sm">
                {WARNING_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="e.g. Disrupted class during math"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
            <button type="submit" disabled={isSaving || !enrollmentId || !description.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
              {isSaving ? 'Saving…' : 'Create Warning'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateSummonsModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [enrollmentId, setEnrollmentId] = useState<number | null>(null);
  const [studentLabel, setStudentLabel] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentId) return;
    setIsSaving(true);
    try {
      await createSummons({
        enrollmentId,
        reason,
        scheduledDate: scheduledDate || undefined,
      });
      toast.success('Summons created. Parent defaults to father, then mother, then any linked parent.');
      onCreated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create summons.');
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
        <h3 className="text-lg font-semibold mb-4">New Parent Summons</h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
            <StudentEnrollmentSearch
              selectedLabel={studentLabel}
              onSelect={(id, label) => { setEnrollmentId(id); setStudentLabel(label); }}
              onClear={() => { setEnrollmentId(null); setStudentLabel(null); }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="e.g. Discuss chronic misconduct"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled date (optional)</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
            <button type="submit" disabled={isSaving || !enrollmentId || !reason.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
              {isSaving ? 'Saving…' : 'Create Summons'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UpdateSummonsModal({
  summons,
  onClose,
  onSaved,
}: {
  summons: ParentSummons;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<SummonsStatus>(summons.status);
  const [scheduledDate, setScheduledDate] = useState(
    summons.scheduledDate ? new Date(summons.scheduledDate).toISOString().slice(0, 16) : ''
  );
  const [meetingNotes, setMeetingNotes] = useState(summons.meetingNotes || '');
  const [attended, setAttended] = useState<'' | 'true' | 'false'>(
    summons.attended == null ? '' : summons.attended ? 'true' : 'false'
  );
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSummons(summons.id, {
        status,
        scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : null,
        meetingNotes: meetingNotes || undefined,
        attended: attended === '' ? undefined : attended === 'true',
      });
      toast.success('Summons updated.');
      onSaved();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update summons.');
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
        <h3 className="text-lg font-semibold mb-1">Update Summons</h3>
        <p className="text-sm text-gray-500 mb-4">
          {summons.enrollment?.student?.name} · {summons.parent?.name || 'No parent linked'}
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as SummonsStatus)} className="w-full rounded-md border-gray-300 border px-3 py-2 text-sm">
                {SUMMONS_STATUSES.map(s => <option key={s} value={s}>{enumLabel(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent attended?</label>
              <select value={attended} onChange={e => setAttended(e.target.value as any)} className="w-full rounded-md border-gray-300 border px-3 py-2 text-sm">
                <option value="">Not set</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled date & time (empty clears it)</label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting notes</label>
            <textarea
              value={meetingNotes}
              onChange={e => setMeetingNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="e.g. Parent agreed to home-based reinforcement plan"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
