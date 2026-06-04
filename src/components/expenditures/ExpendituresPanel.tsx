'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowTopRightOnSquareIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, Select, Modal } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import {
  listExpenditures,
  exportExpenditures,
  deleteExpenditure,
  canCreateExpenditure,
  canDeleteExpenditure,
  canEditExpenditure,
  downloadBlob,
  fmtMoney,
  fmtDate,
  currentMonth,
  monthBounds,
  EXPENDITURE_CATEGORIES,
  CATEGORY_LABELS,
  type Expenditure,
  type ExpenditureCategory,
} from '@/lib/expendituresApi';
import { CategoryBadge } from './CategoryBadge';
import { ExpenditureFormModal } from './ExpenditureFormModal';

const LIMIT = 25;

export interface ExpendituresPanelProps {
  title?: string;
  description?: string;
  // Apply an external filter (e.g. from a summary widget deep-link). The panel
  // re-syncs to these whenever `filterNonce` changes.
  externalFilter?: { from?: string; to?: string; category?: ExpenditureCategory | '' };
  filterNonce?: number;
}

export function ExpendituresPanel({
  title = 'Expenditures',
  description,
  externalFilter,
  filterNonce,
}: ExpendituresPanelProps) {
  const { user, selectedRole } = useAuth();

  const defaultBounds = monthBounds(currentMonth());
  const [from, setFrom] = useState(defaultBounds.from);
  const [to, setTo] = useState(defaultBounds.to);
  const [category, setCategory] = useState<ExpenditureCategory | ''>('');

  const [rows, setRows] = useState<Expenditure[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expenditure | null>(null);
  const [deleting, setDeleting] = useState<Expenditure | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Apply external filters when the deep-link nonce changes.
  useEffect(() => {
    if (!externalFilter) return;
    if (externalFilter.from !== undefined) setFrom(externalFilter.from);
    if (externalFilter.to !== undefined) setTo(externalFilter.to);
    if (externalFilter.category !== undefined) setCategory(externalFilter.category);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterNonce]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listExpenditures({
        from: from || undefined,
        to: to || undefined,
        category: category || undefined,
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
  }, [from, to, category, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [from, to, category]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const allowCreate = canCreateExpenditure(selectedRole);

  const handleExport = async () => {
    setIsExporting(true);
    toast.loading('Generating export…', { id: 'exp-export' });
    try {
      const blob = await exportExpenditures({
        from: from || undefined,
        to: to || undefined,
        category: category || undefined,
      });
      downloadBlob(blob, `expenditures_${from || 'all'}_${to || 'all'}.xlsx`);
      toast.success('Export downloaded.', { id: 'exp-export' });
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Export failed.', { id: 'exp-export' });
      } else {
        toast.dismiss('exp-export');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaved = () => {
    load();
    setFormOpen(false);
    setEditing(null);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (exp: Expenditure) => {
    setEditing(exp);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deleteExpenditure(deleting.id);
      toast.success('Expenditure deleted.');
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
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {description && <p className="text-gray-600 mt-1 text-sm">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={ArrowPathIcon} onClick={load} disabled={isLoading}>
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={DocumentArrowDownIcon}
            isLoading={isExporting}
            onClick={handleExport}
          >
            Export Excel
          </Button>
          {allowCreate && (
            <Button color="primary" size="sm" leftIcon={PlusIcon} onClick={openCreate}>
              Log Expense
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="min-w-[160px]">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="min-w-[160px]">
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="min-w-[180px]">
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenditureCategory | '')}
            options={[{ value: '', label: 'All categories' }, ...EXPENDITURE_CATEGORIES]}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recorded by</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Loading expenditures…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No expenditures found for this filter.
                  </td>
                </tr>
              ) : (
                rows.map((exp) => {
                  const canEdit = canEditExpenditure(exp, selectedRole, user?.id);
                  const canDelete = canDeleteExpenditure(selectedRole);
                  return (
                    <tr key={exp.id} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{fmtDate(exp.date)}</td>
                      <td className="px-4 py-3">
                        <CategoryBadge category={exp.category} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{exp.description}</div>
                        {exp.notes && <div className="text-xs text-gray-500">{exp.notes}</div>}
                        {exp.paymentMethod && (
                          <div className="text-xs text-gray-400">via {exp.paymentMethod}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                        {fmtMoney(exp.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {exp.recipientUser?.name || exp.recipient || '—'}
                        {exp.recipientUser && (
                          <span className="block text-xs text-gray-400">{exp.recipientUser.matricule}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {exp.recordedBy?.name || `User #${exp.recordedById}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {exp.receiptUrl && (
                            <a
                              href={exp.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View receipt"
                              className="inline-flex items-center justify-center h-7 w-7 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
                            >
                              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                            </a>
                          )}
                          {canEdit && (
                            <button
                              type="button"
                              title="Edit"
                              onClick={() => openEdit(exp)}
                              className="inline-flex items-center justify-center h-7 w-7 rounded border border-gray-200 text-blue-600 hover:bg-blue-50"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => setDeleting(exp)}
                              className="inline-flex items-center justify-center h-7 w-7 rounded border border-gray-200 text-red-600 hover:bg-red-50"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                          {!exp.receiptUrl && !canEdit && !canDelete && (
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
            {total} expenditure{total === 1 ? '' : 's'} · Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={ChevronLeftIcon}
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              rightIcon={ChevronRightIcon}
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <ExpenditureFormModal
        isOpen={formOpen}
        editing={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />

      {/* Delete confirmation */}
      <Modal isOpen={!!deleting} onClose={() => !isDeleting && setDeleting(null)} title="Delete Expenditure" size="sm">
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Delete <span className="font-medium text-gray-900">{deleting.description}</span> (
              {fmtMoney(deleting.amount)}, {CATEGORY_LABELS[deleting.category]})? This cannot be undone.
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
