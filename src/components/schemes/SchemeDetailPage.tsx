'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, Select, TextArea, Modal, Badge } from '@/components/ui';
import apiService from '@/lib/apiService';
import {
  getScheme,
  getSchemeCoverage,
  updateScheme,
  addModule,
  updateModule,
  deleteModule,
  addChapter,
  updateChapter,
  deleteChapter,
  addLesson,
  updateLesson,
  deleteLesson,
  LESSON_ENTRY_TYPES,
  type SubjectScheme,
  type SchemeModule,
  type SchemeChapter,
  type SchemeLesson,
  type LessonEntryType,
} from '@/lib/subjectSchemeApi';

interface SchemeDetailPageProps {
  schemeId: number;
  basePath: string; // back link target (the list page)
  // Read-only roles (e.g. HOD) see the tree + coverage but no edit controls.
  readOnly?: boolean;
}

type LessonForm = {
  order: string;
  entryType: LessonEntryType;
  title: string;
  objectives: string;
  handsOnActivities: string;
  weekNumber: string;
  periodsCount: string;
  digitalResourceAvailable: boolean;
  digitalResourcesUsed: string;
};

const EMPTY_LESSON_FORM: LessonForm = {
  order: '',
  entryType: 'LESSON',
  title: '',
  objectives: '',
  handsOnActivities: '',
  weekNumber: '',
  periodsCount: '1',
  digitalResourceAvailable: false,
  digitalResourcesUsed: '',
};

