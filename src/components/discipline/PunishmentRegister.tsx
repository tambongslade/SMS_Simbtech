'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  ArrowPathIcon,
  CheckIcon,
  ForwardIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, Select, TextArea, Modal } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import {
  listSaturdayPunishments,
  updateSaturdayPunishment,
  deleteSaturdayPunishment,
  canAdminDelete,
  enrollmentStudent,
  fmtDate,
  type SaturdayPunishment,
  type PunishmentStatus,
} from '@/lib/disciplineApi';
import { SchedulePunishmentModal } from './SchedulePunishmentModal';

const LIMIT = 25;

const STATUS_STYLES: Record<PunishmentStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  SERVED: 'bg-emerald-100 text-emerald-800',
  SKIPPED: 'bg-gray-200 text-gray-700',
};

export function PunishmentRegister() {
  const { selectedAcademicYear, selectedRole } = useAuth();

  const [rows, setRows] = useState<SaturdayPunishment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<PunishmentStatus | ''>('PENDING');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [scheduleOpen, setScheduleOpen] = useState(false);
  // Mark served/skipped confirmation with optional notes.
  const [marking, setMarking] = useState<{ row: SaturdayPunishment; status: PunishmentStatus } | null>(null);
  const [markNotes, setMarkNotes] = useState('');
  const [isMarking, setIsMarking] = useState(false);
  const [deleting, setDeleting] = useState<SaturdayPunishment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listSaturdayPunishments({
        status: statusFilter || undefined,
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
  }, [statusFilter, from, to, selectedAcademicYear?.id, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, from, to]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const confirmMark = async () => {
    if (!marking) return;
    setIsMarking(true);
    try {
      const updated = await updateSaturdayPunishment(marking.row.id, {
        status: marking.status,
        notes: markNotes.trim() || undefined,
      });
      toast.success(`Punishment marked ${marking.status.toLowerCase()}.`);
      setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setMarking(null);
      setMarkNotes('');
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to update punishment.');
      }
    } finally {
      setIsMarking(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deleteSaturdayPunishment(deleting.id);
      toast.success('Punishment deleted.');
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Punishment Register</h2>
          <p className="text-gray-600 mt-1 text-sm">
            Saturday punishments — pending first, soonest date on top.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={ArrowPathIcon} onClick={load} disabled={isLoading}>
            Refresh
          </Button>
          <Button color="primary" size="sm" leftIcon={PlusIcon} onClick={() => setScheduleOpen(true)}>
            Schedule Punishment
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="min-w-[160px]">
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PunishmentStatus | '')}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'SERVED', label: 'Served' },
              { value: 'SKIPPED', label: 'Skipped' },
            ]}
          />
        </div>
        <div className="min-w-[140px] flex-1 sm:flex-none sm:min-w-[160px]">
          <Input label="From" type="date" className="appearance-none min-w-0 w-full" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="min-w-[140px] flex-1 sm:flex-none sm:min-w-[160px]">
          <Input label="To" type="date" className="appearance-none min-w-0 w-full" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saturday</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading punishments…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No punishments found.</td>
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
                        <div className="text-sm text-gray-700">{row.reason}</div>
                        {row.notes && <div className="text-xs text-gray-400 italic">“{row.notes}”</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {fmtDate(row.scheduledDate)}
                        {row.servedDate && (
                          <div className="text-xs text-emerald-600">served {fmtDate(row.servedDate)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[row.status]}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {row.status === 'PENDING' && (
                            <>
                              <Button
                                size="xs"
                                color="success"
                                leftIcon={CheckIcon}
                                onClick={() => {
                                  setMarking({ row, status: 'SERVED' });
                                  setMarkNotes('');
                                }}
                              >
                                Served
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                leftIcon={ForwardIcon}
                                onClick={() => {
                                  setMarking({ row, status: 'SKIPPED' });
                                  setMarkNotes('');
                                }}
                              >
                                Skipped
                              </Button>
                            </>
                          )}
                          {canAdminDelete(selectedRole) && (
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

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-gray-500">Loading punishments…</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">No punishments found.</div>
          ) : (
            rows.map((row) => {
              const who = enrollmentStudent(row);
              return (
                <div key={row.id} className="p-4 space-y-1.5">
                  <div className="text-sm font-semibold text-gray-900 break-words">{who.name}</div>
                  <div className="text-xs text-gray-500">
                    {who.matricule ? `${who.matricule} · ` : ''}
                    {who.className}
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">Reason</span>
                    <div className="text-sm text-gray-900 text-right break-words">
                      <span className="text-sm text-gray-700">{row.reason}</span>
                      {row.notes && <div className="text-xs text-gray-400 italic">“{row.notes}”</div>}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">Saturday</span>
                    <div className="text-sm text-gray-900 text-right break-words">
                      {fmtDate(row.scheduledDate)}
                      {row.servedDate && (
                        <div className="text-xs text-emerald-600">served {fmtDate(row.servedDate)}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">Status</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[row.status]}`}
                    >
                      {row.status}
                    </span>
                  </div>
                  {(row.status === 'PENDING' || canAdminDelete(selectedRole)) && (
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      {row.status === 'PENDING' && (
                        <>
                          <Button
                            size="xs"
                            color="success"
                            leftIcon={CheckIcon}
                            onClick={() => {
                              setMarking({ row, status: 'SERVED' });
                              setMarkNotes('');
                            }}
                          >
                            Served
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            leftIcon={ForwardIcon}
                            onClick={() => {
                              setMarking({ row, status: 'SKIPPED' });
                              setMarkNotes('');
                            }}
                          >
                            Skipped
                          </Button>
                        </>
                      )}
                      {canAdminDelete(selectedRole) && (
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
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-200">
          <span className="text-sm text-gray-600">
            {total} punishment{total === 1 ? '' : 's'} · Page {page} of {totalPages}
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

      <SchedulePunishmentModal
        isOpen={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onCreated={() => load()}
      />

      {/* Mark served / skipped */}
      <Modal
        isOpen={!!marking}
        onClose={() => !isMarking && setMarking(null)}
        title={marking?.status === 'SERVED' ? 'Mark as Served' : 'Mark as Skipped'}
        size="sm"
      >
        {marking && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Mark the punishment for{' '}
              <span className="font-medium text-gray-900">{enrollmentStudent(marking.row).name}</span> on{' '}
              {fmtDate(marking.row.scheduledDate)} as{' '}
              <span className="font-medium">{marking.status.toLowerCase()}</span>?
              {marking.status === 'SERVED' && ' The served date is set automatically.'}
            </p>
            <TextArea
              label="Notes (optional)"
              value={markNotes}
              onChange={(e) => setMarkNotes(e.target.value)}
              rows={2}
              placeholder={marking.status === 'SKIPPED' ? 'e.g. Student moved to another school' : ''}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMarking(null)} disabled={isMarking}>
                Cancel
              </Button>
              <Button
                color={marking.status === 'SERVED' ? 'success' : 'primary'}
                isLoading={isMarking}
                onClick={confirmMark}
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!deleting} onClose={() => !isDeleting && setDeleting(null)} title="Delete Punishment" size="sm">
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Delete the punishment for{' '}
              <span className="font-medium text-gray-900">{enrollmentStudent(deleting).name}</span> on{' '}
              {fmtDate(deleting.scheduledDate)}? This cannot be undone.
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
