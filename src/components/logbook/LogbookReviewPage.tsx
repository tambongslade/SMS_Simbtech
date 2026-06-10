'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { Button, Input, Select, TextArea, Modal, Badge } from '@/components/ui';
import {
  listLogbook,
  reviewLogbookEntry,
  LOGBOOK_STATUSES,
  type LogbookEntry,
  type LogbookStatus,
} from '@/lib/subjectSchemeApi';

const statusColor = (s: LogbookStatus): 'green' | 'yellow' | 'red' =>
  s === 'COMPLETED' ? 'green' : s === 'PARTIAL' ? 'yellow' : 'red';

// Shared review view for VP / Dean of Studies / HOD / Principal. Reviewers see
// every teacher's entries; teachers never reach this page.
export function LogbookReviewPage() {
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState<string>('');
  const [reviewedFilter, setReviewedFilter] = useState<string>(''); // '', 'true', 'false'

  const [active, setActive] = useState<LogbookEntry | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listLogbook({
        from: from || undefined,
        to: to || undefined,
        status: (status || undefined) as LogbookStatus | undefined,
        reviewed: reviewedFilter === '' ? undefined : reviewedFilter === 'true',
      });
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [from, to, status, reviewedFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openReview = (entry: LogbookEntry) => {
    setActive(entry);
    setReviewerNotes(entry.reviewerNotes ?? '');
  };

  const submitReview = async () => {
    if (!active) return;
    setIsReviewing(true);
    try {
      await reviewLogbookEntry(active.id, { reviewerNotes: reviewerNotes.trim() || undefined });
      toast.success('Entry reviewed.');
      setActive(null);
      load();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message !== 'Unauthorized') toast.error(message || 'Could not submit the review.');
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="h-7 w-7 text-blue-600" />
            Logbook Review
          </h1>
          <p className="text-gray-600 mt-1">Review lessons teachers have logged against their schemes.</p>

          <div className="mt-4 flex flex-wrap gap-3">
            <div className="min-w-[150px]"><Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="min-w-[150px]"><Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div className="min-w-[160px]">
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[{ value: '', label: 'All statuses' }, ...LOGBOOK_STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))]}
              />
            </div>
            <div className="min-w-[160px]">
              <Select
                label="Review state"
                value={reviewedFilter}
                onChange={(e) => setReviewedFilter(e.target.value)}
                options={[
                  { value: '', label: 'All' },
                  { value: 'false', label: 'Unreviewed' },
                  { value: 'true', label: 'Reviewed' },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-gray-500">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">No entries match these filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Teacher</th>
                    <th className="px-4 py-2 text-left">Class · Subject</th>
                    <th className="px-4 py-2 text-left">Lesson</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Reviewed</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700">{e.dateTaught?.split('T')[0]}</td>
                      <td className="px-4 py-2 text-gray-700">{e.teacherPeriod?.teacher?.name || '—'}</td>
                      <td className="px-4 py-2 text-gray-700">
                        {e.teacherPeriod?.subClass?.name || '—'}
                        {e.teacherPeriod?.subject?.name ? ` · ${e.teacherPeriod.subject.name}` : ''}
                      </td>
                      <td className="px-4 py-2 text-gray-700">{e.lesson?.title || `Lesson #${e.lessonId}`}</td>
                      <td className="px-4 py-2"><Badge color={statusColor(e.status)} variant="subtle">{e.status.replace('_', ' ')}</Badge></td>
                      <td className="px-4 py-2">
                        {e.reviewedAt ? <Badge color="green" variant="subtle">Reviewed</Badge> : <span className="text-xs text-gray-400">Pending</span>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button size="xs" variant="outline" color="primary" onClick={() => openReview(e)}>
                          {e.reviewedAt ? 'View' : 'Review'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Review modal */}
      <Modal isOpen={!!active} onClose={() => setActive(null)} title="Review logbook entry" size="lg">
        {active && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-400 text-xs block">Teacher</span>{active.teacherPeriod?.teacher?.name || '—'}</div>
              <div><span className="text-gray-400 text-xs block">Date</span>{active.dateTaught?.split('T')[0]}</div>
              <div><span className="text-gray-400 text-xs block">Class · Subject</span>{active.teacherPeriod?.subClass?.name || '—'}{active.teacherPeriod?.subject?.name ? ` · ${active.teacherPeriod.subject.name}` : ''}</div>
              <div><span className="text-gray-400 text-xs block">Status</span><Badge color={statusColor(active.status)} variant="subtle">{active.status.replace('_', ' ')}</Badge></div>
            </div>
            <div className="text-sm"><span className="text-gray-400 text-xs block">Lesson</span>{active.lesson?.title || `Lesson #${active.lessonId}`}</div>
            {active.notes && <div className="text-sm"><span className="text-gray-400 text-xs block">Notes</span>{active.notes}</div>}
            {active.homeworkGiven && <div className="text-sm"><span className="text-gray-400 text-xs block">Homework</span>{active.homeworkGiven}</div>}

            <TextArea label="Reviewer notes" rows={3} value={reviewerNotes} onChange={(e) => setReviewerNotes(e.target.value)} placeholder="e.g. Lesson covered. Pace good." />
            {active.reviewedAt && (
              <p className="text-xs text-gray-400">
                Last reviewed {active.reviewedAt.split('T')[0]}. Submitting again updates the review.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <Button variant="outline" onClick={() => setActive(null)} disabled={isReviewing}>Close</Button>
              <Button color="primary" isLoading={isReviewing} onClick={submitReview}>
                {active.reviewedAt ? 'Update review' : 'Mark reviewed'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