export function SchemeDetailPage({ schemeId, basePath, readOnly = false }: SchemeDetailPageProps) {
  const router = useRouter();

  const [scheme, setScheme] = useState<SubjectScheme | null>(null);
  // Resolve subject/class names — the scheme payload only carries their ids.
  const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [coverage, setCoverage] = useState<{ totalLessons: number; completedLessons: number; coveragePercent: number } | null>(null);
  const [taughtLessonIds, setTaughtLessonIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set()); // module ids

  // Header edit
  const [isHeaderOpen, setIsHeaderOpen] = useState(false);
  const [headerForm, setHeaderForm] = useState({ periodsPerWeek: '', annualTeachingHours: '', notes: '' });

  // Module modal
  const [moduleModal, setModuleModal] = useState<{ editing?: SchemeModule } | null>(null);
  const [moduleForm, setModuleForm] = useState({ order: '', code: '', title: '' });

  // Chapter modal
  const [chapterModal, setChapterModal] = useState<{ moduleId: number; editing?: SchemeChapter } | null>(null);
  const [chapterForm, setChapterForm] = useState({ order: '', code: '', title: '' });

  // Lesson modal
  const [lessonModal, setLessonModal] = useState<{ chapterId: number; editing?: SchemeLesson } | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonForm>(EMPTY_LESSON_FORM);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'module' | 'chapter' | 'lesson'; id: number; label: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      // Coverage returns the full tree + per-lesson counts + summary in one call.
      const cov = await getSchemeCoverage(schemeId);
      setScheme(cov.scheme);
      setCoverage(cov.summary);
      const taught = new Set<number>();
      cov.scheme.modules?.forEach((m) =>
        m.chapters?.forEach((c) =>
          c.lessons?.forEach((l) => {
            if ((l._count?.logbookEntries ?? 0) > 0) taught.add(l.id);
          }),
        ),
      );
      setTaughtLessonIds(taught);
      setExpanded((prev) => (prev.size ? prev : new Set(cov.scheme.modules?.map((m) => m.id) ?? [])));
    } catch {
      // Fall back to the plain tree if coverage is unavailable.
      try {
        const s = await getScheme(schemeId);
        setScheme(s);
        setCoverage(null);
        setExpanded((prev) => (prev.size ? prev : new Set(s.modules?.map((m) => m.id) ?? [])));
      } catch {
        setScheme(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [schemeId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    apiService
      .get<{ data: { id: number; name: string }[] }>('/subjects?limit=200')
      .then((r) => setSubjects(r.data || []))
      .catch(() => setSubjects([]));
    apiService
      .get<{ data: { id: number; name: string }[] }>('/classes?limit=100')
      .then((r) => setClasses(r.data || []))
      .catch(() => setClasses([]));
  }, []);

  const subjectLabel =
    scheme?.subject?.name || subjects.find((s) => s.id === scheme?.subjectId)?.name || `Subject #${scheme?.subjectId}`;
  const classLabel =
    scheme?.class?.name || classes.find((c) => c.id === scheme?.classId)?.name || `Class #${scheme?.classId}`;

  const toggleModule = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const run = async (fn: () => Promise<unknown>, successMsg?: string) => {
    setIsBusy(true);
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
      await load();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message !== 'Unauthorized') toast.error(message || 'Action failed.');
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  // ---- Header ----
  const openHeader = () => {
    setHeaderForm({
      periodsPerWeek: scheme?.periodsPerWeek != null ? String(scheme.periodsPerWeek) : '',
      annualTeachingHours: scheme?.annualTeachingHours != null ? String(scheme.annualTeachingHours) : '',
      notes: scheme?.notes ?? '',
    });
    setIsHeaderOpen(true);
  };
  const saveHeader = async () => {
    const ok = await run(
      () =>
        updateScheme(schemeId, {
          periodsPerWeek: headerForm.periodsPerWeek ? Number(headerForm.periodsPerWeek) : undefined,
          annualTeachingHours: headerForm.annualTeachingHours ? Number(headerForm.annualTeachingHours) : undefined,
          notes: headerForm.notes.trim() || undefined,
        }),
      'Scheme updated.',
    );
    if (ok) setIsHeaderOpen(false);
  };

  // ---- Module ----
  const openModule = (editing?: SchemeModule) => {
    setModuleForm({
      order: editing ? String(editing.order) : String((scheme?.modules?.length ?? 0) + 1),
      code: editing?.code ?? '',
      title: editing?.title ?? '',
    });
    setModuleModal({ editing });
  };
  const saveModule = async () => {
    if (!moduleForm.title.trim()) return toast.error('Module title is required.');
    const body = { order: Number(moduleForm.order) || 1, code: moduleForm.code.trim() || undefined, title: moduleForm.title.trim() };
    const ok = await run(
      () => (moduleModal?.editing ? updateModule(moduleModal.editing.id, body) : addModule(schemeId, body)),
      moduleModal?.editing ? 'Module updated.' : 'Module added.',
    );
    if (ok) setModuleModal(null);
  };

  // ---- Chapter ----
  const openChapter = (moduleId: number, editing?: SchemeChapter, count = 0) => {
    setChapterForm({
      order: editing ? String(editing.order) : String(count + 1),
      code: editing?.code ?? '',
      title: editing?.title ?? '',
    });
    setChapterModal({ moduleId, editing });
  };
  const saveChapter = async () => {
    if (!chapterModal) return;
    if (!chapterForm.title.trim()) return toast.error('Chapter title is required.');
    const body = { order: Number(chapterForm.order) || 1, code: chapterForm.code.trim() || undefined, title: chapterForm.title.trim() };
    const ok = await run(
      () => (chapterModal.editing ? updateChapter(chapterModal.editing.id, body) : addChapter(chapterModal.moduleId, body)),
      chapterModal.editing ? 'Chapter updated.' : 'Chapter added.',
    );
    if (ok) setChapterModal(null);
  };

  // ---- Lesson ----
  const openLesson = (chapterId: number, editing?: SchemeLesson, count = 0) => {
    setLessonForm(
      editing
        ? {
            order: String(editing.order),
            entryType: editing.entryType,
            title: editing.title,
            objectives: editing.objectives ?? '',
            handsOnActivities: editing.handsOnActivities ?? '',
            weekNumber: editing.weekNumber != null ? String(editing.weekNumber) : '',
            periodsCount: editing.periodsCount != null ? String(editing.periodsCount) : '1',
            digitalResourceAvailable: !!editing.digitalResourceAvailable,
            digitalResourcesUsed: editing.digitalResourcesUsed ?? '',
          }
        : { ...EMPTY_LESSON_FORM, order: String(count + 1) },
    );
    setLessonModal({ chapterId, editing });
  };
  const saveLesson = async () => {
    if (!lessonModal) return;
    if (!lessonForm.title.trim()) return toast.error('Lesson title is required.');
    const body = {
      order: Number(lessonForm.order) || 1,
      entryType: lessonForm.entryType,
      title: lessonForm.title.trim(),
      objectives: lessonForm.objectives.trim() || undefined,
      handsOnActivities: lessonForm.handsOnActivities.trim() || undefined,
      weekNumber: lessonForm.weekNumber ? Number(lessonForm.weekNumber) : undefined,
      periodsCount: lessonForm.periodsCount ? Number(lessonForm.periodsCount) : undefined,
      digitalResourceAvailable: lessonForm.digitalResourceAvailable,
      digitalResourcesUsed: lessonForm.digitalResourcesUsed.trim() || undefined,
    };
    const ok = await run(
      () => (lessonModal.editing ? updateLesson(lessonModal.editing.id, body) : addLesson(lessonModal.chapterId, body)),
      lessonModal.editing ? 'Lesson updated.' : 'Lesson added.',
    );
    if (ok) setLessonModal(null);
  };

  // ---- Delete ----
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { kind, id } = deleteTarget;
    const fn = kind === 'module' ? () => deleteModule(id) : kind === 'chapter' ? () => deleteChapter(id) : () => deleteLesson(id);
    const ok = await run(fn, `${kind[0].toUpperCase()}${kind.slice(1)} deleted.`);
    if (ok) setDeleteTarget(null);
  };

  const coverageColor = useMemo(() => {
    const p = coverage?.coveragePercent ?? 0;
    return p >= 75 ? 'bg-emerald-500' : p >= 40 ? 'bg-amber-500' : 'bg-red-500';
  }, [coverage]);

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 p-6 text-center text-gray-500">Loading scheme…</div>;
  }
  if (!scheme) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Button variant="outline" leftIcon={ArrowLeftIcon} onClick={() => router.push(basePath)}>
          Back
        </Button>
        <div className="mt-6 text-center text-gray-500">Scheme not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" leftIcon={ArrowLeftIcon} onClick={() => router.push(basePath)}>
          All schemes
        </Button>

        {/* Header card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {subjectLabel} · {classLabel}
              </h1>
              <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {scheme.periodsPerWeek != null && <span>{scheme.periodsPerWeek} periods/wk</span>}
                {scheme.annualTeachingHours != null && <span>{scheme.annualTeachingHours} hrs/yr</span>}
              </div>
              {scheme.notes && <div className="text-sm text-gray-400 mt-1">{scheme.notes}</div>}
            </div>
            {!readOnly && (
              <Button size="sm" variant="outline" leftIcon={PencilSquareIcon} onClick={openHeader}>
                Edit header
              </Button>
            )}
          </div>

          {/* Coverage bar */}
          {coverage && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Scheme coverage</span>
                <span className="font-medium">
                  {coverage.completedLessons}/{coverage.totalLessons} lessons · {coverage.coveragePercent}%
                </span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${coverageColor}`} style={{ width: `${coverage.coveragePercent}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Modules */}
        {!readOnly && (
          <div className="flex justify-end">
            <Button size="sm" color="primary" leftIcon={PlusIcon} onClick={() => openModule()}>
              Add module
            </Button>
          </div>
        )}

        {(scheme.modules?.length ?? 0) === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            {readOnly
              ? 'No modules defined yet.'
              : 'No modules yet. Add the first module to start building the scheme.'}
          </div>
        ) : (
          scheme.modules.map((m) => {
            const open = expanded.has(m.id);
            return (
              <div key={m.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between gap-2 bg-gray-50">
                  <button type="button" className="flex items-center gap-2 text-left flex-1" onClick={() => toggleModule(m.id)}>
                    {open ? <ChevronDownIcon className="h-4 w-4 text-gray-400" /> : <ChevronRightIcon className="h-4 w-4 text-gray-400" />}
                    <span className="text-sm font-semibold text-gray-900">
                      {m.code ? `${m.code} — ` : ''}{m.title}
                    </span>
                    <Badge color="gray" variant="subtle">{m.chapters?.length ?? 0} ch.</Badge>
                  </button>
                  {!readOnly && (
                    <div className="flex gap-1">
                      <button type="button" title="Edit module" onClick={() => openModule(m)} className="p-1.5 text-gray-400 hover:text-blue-600">
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button type="button" title="Delete module" onClick={() => setDeleteTarget({ kind: 'module', id: m.id, label: m.title })} className="p-1.5 text-gray-400 hover:text-red-600">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {open && (
                  <div className="px-4 py-3 space-y-3">
                    {(m.chapters?.length ?? 0) === 0 && (
                      <div className="text-xs text-gray-400">No chapters yet.</div>
                    )}
                    {m.chapters?.map((c) => (
                      <div key={c.id} className="border border-gray-100 rounded-lg">
                        <div className="px-3 py-2 flex items-center justify-between gap-2">
                          <div className="text-sm font-medium text-gray-800">
                            {c.code ? `${c.code} — ` : ''}{c.title}
                          </div>
                          {!readOnly && (
                            <div className="flex gap-1">
                              <button type="button" title="Edit chapter" onClick={() => openChapter(m.id, c)} className="p-1.5 text-gray-400 hover:text-blue-600">
                                <PencilSquareIcon className="h-4 w-4" />
                              </button>
                              <button type="button" title="Delete chapter" onClick={() => setDeleteTarget({ kind: 'chapter', id: c.id, label: c.title })} className="p-1.5 text-gray-400 hover:text-red-600">
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="px-3 pb-2 space-y-1">
                          {c.lessons?.map((l) => (
                            <div key={l.id} className="flex items-center justify-between gap-2 text-sm py-1 border-t border-gray-50">
                              <div className="flex items-center gap-2 min-w-0">
                                {taughtLessonIds.has(l.id) ? (
                                  <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0" />
                                ) : (
                                  <span className="h-4 w-4 shrink-0" />
                                )}
                                <span className="text-gray-400 text-xs w-6 shrink-0">{l.order}.</span>
                                <span className="truncate text-gray-800">{l.title}</span>
                                {l.entryType !== 'LESSON' && <Badge color="purple" variant="subtle">{l.entryType}</Badge>}
                                {l.weekNumber != null && <span className="text-xs text-gray-400">wk {l.weekNumber}</span>}
                              </div>
                              {!readOnly && (
                                <div className="flex gap-1 shrink-0">
                                  <button type="button" title="Edit lesson" onClick={() => openLesson(c.id, l)} className="p-1 text-gray-400 hover:text-blue-600">
                                    <PencilSquareIcon className="h-4 w-4" />
                                  </button>
                                  <button type="button" title="Delete lesson" onClick={() => setDeleteTarget({ kind: 'lesson', id: l.id, label: l.title })} className="p-1 text-gray-400 hover:text-red-600">
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => openLesson(c.id, undefined, c.lessons?.length ?? 0)}
                              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                            >
                              <PlusIcon className="h-3.5 w-3.5" /> Add lesson
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => openChapter(m.id, undefined, m.chapters?.length ?? 0)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        <PlusIcon className="h-3.5 w-3.5" /> Add chapter
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Header modal */}
      <Modal isOpen={isHeaderOpen} onClose={() => setIsHeaderOpen(false)} title="Edit scheme header" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Periods / week" type="number" min={0} value={headerForm.periodsPerWeek} onChange={(e) => setHeaderForm((f) => ({ ...f, periodsPerWeek: e.target.value }))} />
            <Input label="Annual teaching hours" type="number" min={0} value={headerForm.annualTeachingHours} onChange={(e) => setHeaderForm((f) => ({ ...f, annualTeachingHours: e.target.value }))} />
          </div>
          <TextArea label="Notes" rows={2} value={headerForm.notes} onChange={(e) => setHeaderForm((f) => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button variant="outline" onClick={() => setIsHeaderOpen(false)} disabled={isBusy}>Cancel</Button>
            <Button color="primary" isLoading={isBusy} onClick={saveHeader}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Module modal */}
      <Modal isOpen={!!moduleModal} onClose={() => setModuleModal(null)} title={moduleModal?.editing ? 'Edit module' : 'Add module'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Input label="Order" type="number" min={1} value={moduleForm.order} onChange={(e) => setModuleForm((f) => ({ ...f, order: e.target.value }))} />
            <div className="col-span-2">
              <Input label="Code" value={moduleForm.code} onChange={(e) => setModuleForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. MODULE I" />
            </div>
          </div>
          <Input label="Title *" value={moduleForm.title} onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button variant="outline" onClick={() => setModuleModal(null)} disabled={isBusy}>Cancel</Button>
            <Button color="primary" isLoading={isBusy} onClick={saveModule}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Chapter modal */}
      <Modal isOpen={!!chapterModal} onClose={() => setChapterModal(null)} title={chapterModal?.editing ? 'Edit chapter' : 'Add chapter'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Input label="Order" type="number" min={1} value={chapterForm.order} onChange={(e) => setChapterForm((f) => ({ ...f, order: e.target.value }))} />
            <div className="col-span-2">
              <Input label="Code" value={chapterForm.code} onChange={(e) => setChapterForm((f) => ({ ...f, code: e.target.value }))} />
            </div>
          </div>
          <Input label="Title *" value={chapterForm.title} onChange={(e) => setChapterForm((f) => ({ ...f, title: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button variant="outline" onClick={() => setChapterModal(null)} disabled={isBusy}>Cancel</Button>
            <Button color="primary" isLoading={isBusy} onClick={saveChapter}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Lesson modal */}
      <Modal isOpen={!!lessonModal} onClose={() => setLessonModal(null)} title={lessonModal?.editing ? 'Edit lesson' : 'Add lesson'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input label="Order" type="number" min={1} value={lessonForm.order} onChange={(e) => setLessonForm((f) => ({ ...f, order: e.target.value }))} />
            <Select
              label="Type"
              value={lessonForm.entryType}
              onChange={(e) => setLessonForm((f) => ({ ...f, entryType: e.target.value as LessonEntryType }))}
              options={LESSON_ENTRY_TYPES.map((t) => ({ value: t, label: t }))}
            />
            <Input label="Week #" type="number" min={1} max={36} value={lessonForm.weekNumber} onChange={(e) => setLessonForm((f) => ({ ...f, weekNumber: e.target.value }))} />
            <Input label="Periods" type="number" min={1} value={lessonForm.periodsCount} onChange={(e) => setLessonForm((f) => ({ ...f, periodsCount: e.target.value }))} />
          </div>
          <Input label="Title *" value={lessonForm.title} onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))} />
          <TextArea label="Objectives" rows={2} value={lessonForm.objectives} onChange={(e) => setLessonForm((f) => ({ ...f, objectives: e.target.value }))} />
          <TextArea label="Hands-on activities" rows={2} value={lessonForm.handsOnActivities} onChange={(e) => setLessonForm((f) => ({ ...f, handsOnActivities: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={lessonForm.digitalResourceAvailable} onChange={(e) => setLessonForm((f) => ({ ...f, digitalResourceAvailable: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            Digital resource available
          </label>
          {lessonForm.digitalResourceAvailable && (
            <Input label="Digital resources used" value={lessonForm.digitalResourcesUsed} onChange={(e) => setLessonForm((f) => ({ ...f, digitalResourcesUsed: e.target.value }))} />
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button variant="outline" onClick={() => setLessonModal(null)} disabled={isBusy}>Cancel</Button>
            <Button color="primary" isLoading={isBusy} onClick={saveLesson}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={`Delete ${deleteTarget?.kind ?? ''}`} size="sm">
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Delete <span className="font-medium text-gray-900">{deleteTarget.label}</span>
              {deleteTarget.kind !== 'lesson' ? ' and everything under it' : ''}? A lesson with logbook
              entries cannot be deleted.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isBusy}>Cancel</Button>
              <Button color="danger" isLoading={isBusy} onClick={confirmDelete}>Delete</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
