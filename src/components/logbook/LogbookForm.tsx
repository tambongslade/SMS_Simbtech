'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button, Input, Select, TextArea } from '@/components/ui';
import {
  getSchemeByTeacherPeriod,
  createLogbookEntry,
  updateLogbookEntry,
  LOGBOOK_STATUSES,
  type SubjectScheme,
  type LogbookEntry,
  type LogbookStatus,
} from '@/lib/subjectSchemeApi';

const today = () => new Date().toISOString().split('T')[0];

interface LogbookFormProps {
  teacherPeriodId: number;
  // When set, edit an existing entry instead of creating a new one.
  editingEntry?: LogbookEntry;
  onSaved?: () => void;
}

// Finds the module/chapter that contains a given lesson, for pre-selecting on edit.
const locateLesson = (scheme: SubjectScheme | null, lessonId?: number) => {
  if (!scheme || !lessonId) return { moduleId: '', chapterId: '' };
  for (const m of scheme.modules || []) {
    for (const c of m.chapters || []) {
      if (c.lessons?.some((l) => l.id === lessonId)) {
        return { moduleId: String(m.id), chapterId: String(c.id) };
      }
    }
  }
  return { moduleId: '', chapterId: '' };
};

export function LogbookForm({ teacherPeriodId, editingEntry, onSaved }: LogbookFormProps) {
  const [scheme, setScheme] = useState<SubjectScheme | null>(null);
  const [noScheme, setNoScheme] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [moduleId, setModuleId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [lessonId, setLessonId] = useState<string>(editingEntry ? String(editingEntry.lessonId) : '');
  const [dateTaught, setDateTaught] = useState(editingEntry?.dateTaught?.split('T')[0] ?? today());
  const [status, setStatus] = useState<LogbookStatus>(editingEntry?.status ?? 'COMPLETED');
  const [notes, setNotes] = useState(editingEntry?.notes ?? '');
  const [homeworkGiven, setHomeworkGiven] = useState(editingEntry?.homeworkGiven ?? '');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getSchemeByTeacherPeriod(teacherPeriodId)
      .then((s) => {
        if (cancelled) return;
        if (!s) {
          setNoScheme(true);
          return;
        }
        setScheme(s);
        // Pre-select the module/chapter for an entry being edited.
        const loc = locateLesson(s, editingEntry?.lessonId);
        setModuleId(loc.moduleId);
        setChapterId(loc.chapterId);
      })
      .catch(() => {
        if (!cancelled) setScheme(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teacherPeriodId, editingEntry?.lessonId]);

  const modules = useMemo(() => scheme?.modules || [], [scheme]);
  const chapters = useMemo(
    () => modules.find((m) => String(m.id) === moduleId)?.chapters || [],
    [modules, moduleId],
  );
  const lessons = useMemo(
    () => chapters.find((c) => String(c.id) === chapterId)?.lessons || [],
    [chapters, chapterId],
  );

  const handleSubmit = async () => {
    if (!lessonId) return toast.error('Pick the lesson you taught.');
    if (!dateTaught) return toast.error('Pick the date.');
    setIsSubmitting(true);
    try {
      if (editingEntry) {
        await updateLogbookEntry(editingEntry.id, {
          lessonId: Number(lessonId),
          dateTaught,
          status,
          notes: notes.trim() || undefined,
          homeworkGiven: homeworkGiven.trim() || undefined,
        });
        toast.success('Logbook entry updated.');
      } else {
        await createLogbookEntry({
          teacherPeriodId,
          lessonId: Number(lessonId),
          dateTaught,
          status,
          notes: notes.trim() || undefined,
          homeworkGiven: homeworkGiven.trim() || undefined,
        });
        toast.success('Lesson logged.');
      }
      onSaved?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message !== 'Unauthorized') toast.error(message || 'Could not save the logbook entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-gray-500">Loading scheme…</div>;
  }

  if (noScheme) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-700 font-medium">No scheme defined for this class/subject yet.</p>
        <p className="text-sm text-gray-500 mt-1">
          Ask the Vice-Principal or Dean of Studies to create the scheme of work before logging lessons.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select
          label="Module *"
          value={moduleId}
          onChange={(e) => {
            setModuleId(e.target.value);
            setChapterId('');
            setLessonId('');
          }}
          options={[
            { value: '', label: 'Select module…' },
            ...modules.map((m) => ({ value: String(m.id), label: m.code ? `${m.code} — ${m.title}` : m.title })),
          ]}
        />
        <Select
          label="Chapter *"
          value={chapterId}
          disabled={!moduleId}
          onChange={(e) => {
            setChapterId(e.target.value);
            setLessonId('');
          }}
          options={[
            { value: '', label: moduleId ? 'Select chapter…' : 'Pick a module first' },
            ...chapters.map((c) => ({ value: String(c.id), label: c.code ? `${c.code} — ${c.title}` : c.title })),
          ]}
        />
        <Select
          label="Lesson *"
          value={lessonId}
          disabled={!chapterId}
          onChange={(e) => setLessonId(e.target.value)}
          options={[
            { value: '', label: chapterId ? 'Select lesson…' : 'Pick a chapter first' },
            ...lessons.map((l) => ({ value: String(l.id), label: `${l.order}. ${l.title}` })),
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Date taught *" type="date" value={dateTaught} onChange={(e) => setDateTaught(e.target.value)} />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as LogbookStatus)}
          options={LOGBOOK_STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
        />
      </div>

      <TextArea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Covered first 3 objectives" />
      <Input label="Homework given" value={homeworkGiven} onChange={(e) => setHomeworkGiven(e.target.value)} placeholder="e.g. Exercise 2 p.42" />

      <div className="flex justify-end pt-2 border-t border-gray-200">
        <Button color="primary" isLoading={isSubmitting} onClick={handleSubmit}>
          {editingEntry ? 'Save changes' : 'Log lesson'}
        </Button>
      </div>
    </div>
  );
}
