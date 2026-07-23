'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  ArrowPathIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, TextArea, Modal } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import { searchFinanceStudents, type FinanceStudent } from '@/lib/financeRequestsApi';
import {
  listBrokenProperty,
  getBrokenProperty,
  createBrokenProperty,
  updateBrokenProperty,
  deleteBrokenProperty,
  canAdminDelete,
  enrollmentStudent,
  fmtMoney,
  fmtDate,
  type BrokenProperty,
} from '@/lib/disciplineApi';

const LIMIT = 25;

interface BrokenPropertyPanelProps {
  // Bursar / Fee-Auditor get the ledger without log/edit/delete actions.
  readOnly?: boolean;
}

export function BrokenPropertyPanel({ readOnly = false }: BrokenPropertyPanelProps) {
  const { selectedAcademicYear, selectedRole } = useAuth();

  const [rows, setRows] = useState<BrokenProperty[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Log / edit modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BrokenProperty | null>(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<FinanceStudent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [student, setStudent] = useState<{ id: number; name: string } | null>(null);
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Detail + delete state
  const [detail, setDetail] = useState<BrokenProperty | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [deleting, setDeleting] = useState<BrokenProperty | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listBrokenProperty({
        from: from || undefined,
        to: to || undefined,
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
  }, [from, to, selectedAcademicYear?.id, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [from, to]);

  // Debounced student search for the log form.
  useEffect(() => {
    if (!formOpen || editing) return;
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
  }, [studentQuery, formOpen, editing, selectedAcademicYear?.id]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const openCreate = () => {
    setEditing(null);
    setStudent(null);
    setStudentQuery('');
    setStudentResults([]);
    setItemName('');
    setDescription('');
    setEstimatedCost('');
    setActionTaken('');
    setFormOpen(true);
  };

  const openEdit = (row: BrokenProperty) => {
    setEditing(row);
    setStudent(null);
    setItemName(row.itemName);
    setDescription(row.description || '');
    setEstimatedCost(String(row.estimatedCost ?? ''));
    setActionTaken(row.actionTaken || '');
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing && !student) return toast.error('Select the student responsible.');
    if (!itemName.trim()) return toast.error('Item name is required.');
    // Estimated cost is optional — an empty field logs the damage without a charge yet
    const cost = estimatedCost.trim() === '' ? 0 : Number(estimatedCost);
    if (Number.isNaN(cost) || cost < 0) return toast.error('Estimated cost cannot be negative.');

    setIsSaving(true);
    try {
      if (editing) {
        const updated = await updateBrokenProperty(editing.id, {
          itemName: itemName.trim(),
          description: description.trim() || undefined,
          estimatedCost: cost,
          actionTaken: actionTaken.trim() || undefined,
        });
        toast.success('Broken property updated — the linked fee charge follows the new cost.');
        setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      } else {
        await createBrokenProperty({
          studentId: student!.id,
          itemName: itemName.trim(),
          description: description.trim() || undefined,
          estimatedCost: cost,
          actionTaken: actionTaken.trim() || undefined,
          academicYearId: selectedAcademicYear?.id,
        });
        toast.success(
          cost > 0
            ? `Logged — ${fmtMoney(cost)} was added to the student's fee bill automatically.`
            : 'Logged — no cost recorded yet; edit later to set the charge.'
        );
        load();
      }
      setFormOpen(false);
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to save.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const openDetail = async (row: BrokenProperty) => {
    setDetail(row);
    setIsLoadingDetail(true);
    try {
      // Re-fetch to include feeItem.payments.
      setDetail(await getBrokenProperty(row.id));
    } catch {
      /* keep the list row */
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deleteBrokenProperty(deleting.id);
      toast.success('Broken property record deleted.');
      setRows((prev) => prev.filter((r) => r.id !== deleting.id));
      setTotal((t) => Math.max(0, t - 1));
      setDeleting(null);
    } catch (error: any) {
      // 400 when payments already exist against the linked fee item.
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Delete failed.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const paid = (row: BrokenProperty) =>
    (row.feeItem?.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Broken Property</h2>
          <p className="text-gray-600 mt-1 text-sm">
            {readOnly
              ? 'Damage charges and their payment status.'
              : 'Log damaged property — the cost is billed to the student automatically.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={ArrowPathIcon} onClick={load} disabled={isLoading}>
            Refresh
          </Button>
          {!readOnly && (
            <Button color="primary" size="sm" leftIcon={PlusIcon} onClick={openCreate}>
              Log New
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="min-w-[140px] flex-1 sm:flex-none sm:min-w-[160px]">
          <Input label="From" type="date" className="appearance-none min-w-0 w-full" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="min-w-[140px] flex-1 sm:flex-none sm:min-w-[160px]">
          <Input label="To" type="date" className="appearance-none min-w-0 w-full" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logged</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No broken property records found.
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
                        <div className="text-sm text-gray-900">{row.itemName}</div>
                        {row.description && <div className="text-xs text-gray-500">{row.description}</div>}
                        {row.actionTaken && (
                          <div className="text-xs text-gray-400 italic">Action: {row.actionTaken}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                        {fmtMoney(row.estimatedCost)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {fmtDate(row.createdAt)}
                        {row.reportedBy?.name && (
                          <div className="text-xs text-gray-400">by {row.reportedBy.name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="xs" variant="outline" leftIcon={EyeIcon} onClick={() => openDetail(row)}>
                            View
                          </Button>
                          {!readOnly && (
                            <Button size="xs" variant="outline" leftIcon={PencilSquareIcon} onClick={() => openEdit(row)}>
                              Edit
                            </Button>
                          )}
                          {!readOnly && canAdminDelete(selectedRole) && (
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
            {total} record{total === 1 ? '' : 's'} · Page {page} of {totalPages}
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

      {/* Log / edit modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => !isSaving && setFormOpen(false)}
        title={editing ? 'Edit Broken Property' : 'Log Broken Property'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {editing ? (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              Student: <span className="font-medium text-gray-900">{enrollmentStudent(editing).name}</span>
              <div className="text-xs text-gray-400 mt-1">
                Cost edits propagate to the linked fee charge.
              </div>
            </div>
          ) : (
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
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Item *"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Window pane"
            />
            <Input
              label="Estimated cost (XAF) — optional"
              type="number"
              min={0}
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
            />
          </div>
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happened?"
          />
          <TextArea
            label="Action taken (optional)"
            value={actionTaken}
            onChange={(e) => setActionTaken(e.target.value)}
            rows={2}
            placeholder="e.g. Parent notified; payment plan agreed"
          />

          {!editing && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
              This will be added to the student&apos;s fee bill automatically.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" color="primary" isLoading={isSaving}>
              {editing ? 'Save Changes' : 'Log & Bill Student'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail modal — includes fee item payment status */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Broken Property Details" size="md">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <div className="font-medium text-gray-900">{enrollmentStudent(detail).name}</div>
              <div className="text-gray-500 text-xs">{enrollmentStudent(detail).className}</div>
              <div className="text-gray-700 mt-2">
                <span className="font-medium">{detail.itemName}</span> — {fmtMoney(detail.estimatedCost)}
              </div>
              {detail.description && <div className="text-gray-600">{detail.description}</div>}
              {detail.actionTaken && (
                <div className="text-gray-500 italic">Action: {detail.actionTaken}</div>
              )}
              <div className="text-xs text-gray-400">
                Logged {fmtDate(detail.createdAt)}
                {detail.reportedBy?.name ? ` by ${detail.reportedBy.name}` : ''}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Fee charge & payments</h3>
              {isLoadingDetail ? (
                <p className="text-gray-500">Loading payments…</p>
              ) : detail.feeItem ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>{detail.feeItem.name}</span>
                    <span className="font-medium">{fmtMoney(detail.feeItem.amount)}</span>
                  </div>
                  {(detail.feeItem.payments || []).length === 0 ? (
                    <p className="text-gray-500 text-xs">No payments recorded yet.</p>
                  ) : (
                    <>
                      <div className="border border-gray-200 rounded-lg divide-y">
                        {detail.feeItem.payments!.map((p) => (
                          <div key={p.id} className="flex justify-between px-3 py-1.5 text-xs">
                            <span className="text-gray-600">
                              {fmtDate(p.paymentDate)}
                              {p.receiptNumber ? ` · ${p.receiptNumber}` : ''}
                              {p.paymentMethod ? ` · ${p.paymentMethod}` : ''}
                            </span>
                            <span className="font-medium text-gray-900">{fmtMoney(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Paid so far</span>
                        <span className="font-semibold text-emerald-700">{fmtMoney(paid(detail))}</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-xs">No linked fee charge.</p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-200">
              <Button variant="outline" onClick={() => setDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!deleting} onClose={() => !isDeleting && setDeleting(null)} title="Delete Broken Property" size="sm">
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Delete <span className="font-medium text-gray-900">{deleting.itemName}</span> (
              {fmtMoney(deleting.estimatedCost)}) for {enrollmentStudent(deleting).name}? The linked fee
              charge is removed too. This is refused if payments were already recorded against it.
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
