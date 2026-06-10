'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import {
  BookOpenIcon,
  PencilSquareIcon,
  TrashIcon,
  ClockIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Button, Badge, Modal } from '@/components/ui';
import apiService from '@/lib/apiService';
import { LogbookForm } from '@/components/logbook/LogbookForm';
import {
  listLogbook,
  deleteLogbookEntry,
  type LogbookEntry,
  type LogbookStatus,
} from '@/lib/subjectSchemeApi';

interface TimeSlot {
  id: number;
  teacherPeriodId?: number;
  subClassId: number;
  period: { id: number; dayOfWeek: string; startTime: string; endTime: string; isBreak: boolean; name: string };
  subject: { id: number; name: string };
  subClass: { id: number; name: string; class?: { id: number; name: string } };
}

interface TimetableResponse {
  success: boolean;
  data: { schedule: TimeSlot[] };
}

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

const statusColor = (s: LogbookStatus): 'green' | 'yellow' | 'red' =>
  s === 'COMPLETED' ? 'green' : s === 'PARTIAL' ? 'yellow' : 'red';

export default function TeacherLogbookPage() {
  const { data } = useSWR<TimetableResponse>('/teachers/me/timetable', (url: string) => apiService.get(url));

  const [fillTarget, setFillTarget] = useState<TimeSlot | null>(null);
  const [editTarget, setEditTarget] = useState<LogbookEntry | null>(null);
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LogbookEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const teacherPeriodIdOf = (s: TimeSlot) => s.teacherPeriodId ?? s.id;

  const periodsByDay = useMemo(() => {
    const schedule = data?.data?.schedule || [];
    const byDay: Record<string, TimeSlot[]> = {};
    schedule
      .filter((s) => !s.period?.isBreak)
      .forEach((s) => {
        const d = s.period?.dayOfWeek || 'OTHER';
        (byDay[d] ||= []).push(s);
      });
    Object.values(byDay).forEach((list) =>
      list.sort((a, b) => (a.period.startTime || '').localeCompare(b.period.startTime || '')),
    );
    return byDay;
  }, [data]);

  const loadEntries = useCallback(async () => {
    setIsLoadingEntries(true);
    try {
      // Teachers are auto-scoped to their own entries server-side.
      setEntries(await listLogbook());
    } catch {
      setEntries([]);
    } finally {
      setIsLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteLogbookEntry(deleteTarget.id);
      toast.success('Entry deleted.');
      setDeleteTarget(null);
      loadEntries();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message !== 'Unauthorized') toast.error(message || 'Could not delete the entry.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpenIcon className="h-7 w-7 text-blue-600" />
            Teacher Logbook
          </h1>
          <p className="text-gray-600 mt-1">
            Pick a period and log the lesson you taught against the scheme of work.
          </p>
        </div>

        {/* Periods to fill */}
        <div className="space-y-3">
          {DAYS.filter((d) => periodsByDay[d]?.length).map((day) => (
            <div key={day} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {day.charAt(0) + day.slice(1).toLowerCase()}
              </div>
              <div className="divide-y divide-gray-100">
                {periodsByDay[day].map((s) => (
                  <div key={s.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{s.subject?.name}</div>
                      <div className="text-xs text-gray-500">
                        {s.subClass?.class?.name ? `${s.subClass.class.name} · ` : ''}
                        {s.subClass?.name}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {s.period.name} · {s.period.startTime}–{s.period.endTime}
                      </div>
                    </div>
                    <Button size="sm" color="primary" variant="outline" leftIcon={PlusIcon} onClick={() => setFillTarget(s)}>
                      Fill logbook
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!data && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
              Loading your timetable…
            </div>
          )}
        </div>

        {/* History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 text-sm font-semibold text-gray-800">
            My logbook history
          </div>
          {isLoadingEntries ? (
            <div className="px-4 py-8 text-center text-gray-500">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">No entries yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Class · Subject</th>
                    <th className="px-4 py-2 text-left">Lesson</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Reviewed</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700">{e.dateTaught?.split('T')[0]}</td>
                      <td className="px-4 py-2 text-gray-700">
                        {e.teacherPeriod?.subClass?.name || '—'}
                        {e.teacherPeriod?.subject?.name ? ` · ${e.teacherPeriod.subject.name}` : ''}
                      </td>
                      <td className="px-4 py-2 text-gray-700">{e.lesson?.title || `Lesson #${e.lessonId}`}</td>
                      <td className="px-4 py-2">
                        <Badge color={statusColor(e.status)} variant="subtle">{e.status.replace('_', ' ')}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        {e.reviewedAt ? <Badge color="green" variant="subtle">Reviewed</Badge> : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          <button type="button" title="Edit" onClick={() => setEditTarget(e)} className="p-1 text-gray-400 hover:text-blue-600">
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button type="button" title="Delete" onClick={() => setDeleteTarget(e)} className="p-1 text-gray-400 hover:text-red-600">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Fill / edit modal */}
      <Modal
        isOpen={!!fillTarget || !!editTarget}
        onClose={() => {
          setFillTarget(null);
          setEditTarget(null);
        }}
        title={
          editTarget
            ? 'Edit logbook entry'
            : fillTarget
              ? `Log lesson — ${fillTarget.subject?.name} · ${fillTarget.subClass?.name}`
              : 'Logbook'
        }
        size="lg"
      >
        {(fillTarget || editTarget) && (
          <LogbookForm
            teacherPeriodId={editTarget ? editTarget.teacherPeriodId : teacherPeriodIdOf(fillTarget!)}
            editingEntry={editTarget ?? undefined}
            onSaved={() => {
              setFillTarget(null);
              setEditTarget(null);
              loadEntries();
            }}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete entry" size="sm">
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Delete the logbook entry for{' '}
              <span className="font-medium text-gray-900">{deleteTarget.lesson?.title || `lesson #${deleteTarget.lessonId}`}</span>{' '}
              on {deleteTarget.dateTaught?.split('T')[0]}?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
              <Button color="danger" isLoading={isDeleting} onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
