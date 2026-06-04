'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, Select, TextArea, Modal } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import { searchFinanceStudents, type FinanceStudent } from '@/lib/financeRequestsApi';
import {
  getStudentDisciplineHistory,
  enrollmentStudent,
  fmtDate,
  todayStr,
  type DisciplineIssue,
} from '@/lib/disciplineApi';
import {
  createDisciplinaryAction,
  updateDisciplinaryAction,
  deleteDisciplinaryAction,
  listDisciplinaryActions,
  canDecideActions,
  canDeleteActions,
  ACTION_TYPES,
  ACTION_TYPE_LABELS,
  ACTION_STATUSES,
  TYPES_REQUIRING_DAYS,
  type DisciplinaryAction,
  type DisciplinaryActionType,
  type DisciplinaryActionStatus,
} from '@/lib/disciplinaryActionsApi';

const LIMIT = 25;

const STATUS_STYLES: Record<DisciplinaryActionStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  ACTIVE: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-gray-200 text-gray-700',
};

interface DisciplinaryActionsPanelProps {
  // DM / SDM get the register without create/edit/delete.
  readOnly?: boolean;
}

export function DisciplinaryActionsPanel({ readOnly = false }: DisciplinaryActionsPanelProps) {
  const { selectedAcademicYear, selectedRole } = useAuth();

  const [rows, setRows] = useState<DisciplinaryAction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<DisciplinaryActionStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<DisciplinaryActionType | ''>('');

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<FinanceStudent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [student, setStudent] = useState<{ id: number; name: string } | null>(null);
  const [studentIssues, setStudentIssues] = useState<DisciplineIssue[]>([]);
  const [issueId, setIssueId] = useState('');
  const [actionType, setActionType] = useState<DisciplinaryActionType>('SUSPENSION');
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('');
  const [startDate, setStartDate] = useState(todayStr());
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Edit modal state
  const [editing, setEditing] = useState<DisciplinaryAction | null>(null);
  const [editStatus, setEditStatus] = useState<DisciplinaryActionStatus>('PENDING');
  const [editDays, setEditDays] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [deleting, setDeleting] = useState<DisciplinaryAction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const decisionAllowed = !readOnly && canDecideActions(selectedRole);
  const deleteAllowed = !readOnly && canDeleteActions(selectedRole);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listDisciplinaryActions({
        status: statusFilter || undefined,
        actionType: typeFilter || undefined,
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
  }, [statusFilter, typeFilter, selectedAcademicYear?.id, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter]);

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

  const pickStudent = async (s: FinanceStudent) => {
    setStudent({ id: s.id, name: s.name });
    setStudentResults([]);
    setIssueId('');
    // Offer the student's existing discipline issues for optional linking.
    try {
      const history = await getStudentDisciplineHistory(s.id, selectedAcademicYear?.id);
      setStudentIssues(history);
    } catch {
      setStudentIssues([]);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const needsDays = TYPES_REQUIRING_DAYS.includes(actionType);

  const openCreate = () => {
    setStudent(null);
    setStudentQuery('');
    setStudentResults([]);
    setStudentIssues([]);
    setIssueId('');
    setActionType('SUSPENSION');
    setReason('');
    setDays('');
    setStartDate(todayStr());
    setNotes('');
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return toast.error('Select a student.');
    if (!reason.trim()) return toast.error('Reason is required.');
    if (needsDays && (!days || Number(days) <= 0)) {
      return toast.error(`Days is required for ${ACTION_TYPE_LABELS[actionType]}.`);
    }

    setIsSaving(true);
    try {
      await createDisciplinaryAction({
        studentId: student.id,
        actionType,
        reason: reason.trim(),
        disciplineIssueId: issueId ? Number(issueId) : undefined,
        days: days ? Number(days) : undefined,
        startDate: startDate || undefined,
        notes: notes.trim() || undefined,
        academicYearId: selectedAcademicYear?.id,
      });
      toast.success(`${ACTION_TYPE_LABELS[actionType]} recorded for ${student.name}.`);
      setCreateOpen(false);
      load();
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to record the disciplinary action.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = (row: DisciplinaryAction) => {
    setEditing(row);
    setEditStatus(row.status);
    setEditDays(row.days != null ? String(row.days) : '');
    setEditStart(row.startDate ? row.startDate.split('T')[0] : '');
    setEditEnd(row.endDate ? row.endDate.split('T')[0] : '');
    setEditReason(row.reason);
    setEditNotes(row.notes || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setIsUpdating(true);
    try {
      const updated = await updateDisciplinaryAction(editing.id, {
        status: editStatus,
        days: editDays ? Number(editDays) : undefined,
        startDate: editStart || undefined,
        endDate: editEnd || undefined,
        reason: editReason.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });
      toast.success('Disciplinary action updated.');
      setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setEditing(null);
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Update failed.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deleteDisciplinaryAction(deleting.id);
      toast.success('Disciplinary action deleted.');
      setRows((prev) => prev.filter((r) => r.id !== deleting.id));
      setTotal((t) => Math.max(0, t - 1));
      setDeleting(null);
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Delete failed.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Disciplinary Actions</h2>
          <p className="text-gray-600 mt-1 text-sm">
            Structured sanctions — suspensions, work duty, dismissals and councils.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={ArrowPathIcon} onClick={load} disabled={isLoading}>
            Refresh
          </Button>
          {decisionAllowed && (
            <Button color="primary" size="sm" leftIcon={PlusIcon} onClick={openCreate}>
              New Action
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="min-w-[180px]">
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DisciplinaryActionStatus | '')}
            options={[
              { value: '', label: 'All statuses' },
              ...ACTION_STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() })),
            ]}
          />
        </div>
        <div className="min-w-[220px]">
          <Select
            label="Action type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as DisciplinaryActionType | '')}
            options={[{ value: '', label: 'All types' }, ...ACTION_TYPES]}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Decided by</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading actions…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No disciplinary actions found.
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
                        <div className="text-sm font-medium text-gray-900">
                          {ACTION_TYPE_LABELS[row.actionType] || row.actionType}
                        </div>
                        <div className="text-xs text-gray-500">{row.reason}</div>
                        {row.disciplineIssue && (
                          <div className="text-xs text-gray-400 italic">
                            Issue #{row.disciplineIssue.id}: {row.disciplineIssue.description}
                          </div>
                        )}
                        {row.notes && <div className="text-xs text-gray-400">“{row.notes}”</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {row.startDate ? fmtDate(row.startDate) : '—'}
                        {row.endDate ? ` → ${fmtDate(row.endDate)}` : ''}
                        {row.days != null && <div className="text-xs text-gray-400">{row.days} day(s)</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[row.status]}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {row.decidedBy?.name || '—'}
                        <div className="text-xs text-gray-400">{fmtDate(row.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {decisionAllowed && (
                            <Button size="xs" variant="outline" leftIcon={PencilSquareIcon} onClick={() => openEdit(row)}>
                              Edit
                            </Button>
                          )}
                          {deleteAllowed && (
                            <Button
                              size="xs"
                              variant="outline"
                              color="danger"
                              leftIcon={TrashIcon}
                              onClick={() => setDeleting(row)}
                            >
                              Delete
                            </Button>
                          )}
                          {!decisionAllowed && !deleteAllowed && (
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <span className="text-sm text-gray-600">
            {total} action{total === 1 ? '' : 's'} · Page {page} of {totalPages}
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
      <Modal isOpen={createOpen} onClose={() => !isSaving && setCreateOpen(false)} title="New Disciplinary Action" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Student picker */}
          <div className="space-y-2">
            <div className="relative">
              <Input
                label="Student *"
                value={student ? student.name : studentQuery}
                onChange={(e) => {
                  setStudent(null);
                  setStudentIssues([]);
                  setIssueId('');
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
                    onClick={() => pickStudent(s)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                  >
                    <span className="font-medium text-gray-900">{s.name}</span>
                    {s.matricule && <span className="text-gray-500"> · {s.matricule}</span>}
                  </button>
                ))}
              </div>
            )}
            {student && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                <CheckCircleIcon className="h-4 w-4" />
                Selected: <span className="font-medium">{student.name}</span>
              </div>
            )}
          </div>

          {/* Optional link to an existing discipline issue */}
          {student && studentIssues.length > 0 && (
            <Select
              label="Link to discipline issue (optional)"
              value={issueId}
              onChange={(e) => setIssueId(e.target.value)}
              options={[
                { value: '', label: '— No linked issue —' },
                ...studentIssues.map((i) => ({
                  value: String(i.id),
                  label: `#${i.id} · ${i.issueType} — ${i.description?.slice(0, 60) || ''}`,
                })),
              ]}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Action type *"
              value={actionType}
              onChange={(e) => setActionType(e.target.value as DisciplinaryActionType)}
              options={ACTION_TYPES}
            />
            <Input
              label={`Days${needsDays ? ' *' : ' (optional)'}`}
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              helperText={needsDays ? 'Required for this action type' : undefined}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input
              label="Reason *"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Repeated fighting in class"
            />
          </div>
          <p className="text-xs text-gray-400 -mt-2">
            End date is computed automatically from start date + days.
          </p>

          <TextArea
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Parents notified by phone."
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" color="primary" isLoading={isSaving}>
              Record Action
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editing} onClose={() => !isUpdating && setEditing(null)} title="Update Disciplinary Action" size="md">
        {editing && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <span className="font-medium text-gray-900">{enrollmentStudent(editing).name}</span> —{' '}
              {ACTION_TYPE_LABELS[editing.actionType] || editing.actionType}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as DisciplinaryActionStatus)}
                options={ACTION_STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))}
              />
              <Input label="Days" type="number" min={1} value={editDays} onChange={(e) => setEditDays(e.target.value)} />
              <Input label="Start date" type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
              <Input
                label="End date"
                type="date"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                helperText="Leave blank to recompute from start + days"
              />
            </div>
            <Input label="Reason" value={editReason} onChange={(e) => setEditReason(e.target.value)} />
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

      {/* Delete confirmation */}
      <Modal isOpen={!!deleting} onClose={() => !isDeleting && setDeleting(null)} title="Delete Disciplinary Action" size="sm">
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Delete the {ACTION_TYPE_LABELS[deleting.actionType] || deleting.actionType} for{' '}
              <span className="font-medium text-gray-900">{enrollmentStudent(deleting).name}</span>? This
              cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleting(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button color="danger" isLoading={isDeleting} onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
