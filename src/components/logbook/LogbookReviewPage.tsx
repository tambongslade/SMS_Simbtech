'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { Button, Input, Select, TextArea, Modal, Badge } from '@/components/ui';
import {
  listLogbook,
  reviewLogbookEntry,
  getLogbookFilterOptions,
  LOGBOOK_STATUSES,
  type LogbookEntry,
  type LogbookStatus,
  type LogbookFilterOptions,
} from '@/lib/subjectSchemeApi';
import { useLanguage } from '@/components/context/LanguageContext';
import { formatDate } from '@/lib/formatDate';
import { enumLabel } from '@/lib/enumLabels';

const teacherName = (e: LogbookEntry) => e.teacherPeriod?.teacher?.name || e.taughtBy?.name || '—';

const statusColor = (s: LogbookStatus): 'green' | 'yellow' | 'red' =>
  s === 'COMPLETED' ? 'green' : s === 'PARTIAL' ? 'yellow' : 'red';

// Shared review view for VP / Dean of Studies / HOD / Principal. Reviewers see
// every teacher's entries; teachers never reach this page. `department="mine"`
// (HOD menu) restricts the list and the filter options to the HOD's
// department -- the backend also enforces this for HOD-only users.
export function LogbookReviewPage({ department }: { department?: 'mine' } = {}) {
  const { t } = useLanguage();
  const statusLabel = (s: LogbookStatus) => t(enumLabel(s));
  const lessonLabel = (e: LogbookEntry) => e.lesson?.title || `${t('Lesson')} #${e.lessonId}`;
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [options, setOptions] = useState<LogbookFilterOptions | null>(null);
  const [teacherId, setTeacherId] = useState('');
  const [classId, setClassId] = useState('');
  const [subClassId, setSubClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  useEffect(() => {
    getLogbookFilterOptions({ department })
      .then(setOptions)
      .catch(() => setOptions(null));
  }, [department]);

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
        department,
        teacherId: teacherId ? Number(teacherId) : undefined,
        classId: classId && !subClassId ? Number(classId) : undefined,
        subClassId: subClassId ? Number(subClassId) : undefined,
        subjectId: subjectId ? Number(subjectId) : undefined,
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
  }, [department, teacherId, classId, subClassId, subjectId, from, to, status, reviewedFilter]);

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
      toast.success(t('Entry reviewed.'));
      setActive(null);
      load();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message !== 'Unauthorized') toast.error(message || t('Could not submit the review.'));
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
            {t('Logbook Review')}
          </h1>
          <p className="text-gray-600 mt-1">{t('Review lessons teachers have logged against their schemes.')}</p>

          <div className="mt-4 flex flex-wrap gap-3">
            <div className="min-w-[180px]">
              <Select
                label={t('Teacher')}
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                options={[{ value: '', label: t('All teachers') }, ...(options?.teachers ?? []).map((tc) => ({ value: String(tc.id), label: tc.name }))]}
              />
            </div>
            <div className="min-w-[150px]">
              <Select
                label={t('Class')}
                value={classId}
                onChange={(e) => { setClassId(e.target.value); setSubClassId(''); }}
                options={[{ value: '', label: t('All classes') }, ...(options?.classes ?? []).map((c) => ({ value: String(c.id), label: c.name }))]}
              />
            </div>
            <div className="min-w-[150px]">
              <Select
                label={t('Stream')}
                value={subClassId}
                onChange={(e) => setSubClassId(e.target.value)}
                options={[
                  { value: '', label: t('All streams') },
                  ...(options?.subClasses ?? [])
                    .filter((sc) => !classId || String(sc.classId) === classId)
                    .map((sc) => ({ value: String(sc.id), label: sc.name })),
                ]}
              />
            </div>
            <div className="min-w-[160px]">
              <Select
                label={t('Subject')}
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                options={[{ value: '', label: t('All subjects') }, ...(options?.subjects ?? []).map((sj) => ({ value: String(sj.id), label: sj.name }))]}
              />
            </div>
            <div className="min-w-[150px]"><Input label={t('From')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="min-w-[150px]"><Input label={t('To')} type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div className="min-w-[160px]">
              <Select
                label={t('Status')}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[{ value: '', label: t('All statuses') }, ...LOGBOOK_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))]}
              />
            </div>
            <div className="min-w-[160px]">
              <Select
                label={t('Review state')}
                value={reviewedFilter}
                onChange={(e) => setReviewedFilter(e.target.value)}
                options={[
                  { value: '', label: t('All') },
                  { value: 'false', label: t('Unreviewed') },
                  { value: 'true', label: t('Reviewed') },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-gray-500">{t('Loading…')}</div>
          ) : entries.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">{t('No entries match these filters.')}</div>
          ) : (
            <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">{t('Date')}</th>
                    <th className="px-4 py-2 text-left">{t('Teacher')}</th>
                    <th className="px-4 py-2 text-left">{t('Class · Subject')}</th>
                    <th className="px-4 py-2 text-left">{t('Lesson')}</th>
                    <th className="px-4 py-2 text-left">{t('Status')}</th>
                    <th className="px-4 py-2 text-left">{t('Reviewed')}</th>
                    <th className="px-4 py-2 text-right">{t('Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700">{formatDate(e.dateTaught)}</td>
                      <td className="px-4 py-2 text-gray-700">{teacherName(e)}</td>
                      <td className="px-4 py-2 text-gray-700">
                        {e.teacherPeriod?.subClass?.name || '—'}
                        {e.teacherPeriod?.subject?.name ? ` · ${e.teacherPeriod.subject.name}` : ''}
                      </td>
                      <td className="px-4 py-2 text-gray-700">{lessonLabel(e)}</td>
                      <td className="px-4 py-2"><Badge color={statusColor(e.status)} variant="subtle">{statusLabel(e.status)}</Badge></td>
                      <td className="px-4 py-2">
                        {e.reviewedAt ? <Badge color="green" variant="subtle">{t('Reviewed')}</Badge> : <span className="text-xs text-gray-400">{t('Pending')}</span>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button size="xs" variant="outline" color="primary" onClick={() => openReview(e)}>
                          {e.reviewedAt ? t('View') : t('Review')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-gray-100">
              {entries.map((e) => (
                <div key={e.id} className="p-4 space-y-1.5">
                  <div className="text-sm font-semibold text-gray-900 break-words">
                    {formatDate(e.dateTaught)}
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">{t('Teacher')}</span>
                    <span className="text-sm text-gray-900 text-right break-words">{teacherName(e)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">{t('Class · Subject')}</span>
                    <span className="text-sm text-gray-900 text-right break-words">
                      {e.teacherPeriod?.subClass?.name || '—'}
                      {e.teacherPeriod?.subject?.name ? ` · ${e.teacherPeriod.subject.name}` : ''}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">{t('Lesson')}</span>
                    <span className="text-sm text-gray-900 text-right break-words">{lessonLabel(e)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">{t('Status')}</span>
                    <Badge color={statusColor(e.status)} variant="subtle">{statusLabel(e.status)}</Badge>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">{t('Reviewed')}</span>
                    {e.reviewedAt ? <Badge color="green" variant="subtle">{t('Reviewed')}</Badge> : <span className="text-xs text-gray-400">{t('Pending')}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    <Button size="xs" variant="outline" color="primary" onClick={() => openReview(e)}>
                      {e.reviewedAt ? t('View') : t('Review')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      </div>

      {/* Review modal */}
      <Modal isOpen={!!active} onClose={() => setActive(null)} title={t('Review logbook entry')} size="lg">
        {active && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-400 text-xs block">{t('Teacher')}</span>{teacherName(active)}</div>
              <div><span className="text-gray-400 text-xs block">{t('Date')}</span>{formatDate(active.dateTaught)}</div>
              <div><span className="text-gray-400 text-xs block">{t('Class · Subject')}</span>{active.teacherPeriod?.subClass?.name || '—'}{active.teacherPeriod?.subject?.name ? ` · ${active.teacherPeriod.subject.name}` : ''}</div>
              <div><span className="text-gray-400 text-xs block">{t('Status')}</span><Badge color={statusColor(active.status)} variant="subtle">{statusLabel(active.status)}</Badge></div>
            </div>
            <div className="text-sm"><span className="text-gray-400 text-xs block">{t('Lesson')}</span>{lessonLabel(active)}</div>
            {active.notes && <div className="text-sm"><span className="text-gray-400 text-xs block">{t('Notes')}</span>{active.notes}</div>}
            {active.homeworkGiven && <div className="text-sm"><span className="text-gray-400 text-xs block">{t('Homework')}</span>{active.homeworkGiven}</div>}

            <TextArea label={t('Reviewer notes')} rows={3} value={reviewerNotes} onChange={(e) => setReviewerNotes(e.target.value)} placeholder={t('e.g. Lesson covered. Pace good.')} />
            {active.reviewedAt && (
              <p className="text-xs text-gray-400">
                {t('Last reviewed')} {formatDate(active.reviewedAt)}. {t('Submitting again updates the review.')}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <Button variant="outline" onClick={() => setActive(null)} disabled={isReviewing}>{t('Close')}</Button>
              <Button color="primary" isLoading={isReviewing} onClick={submitReview}>
                {active.reviewedAt ? t('Update review') : t('Mark reviewed')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
