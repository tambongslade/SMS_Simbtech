'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  PlusIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Button, Select } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import {
  listFinanceRequests,
  availableActions,
  fmtMoney,
  fmtDateTime,
  payloadSummary,
  TYPE_LABELS,
  STATUS_LABELS,
  type FinanceRequest,
  type FinanceRequestType,
  type FinanceRequestStatus,
  type FinanceAction,
  type ListFinanceRequestsParams,
} from '@/lib/financeRequestsApi';
import { StatusBadge, TypeBadge } from './StatusBadge';
import { ActionModal } from './ActionModal';
import { CreateFinanceRequestModal } from './CreateFinanceRequestModal';

const LIMIT = 25;

const ACTION_LABEL: Record<FinanceAction, string> = {
  approve: 'Approve',
  reject: 'Reject',
  complete: 'Complete',
};

const ACTION_COLOR: Record<FinanceAction, 'success' | 'danger' | 'primary'> = {
  approve: 'success',
  reject: 'danger',
  complete: 'primary',
};

export interface FinanceRequestsPanelProps {
  title: string;
  description?: string;
  // Fixed filters that always apply (e.g. { type, status } or { requestedById }).
  baseFilters?: ListFinanceRequestsParams;
  showCreate?: boolean;
  allowedCreateTypes?: FinanceRequestType[];
  // Show the user-facing type / status filter dropdowns.
  showTypeFilter?: boolean;
  showStatusFilter?: boolean;
  emptyMessage?: string;
  // Extra hint rendered under a row after the user completes a bank verification, etc.
  followUpHint?: (req: FinanceRequest) => React.ReactNode;
}

export function FinanceRequestsPanel({
  title,
  description,
  baseFilters = {},
  showCreate = false,
  allowedCreateTypes,
  showTypeFilter = false,
  showStatusFilter = false,
  emptyMessage = 'No finance requests found.',
  followUpHint,
}: FinanceRequestsPanelProps) {
  const { user, selectedRole } = useAuth();

  const [rows, setRows] = useState<FinanceRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [typeFilter, setTypeFilter] = useState<FinanceRequestType | ''>('');
  const [statusFilter, setStatusFilter] = useState<FinanceRequestStatus | ''>('');

  const [createOpen, setCreateOpen] = useState(false);
  const [actionRequest, setActionRequest] = useState<FinanceRequest | null>(null);
  const [action, setAction] = useState<FinanceAction | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listFinanceRequests({
        ...baseFilters,
        type: (typeFilter || baseFilters.type) as FinanceRequestType | undefined,
        status: (statusFilter || baseFilters.status) as FinanceRequestStatus | undefined,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(baseFilters), typeFilter, statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const openAction = (req: FinanceRequest, a: FinanceAction) => {
    setActionRequest(req);
    setAction(a);
  };

  const handleActionDone = (updated: FinanceRequest) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setActionRequest(null);
    setAction(null);
  };

  const handleCreated = (created: FinanceRequest) => {
    // Re-load so server filters / ordering apply cleanly.
    load();
    setCreateOpen(false);
    void created;
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
          {showCreate && (
            <Button color="primary" size="sm" leftIcon={PlusIcon} onClick={() => setCreateOpen(true)}>
              New Request
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {(showTypeFilter || showStatusFilter) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
          {showTypeFilter && (
            <div className="min-w-[200px]">
              <Select
                label="Type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as FinanceRequestType | '')}
                options={[
                  { value: '', label: 'All types' },
                  ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
                ]}
              />
            </div>
          )}
          {showStatusFilter && (
            <div className="min-w-[180px]">
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FinanceRequestStatus | '')}
                options={[
                  { value: '', label: 'All statuses' },
                  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
                ]}
              />
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested by</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Loading requests…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((req) => {
                  const actions = availableActions(req, selectedRole, user?.id);
                  return (
                    <tr key={req.id} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-3">
                        <TypeBadge type={req.type} />
                        <div className="text-xs text-gray-400 mt-1">#{req.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{req.reason}</div>
                        <div className="text-xs text-gray-500">{payloadSummary(req)}</div>
                        {req.actedNotes && (
                          <div className="text-xs text-gray-400 mt-1 italic">“{req.actedNotes}”</div>
                        )}
                        {followUpHint && followUpHint(req)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                        {req.amount != null ? fmtMoney(req.amount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div>{req.requestedBy?.name || `User #${req.requestedById}`}</div>
                        <div className="text-xs text-gray-400">{fmtDateTime(req.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={req.status} />
                        {req.actedBy && (
                          <div className="text-xs text-gray-400 mt-1">by {req.actedBy.name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-end gap-1.5">
                          {actions.length === 0 ? (
                            <span className="text-xs text-gray-400">—</span>
                          ) : (
                            actions.map((a) => (
                              <Button
                                key={a}
                                size="xs"
                                color={ACTION_COLOR[a]}
                                variant={a === 'reject' ? 'outline' : 'solid'}
                                onClick={() => openAction(req, a)}
                              >
                                {ACTION_LABEL[a]}
                              </Button>
                            ))
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
            {total} request{total === 1 ? '' : 's'} · Page {page} of {totalPages}
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

      <CreateFinanceRequestModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        allowedTypes={allowedCreateTypes}
      />
      <ActionModal
        request={actionRequest}
        action={action}
        onClose={() => {
          setActionRequest(null);
          setAction(null);
        }}
        onDone={handleActionDone}
      />
    </div>
  );
}
