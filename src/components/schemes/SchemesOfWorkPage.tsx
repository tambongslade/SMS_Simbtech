'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PlusIcon,
  TrashIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, CardBody, Input, Select, TextArea, Modal, Badge } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';
import { sortClassesByLevel } from '@/lib/classOrdering';
import {
  listSchemes,
  createScheme,
  deleteScheme,
  downloadSchemeTemplate,
  importSchemes,
  saveBlob,
  type SubjectScheme,
  type SchemeImportResult,
} from '@/lib/subjectSchemeApi';

interface NamedRef {
  id: number;
  name: string;
}

interface SchemesOfWorkPageProps {
  // Role-specific base, e.g. /dashboard/vice-principal/schemes-of-work
  basePath: string;
  // Read-only roles (e.g. HOD) can browse schemes but not create/upload/delete.
  readOnly?: boolean;
}

export function SchemesOfWorkPage({ basePath, readOnly = false }: SchemesOfWorkPageProps) {
  const router = useRouter();
  const { selectedAcademicYear } = useAuth();

  const [subjects, setSubjects] = useState<NamedRef[]>([]);
  const [classes, setClasses] = useState<NamedRef[]>([]);
  const [schemes, setSchemes] = useState<SubjectScheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [subjectFilter, setSubjectFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // Create-manual modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    subjectId: '',
    classId: '',
    periodsPerWeek: '',
    annualTeachingHours: '',
    notes: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  // Upload modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadReplace, setUploadReplace] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<SchemeImportResult | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<SubjectScheme | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const subjectName = useCallback(
    (id?: number) => subjects.find((s) => s.id === id)?.name,
    [subjects],
  );
  const className = useCallback((id?: number) => classes.find((c) => c.id === id)?.name, [classes]);

  useEffect(() => {
    apiService
      .get<{ data: NamedRef[] }>('/subjects?limit=200')
      .then((r) => setSubjects(r.data || []))
      .catch(() => setSubjects([]));
    apiService
      .get<{ data: NamedRef[] }>('/classes?limit=100')
      .then((r) => setClasses(sortClassesByLevel(r.data || [])))
      .catch(() => setClasses([]));
  }, []);

  const loadSchemes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listSchemes({
        subjectId: subjectFilter ? Number(subjectFilter) : undefined,
        classId: classFilter ? Number(classFilter) : undefined,
        academicYearId: selectedAcademicYear?.id,
      });
      setSchemes(data);
    } catch {
      setSchemes([]);
    } finally {
      setIsLoading(false);
    }
  }, [subjectFilter, classFilter, selectedAcademicYear?.id]);

  useEffect(() => {
    loadSchemes();
  }, [loadSchemes]);

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadSchemeTemplate();
      saveBlob(blob, 'subject-scheme-template.xlsx');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message !== 'Unauthorized') toast.error(message || 'Could not download the template.');
    }
  };

  const handleCreate = async () => {
    if (!createForm.subjectId || !createForm.classId) {
      toast.error('Pick a subject and a class.');
      return;
    }
    setIsCreating(true);
    try {
      const scheme = await createScheme({
        subjectId: Number(createForm.subjectId),
        classId: Number(createForm.classId),
        academicYearId: selectedAcademicYear?.id,
        periodsPerWeek: createForm.periodsPerWeek ? Number(createForm.periodsPerWeek) : undefined,
        annualTeachingHours: createForm.annualTeachingHours
          ? Number(createForm.annualTeachingHours)
          : undefined,
        notes: createForm.notes.trim() || undefined,
      });
      toast.success('Scheme created. Add its modules, chapters and lessons next.');
      setIsCreateOpen(false);
      setCreateForm({ subjectId: '', classId: '', periodsPerWeek: '', annualTeachingHours: '', notes: '' });
      router.push(`${basePath}/${scheme.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message !== 'Unauthorized') toast.error(message || 'Could not create the scheme.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('Choose an .xlsx file first.');
      return;
    }
    setIsUploading(true);
    setUploadResult(null);
    try {
      const result = await importSchemes(uploadFile, {
        academicYearId: selectedAcademicYear?.id,
        replace: uploadReplace,
      });
      setUploadResult(result);
      if (result.status === 201) {
        toast.success(`Imported ${result.created.length} scheme(s).`);
      } else {
        toast.error(`Partial import — ${result.created.length} ok, ${result.errors.length} failed.`);
      }
      loadSchemes();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message !== 'Unauthorized') toast.error(message || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteScheme(deleteTarget.id);
      toast.success('Scheme deleted.');
      setDeleteTarget(null);
      loadSchemes();
    } catch (error) {
      // apiService surfaces the 409 "Cannot delete: N logbook entries…" message.
      const message = error instanceof Error ? error.message : '';
      if (message !== 'Unauthorized') toast.error(message || 'Could not delete the scheme.');
    } finally {
      setIsDeleting(false);
    }
  };

  const subjectOptions = useMemo(
    () => [{ value: '', label: 'Select subject…' }, ...subjects.map((s) => ({ value: String(s.id), label: s.name }))],
    [subjects],
  );
  const classOptions = useMemo(
    () => [{ value: '', label: 'Select class…' }, ...classes.map((c) => ({ value: String(c.id), label: c.name }))],
    [classes],
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpenIcon className="h-7 w-7 text-blue-600" />
                Schemes of Work
              </h1>
              <p className="text-gray-600 mt-1">
                Define each subject’s scheme per class
                {selectedAcademicYear ? ` for ${selectedAcademicYear.name}` : ''}. Teachers log lessons
                against these.
              </p>
            </div>
            {!readOnly && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" leftIcon={ArrowDownTrayIcon} onClick={handleDownloadTemplate}>
                  Template
                </Button>
                <Button variant="outline" leftIcon={ArrowUpTrayIcon} onClick={() => { setUploadResult(null); setIsUploadOpen(true); }}>
                  Upload Excel
                </Button>
                <Button color="primary" leftIcon={PlusIcon} onClick={() => setIsCreateOpen(true)}>
                  New Scheme
                </Button>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="min-w-[200px]">
              <Select
                label="Filter by subject"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                options={[{ value: '', label: 'All subjects' }, ...subjects.map((s) => ({ value: String(s.id), label: s.name }))]}
              />
            </div>
            <div className="min-w-[200px]">
              <Select
                label="Filter by class"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                options={[{ value: '', label: 'All classes' }, ...classes.map((c) => ({ value: String(c.id), label: c.name }))]}
              />
            </div>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            Loading schemes…
          </div>
        ) : schemes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            {readOnly
              ? 'No schemes have been created yet.'
              : 'No schemes yet. Create one manually or upload a filled Excel template.'}
          </div>
        ) : (
          <div className="space-y-2">
            {schemes.map((s) => {
              const moduleCount = s._count?.modules ?? s.modules?.length ?? 0;
              return (
                <Card key={s.id}>
                  <CardBody>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {s.subject?.name || subjectName(s.subjectId) || `Subject #${s.subjectId}`}
                          {' · '}
                          {s.class?.name || className(s.classId) || `Class #${s.classId}`}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                          {s.periodsPerWeek != null && <span>{s.periodsPerWeek} periods/wk</span>}
                          {s.annualTeachingHours != null && <span>{s.annualTeachingHours} hrs/yr</span>}
                          <Badge color="blue" variant="subtle">{moduleCount} module{moduleCount === 1 ? '' : 's'}</Badge>
                        </div>
                        {s.notes && <div className="text-xs text-gray-400 mt-1">{s.notes}</div>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" color="primary" variant="outline" onClick={() => router.push(`${basePath}/${s.id}`)}>
                          {readOnly ? 'View' : 'Open'}
                        </Button>
                        {!readOnly && (
                          <Button size="sm" color="danger" variant="outline" leftIcon={TrashIcon} onClick={() => setDeleteTarget(s)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create-manual modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Scheme" size="md">
        <div className="space-y-4">
          <Select
            label="Subject *"
            value={createForm.subjectId}
            onChange={(e) => setCreateForm((f) => ({ ...f, subjectId: e.target.value }))}
            options={subjectOptions}
          />
          <Select
            label="Class *"
            value={createForm.classId}
            onChange={(e) => setCreateForm((f) => ({ ...f, classId: e.target.value }))}
            options={classOptions}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Periods / week"
              type="number"
              min={0}
              value={createForm.periodsPerWeek}
              onChange={(e) => setCreateForm((f) => ({ ...f, periodsPerWeek: e.target.value }))}
            />
            <Input
              label="Annual teaching hours"
              type="number"
              min={0}
              value={createForm.annualTeachingHours}
              onChange={(e) => setCreateForm((f) => ({ ...f, annualTeachingHours: e.target.value }))}
            />
          </div>
          <TextArea
            label="Notes"
            rows={2}
            value={createForm.notes}
            onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="e.g. Form 1 Physics 2025/2026"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button color="primary" isLoading={isCreating} onClick={handleCreate}>
              Create & add lessons
            </Button>
          </div>
        </div>
      </Modal>

      {/* Upload modal */}
      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload filled Excel" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload the filled template. Each sheet becomes one subject/class scheme.
          </p>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={uploadReplace}
              onChange={(e) => setUploadReplace(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Replace existing schemes for the same subject/class/year
          </label>

          {/* Per-sheet results (201 full or 207 partial) */}
          {uploadResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="text-xs font-semibold text-green-800 mb-2">
                  Imported ({uploadResult.created.length})
                </div>
                {uploadResult.created.length === 0 ? (
                  <div className="text-xs text-green-700/70">None.</div>
                ) : (
                  <ul className="space-y-1 text-xs text-green-800">
                    {uploadResult.created.map((c, i) => (
                      <li key={i}>
                        <span className="font-medium">{c.sheet}</span> — {c.moduleCount} modules · {c.lessonCount} lessons
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="text-xs font-semibold text-red-800 mb-2">
                  Errors ({uploadResult.errors.length})
                </div>
                {uploadResult.errors.length === 0 ? (
                  <div className="text-xs text-red-700/70">None.</div>
                ) : (
                  <ul className="space-y-1 text-xs text-red-800">
                    {uploadResult.errors.map((e, i) => (
                      <li key={i}>
                        <span className="font-medium">{e.sheet}</span>
                        {e.row ? ` (row ${e.row})` : ''}: {e.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={isUploading}>
              {uploadResult ? 'Close' : 'Cancel'}
            </Button>
            <Button color="primary" isLoading={isUploading} onClick={handleUpload} disabled={!uploadFile}>
              Upload
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete scheme" size="sm">
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Delete the scheme for{' '}
              <span className="font-medium text-gray-900">
                {deleteTarget.subject?.name || subjectName(deleteTarget.subjectId)} ·{' '}
                {deleteTarget.class?.name || className(deleteTarget.classId)}
              </span>
              ? This is blocked if any teacher has already logged a lesson against it.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button color="danger" isLoading={isDeleting} onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
