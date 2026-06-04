'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, Select, TextArea, Modal } from '@/components/ui';
import {
  createReportRequest,
  listSentReportRequests,
  listAssignedReportRequests,
  submitReportRequest,
  reviewReportRequest,
  updateReportRequest,
  cancelReportRequest,
  listReportRecipients,
  type ReportRequest,
  type ReportRequestStatus,
  type ReportRecipient,
} from '@/lib/reportRequestsApi';

const LIMIT = 25;

const STATUS_STYLES: Record<ReportRequestStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  REVIEWED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-gray-200 text-gray-700',
};

const fmtDateTime = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function StatusPill({ req }: { req: ReportRequest }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[req.status]}`}
      >
        {req.status}
      </span>
      {req.isOverdue && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <ExclamationTriangleIcon className="h-3 w-3" /> Overdue
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Outbox — for the Dean / VP / Principal+ ("requests I sent")
// ---------------------------------------------------------------------------

export function ReportRequestsOutbox() {
  const [rows, setRows] = useState<ReportRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReportRequestStatus | ''>('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Create / edit
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ReportRequest | null>(null);
  const [recipients, setRecipients] = useState<ReportRecipient[]>([]);
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Review
  const [reviewing, setReviewing] = useState<ReportRequest | null>(null);
  const [reviewedNotes, setReviewedNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  // Cancel
  const [cancelling, setCancelling] = useState<ReportRequest | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listSentReportRequests({
        status: statusFilter || undefined,
        overdueOnly: overdueOnly || undefined,
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
  }, [statusFilter, overdueOnly, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, overdueOnly]);

  useEffect(() => {
    listReportRecipients().then(setRecipients).catch(() => setRecipients([]));
  }, []);

  const overdueCount = rows.filter((r) => r.isOverdue).length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const openCreate = () => {
    setEditing(null);
    setRecipientId('');
    setSubject('');
    setDescription('');
    setDueDate('');
    setFormOpen(true);
  };

  const openEdit = (row: ReportRequest) => {
    setEditing(row);
    setRecipientId(String(row.requestedFromId));
    setSubject(row.subject);
    setDescription(row.description || '');
    // ISO → datetime-local value (local time, minutes precision).
    const d = new Date(row.dueDate);
    const pad = (n: number) => String(n).padStart(2, '0');
    setDueDate(
      isNaN(d.getTime())
        ? ''
        : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
    );
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing && !recipientId) return toast.error('Pick who should write the report.');
    if (!subject.trim()) return toast.error('Subject is required.');
    if (!dueDate) return toast.error('Set a due date.');
    const iso = new Date(dueDate).toISOString();

    setIsSaving(true);
    try {
      if (editing) {
        const updated = await updateReportRequest(editing.id, {
          subject: subject.trim(),
          description: description.trim() || undefined,
          dueDate: iso,
        });
        toast.success('Report request updated.');
        setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      } else {
        await createReportRequest({
          requestedFromId: Number(recipientId),
          subject: subject.trim(),
          description: description.trim() || undefined,
          dueDate: iso,
        });
        toast.success('Report request sent.');
        load();
      }
      setFormOpen(false);
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to save the request.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewing) return;
    setIsReviewing(true);
    try {
      const updated = await reviewReportRequest(reviewing.id, {
        reviewedNotes: reviewedNotes.trim() || undefined,
      });
      toast.success('Report reviewed.');
      setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setReviewing(null);
      setReviewedNotes('');
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Review failed.');
      }
    } finally {
      setIsReviewing(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelling) return;
    setIsCancelling(true);
    try {
      const updated = await cancelReportRequest(cancelling.id);
      toast.success('Report request cancelled.');
      setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setCancelling(null);
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Cancel failed.');
      }
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Report Requests</h2>
          <p className="text-gray-600 mt-1 text-sm">
            Written reports you have requested from the discipline masters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={ArrowPathIcon} onClick={load} disabled={isLoading}>
            Refresh
          </Button>
          <Button color="primary" size="sm" leftIcon={PlusIcon} onClick={openCreate}>
            Request Report
          </Button>
        </div>
      </div>

      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
          <ExclamationTriangleIcon className="h-5 w-5" />
          {overdueCount} request{overdueCount === 1 ? ' is' : 's are'} overdue on this page.
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="min-w-[180px]">
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReportRequestStatus | '')}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'SUBMITTED', label: 'Submitted' },
              { value: 'REVIEWED', label: 'Reviewed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          Overdue only
        </label>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-gray-500">Loading requests…</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">No report requests found.</div>
          ) : (
            rows.map((req) => (
              <div key={req.id} className="px-4 py-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900">{req.subject}</div>
                  <div className="text-xs text-gray-500">
                    To {req.requestedFrom?.name || `User #${req.requestedFromId}`} · due{' '}
                    {fmtDateTime(req.dueDate)}
                  </div>
                  {req.description && <div className="text-xs text-gray-500 mt-0.5">{req.description}</div>}
                  {req.submissionNotes && (
                    <div className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 mt-1 inline-block">
                      Submitted {fmtDateTime(req.submittedAt)}: “{req.submissionNotes}”
                      {req.submissionFileUrl && (
                        <a
                          href={req.submissionFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 ml-1 underline"
                        >
                          file <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                  {req.reviewedNotes && (
                    <div className="text-xs text-emerald-700 mt-1">
                      Reviewed {fmtDateTime(req.reviewedAt)}: “{req.reviewedNotes}”
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill req={req} />
                  <div className="flex flex-col gap-1.5">
                    {req.status === 'SUBMITTED' && (
                      <Button
                        size="xs"
                        color="success"
                        onClick={() => {
                          setReviewing(req);
                          setReviewedNotes('');
                        }}
                      >
                        Review
                      </Button>
                    )}
                    {req.status === 'PENDING' && (
                      <Button size="xs" variant="outline" onClick={() => openEdit(req)}>
                        Edit
                      </Button>
                    )}
                    {(req.status === 'PENDING' || req.status === 'SUBMITTED') && (
                      <Button size="xs" variant="outline" color="danger" onClick={() => setCancelling(req)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <span className="text-sm text-gray-600">
            {total} request{total === 1 ? '' : 's'} · Page {page} of {totalPages}
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

      {/* Create / edit modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => !isSaving && setFormOpen(false)}
        title={editing ? 'Edit Report Request' : 'Request a Written Report'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {editing ? (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              To: <span className="font-medium text-gray-900">{editing.requestedFrom?.name || `User #${editing.requestedFromId}`}</span>
            </div>
          ) : (
            <Select
              label="Request from *"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              options={[
                { value: '', label: recipients.length ? 'Select a discipline master…' : 'Loading…' },
                ...recipients.map((u) => ({
                  value: String(u.id),
                  label: `${u.name}${u.matricule ? ` (${u.matricule})` : ''} — ${
                    u.role === 'SENIOR_DISCIPLINE_MASTER' ? 'Senior DM' : 'DM'
                  }`,
                })),
              ]}
            />
          )}
          <Input
            label="Subject *"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Weekly lateness report — Form 4A"
          />
          <TextArea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What should the report cover?"
          />
          <Input label="Due *" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" color="primary" isLoading={isSaving} leftIcon={PaperAirplaneIcon}>
              {editing ? 'Save Changes' : 'Send Request'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review modal */}
      <Modal isOpen={!!reviewing} onClose={() => !isReviewing && setReviewing(null)} title="Review Submitted Report" size="md">
        {reviewing && (
          <form onSubmit={handleReview} className="space-y-4">
            <div className="text-sm bg-gray-50 rounded-lg p-3 space-y-1">
              <div className="font-medium text-gray-900">{reviewing.subject}</div>
              <div className="text-gray-600">
                From {reviewing.requestedFrom?.name} · submitted {fmtDateTime(reviewing.submittedAt)}
              </div>
              {reviewing.submissionNotes && <div className="text-gray-700">“{reviewing.submissionNotes}”</div>}
              {reviewing.submissionFileUrl && (
                <a
                  href={reviewing.submissionFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs"
                >
                  Open attached file <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                </a>
              )}
            </div>
            <TextArea
              label="Review notes"
              value={reviewedNotes}
              onChange={(e) => setReviewedNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Acknowledged. Will follow up with parents of flagged students."
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setReviewing(null)} disabled={isReviewing}>
                Cancel
              </Button>
              <Button type="submit" color="success" isLoading={isReviewing}>
                Mark Reviewed
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Cancel confirmation */}
      <Modal isOpen={!!cancelling} onClose={() => !isCancelling && setCancelling(null)} title="Cancel Report Request" size="sm">
        {cancelling && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Cancel <span className="font-medium text-gray-900">{cancelling.subject}</span>? The recipient
              will no longer need to submit it.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelling(null)} disabled={isCancelling}>
                Keep It
              </Button>
              <Button color="danger" isLoading={isCancelling} onClick={handleCancel}>
                Cancel Request
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inbox — for the SDM / DM ("requests assigned to me")
// ---------------------------------------------------------------------------

export function ReportRequestsInbox() {
  const [rows, setRows] = useState<ReportRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReportRequestStatus | ''>('PENDING');

  const [submitting, setSubmitting] = useState<ReportRequest | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submissionFileUrl, setSubmissionFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listAssignedReportRequests({
        status: statusFilter || undefined,
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
  }, [statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const overdueCount = rows.filter((r) => r.isOverdue).length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitting) return;
    if (!submissionNotes.trim() && !submissionFileUrl.trim()) {
      return toast.error('Add submission notes or a file link.');
    }
    setIsSubmitting(true);
    try {
      const updated = await submitReportRequest(submitting.id, {
        submissionNotes: submissionNotes.trim() || undefined,
        submissionFileUrl: submissionFileUrl.trim() || undefined,
      });
      toast.success('Report submitted.');
      setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setSubmitting(null);
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Submission failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Report Requests Assigned to Me</h2>
          <p className="text-gray-600 mt-1 text-sm">
            Written reports the Dean of Discipline is waiting on. Submit before the due date.
          </p>
        </div>
        <Button variant="outline" size="sm" leftIcon={ArrowPathIcon} onClick={load} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
          <ExclamationTriangleIcon className="h-5 w-5" />
          {overdueCount} report{overdueCount === 1 ? ' is' : 's are'} overdue — submit as soon as possible.
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="min-w-[180px]">
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReportRequestStatus | '')}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'SUBMITTED', label: 'Submitted' },
              { value: 'REVIEWED', label: 'Reviewed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-gray-500">Loading requests…</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">No report requests assigned to you.</div>
          ) : (
            rows.map((req) => (
              <div key={req.id} className="px-4 py-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900">{req.subject}</div>
                  <div className="text-xs text-gray-500">
                    From {req.requestedBy?.name || `User #${req.requestedById}`} · due {fmtDateTime(req.dueDate)}
                  </div>
                  {req.description && <div className="text-xs text-gray-500 mt-0.5">{req.description}</div>}
                  {req.reviewedNotes && (
                    <div className="text-xs text-emerald-700 mt-1">
                      Dean&apos;s review: “{req.reviewedNotes}”
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill req={req} />
                  {req.status === 'PENDING' && (
                    <Button
                      size="xs"
                      color="primary"
                      leftIcon={PaperAirplaneIcon}
                      onClick={() => {
                        setSubmitting(req);
                        setSubmissionNotes('');
                        setSubmissionFileUrl('');
                      }}
                    >
                      Submit
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <span className="text-sm text-gray-600">
            {total} request{total === 1 ? '' : 's'} · Page {page} of {totalPages}
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

      {/* Submit modal */}
      <Modal isOpen={!!submitting} onClose={() => !isSubmitting && setSubmitting(null)} title="Submit Report" size="md">
        {submitting && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-sm bg-gray-50 rounded-lg p-3">
              <div className="font-medium text-gray-900">{submitting.subject}</div>
              <div className="text-gray-600 text-xs">Due {fmtDateTime(submitting.dueDate)}</div>
            </div>
            <TextArea
              label="Submission notes"
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              rows={4}
              placeholder="e.g. Attached the weekly summary. 4 students flagged."
            />
            <Input
              label="File link (optional)"
              value={submissionFileUrl}
              onChange={(e) => setSubmissionFileUrl(e.target.value)}
              placeholder="/uploads/reports/2026-06/lateness-form4a.pdf"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setSubmitting(null)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" color="primary" isLoading={isSubmitting} leftIcon={PaperAirplaneIcon}>
                Submit Report
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
