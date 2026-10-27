'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, Select, TextArea, Modal } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import { searchFinanceStudents, type FinanceStudent } from '@/lib/financeRequestsApi';
import { enrollmentStudent, fmtDate, todayStr } from '@/lib/disciplineApi';
import {
  createDisciplinaryAction,
  updateDisciplinaryAction,
  listDisciplinaryActions,
  canDecideActions,
  type DisciplinaryAction,
  type DisciplinaryActionStatus,
} from '@/lib/disciplinaryActionsApi';

const LIMIT = 25;

// Reuses the DisciplinaryAction model's DISCIPLINARY_COUNCIL action type, but
// gives it its own focused create flow (no days/date-range fields, which only
// apply to suspensions) and its own log, filtered to just council referrals —
// separate from the general Disciplinary Actions register.
const STATUS_STYLES: Record<DisciplinaryActionStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  ACTIVE: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-gray-200 text-gray-700',
};

const STATUS_LABELS: Record<DisciplinaryActionStatus, string> = {
  PENDING: 'Referred',
  ACTIVE: 'Convened',
  COMPLETED: 'Resolved',
  CANCELLED: 'Cancelled',
};

export function DisciplinaryCouncilPanel() {
  const { selectedAcademicYear, selectedRole } = useAuth();

  const [rows, setRows] = useState<DisciplinaryAction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DisciplinaryActionStatus | ''>('');

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<FinanceStudent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [student, setStudent] = useState<{ id: number; name: string } | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Edit modal state
  const [editing, setEditing] = useState<DisciplinaryAction | null>(null);
  const [editStatus, setEditStatus] = useState<DisciplinaryActionStatus>('PENDING');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const decisionAllowed = canDecideActions(selectedRole);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listDisciplinaryActions({
        actionType: 'DISCIPLINARY_COUNCIL',
        status: statusFilter || undefined,
        academicYearId: selectedAcademicYear?.id,
        page,
        limit: LIMIT,
      });
      setRows(res.data);
      setTotal(res.meta?.total ?? res.data.length);
    } catch {
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, selectedAcademicYear?.id, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // Debounced student search inside the create modal.
  useEffect(() => {
    if (!createOpen) return;
    const q = studentQuery.trim();
    if (q.length < 2) {
      setStudentResults([]);
      return;
    }
    setIsSearching(true);
    const handle = setTimeout(() => {
      searchFinanceStudents({ q, academicYearId: selectedAcademicYear?.id, limit: 15 })
        .then(setStudentResults)
        .catch(() => setStudentResults([]))
        .finally(() => setIsSearching(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [studentQuery, createOpen, selectedAcademicYear?.id]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const openCreate = () => {
    setStudent(null);
    setStudentQuery('');
    setStudentResults([]);
    setReason('');
    setNotes('');
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return toast.error('Select a student.');
    if (!reason.trim()) return toast.error('Reason is required.');

    setIsSaving(true);
    try {
      await createDisciplinaryAction({
        studentId: student.id,
        actionType: 'DISCIPLINARY_COUNCIL',
        reason: reason.trim(),
        startDate: todayStr(),
        notes: notes.trim() || undefined,
        academicYearId: selectedAcademicYear?.id,
      });
      toast.success(`${student.name} sent to the disciplinary council.`);
      setCreateOpen(false);
      load();
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      if (message !== 'Unauthorized') {
        toast.error(message || 'Failed to record the referral.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = (row: DisciplinaryAction) => {
    setEditing(row);
    setEditStatus(row.status);
    setEditNotes(row.notes || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setIsUpdating(true);
    try {
      const updated = await updateDisciplinaryAction(editing.id, {
        status: editStatus,
        notes: editNotes.trim() || undefined,
      });
      toast.success('Council record updated.');
      setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setEditing(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      if (message !== 'Unauthorized') {
        toast.error(message || 'Update failed.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ScaleIcon className="h-5 w-5 text-gray-400" />
            Disciplinary Council
          </h2>
          <p className="text-gray-600 mt-1 text-sm">
            Students referred to the disciplinary council, and the outcome log.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={ArrowPathIcon} onClick={load} disabled={isLoading}>
            Refresh
          </Button>
          {decisionAllowed && (
            <Button color="primary" size="sm" leftIcon={PlusIcon} onClick={openCreate}>
              Send to Council
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="min-w-[200px]">
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DisciplinaryActionStatus | '')}
            options={[
              { value: '', label: 'All statuses' },
              ...(Object.keys(STATUS_LABELS) as DisciplinaryActionStatus[]).map((s) => ({
                value: s,
                label: STATUS_LABELS[s],
              })),
            ]}
          />
        </div>
      </div>

      {/* Table (desktop) / cards (mobile) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {isLoading ? (
            <p className="p-6 text-center text-sm text-gray-500">Loading council log…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">No students sent to the council yet.</p>
          ) : (
            rows.map((row) => {
              const who = enrollmentStudent(row);
              return (
                <div key={row.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate" title={who.name}>
                        {who.name}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {who.matricule ? `${who.matricule} · ` : ''}{who.className}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${STATUS_STYLES[row.status]}`}>
                      {STATUS_LABELS[row.status]}
                    </span>
                  </div>
                  {row.reason && <p className="text-xs text-gray-800 mt-1.5">{row.reason}</p>}
                  {row.notes && <p className="text-[11px] text-gray-500 mt-0.5">{row.notes}</p>}
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {fmtDate(row.createdAt)}
                    {row.decidedBy?.name ? ` · referred by ${row.decidedBy.name}` : ''}
                  </p>
                  {decisionAllowed && (
                    <div className="flex justify-end gap-2 mt-2">
                      <Button size="xs" variant="outline" leftIcon={PencilSquareIcon} onClick={() => openEdit(row)}>
                        Update
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="overflow-x-auto hidden md:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referred by</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading council log…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No students sent to the council yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const who = enrollmentStudent(row);
                  return (
                    <tr key={row.id} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{who.name}</div>
                        <div className="text-xs text-gray-500">
                          {who.matricule ? `${who.matricule} · ` : ''}
                          {who.className}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{row.reason}</div>
                        {row.notes && <div className="text-xs text-gray-400">&ldquo;{row.notes}&rdquo;</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[row.status]}`}>
                          {STATUS_LABELS[row.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {row.decidedBy?.name || '—'}
                        <div className="text-xs text-gray-400">{fmtDate(row.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {decisionAllowed ? (
                            <Button size="xs" variant="outline" leftIcon={PencilSquareIcon} onClick={() => openEdit(row)}>
                              Update
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-200">
          <span className="text-sm text-gray-600">
            {total} referral{total === 1 ? '' : 's'} · Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leftIcon={ChevronLeftIcon} disabled={page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <Button variant="outline" size="sm" rightIcon={ChevronRightIcon} disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => !isSaving && setCreateOpen(false)} title="Send Student to Disciplinary Council" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Student picker */}
          <div className="space-y-2">
            <div className="relative">
              <Input
                label="Student *"
                value={student ? student.name : studentQuery}
                onChange={(e) => {
                  setStudent(null);
                  setStudentQuery(e.target.value);
                }}
                placeholder="Search by name or matricule…"
              />
              <MagnifyingGlassIcon className="absolute right-3 top-9 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
            {isSearching && <p className="text-xs text-gray-500">Searching…</p>}
            {studentResults.length > 0 && !student && (
              <div className="border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                {studentResults.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => {
                      setStudent({ id: s.id, name: s.name });
                      setStudentResults([]);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                  >
                    <span className="font-medium text-gray-900">{s.name}</span>
                    {s.matricule && <span className="text-gray-500"> · {s.matricule}</span>}
                  </button>
                ))}
              </div>
            )}
            {student && (
              <div className="flex items-center gap-2 min-w-0 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
                Selected: <span className="font-medium truncate">{student.name}</span>
              </div>
            )}
          </div>

          <Input
            label="Reason *"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Repeated serious misconduct despite prior sanctions"
          />

          <TextArea
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Hearing scheduled for Friday; parents notified."
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" color="primary" isLoading={isSaving}>
              Send to Council
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editing} onClose={() => !isUpdating && setEditing(null)} title="Update Council Record" size="md">
        {editing && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <span className="font-medium text-gray-900">{enrollmentStudent(editing).name}</span> — {editing.reason}
            </div>

            <Select
              label="Status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as DisciplinaryActionStatus)}
              options={(Object.keys(STATUS_LABELS) as DisciplinaryActionStatus[]).map((s) => ({
                value: s,
                label: STATUS_LABELS[s],
              }))}
            />
            <TextArea label="Notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} />

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={isUpdating}>
                Cancel
              </Button>
              <Button type="submit" color="primary" isLoading={isUpdating}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
