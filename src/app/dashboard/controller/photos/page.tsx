'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowUpTrayIcon, CameraIcon, CheckCircleIcon, TrashIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { useLanguage } from '@/components/context/LanguageContext';
import { getPhotoUrl } from '@/lib/photoService';
import {
  fetchStudents,
  fetchSubClasses,
  type SecretaryStudent,
  type SubClassInfo,
} from '@/app/dashboard/secretary/lib/secretaryApi';
import CaptureSession, { type PhotoStudent } from './CaptureSession';
import { deleteStudentPhoto, fileToJpeg, saveStudentPhoto } from './imageUtils';
import { whitenOrOriginal } from './whiteBackground';

const WHITE_BG_KEY = 'controllerPhotosWhiteBackground';

interface ClassStudent extends PhotoStudent {
  /** Bumped after a new photo is saved so the browser does not show the cached old one. */
  version: number;
}

const toClassStudent = (s: SecretaryStudent): ClassStudent => ({
  id: s.id,
  name: s.name,
  matricule: s.matricule,
  photo: s.photo ?? null,
  version: 0,
});

export default function ControllerPhotosPage() {
  const { selectedAcademicYear } = useAuth();
  const { t } = useLanguage();
  const academicYearId = selectedAcademicYear?.id;

  const [subClasses, setSubClasses] = useState<SubClassInfo[]>([]);
  const [subClassId, setSubClassId] = useState('');
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [retakeAll, setRetakeAll] = useState(false);
  const [whiteBackground, setWhiteBackgroundState] = useState(true);
  const [uploading, setUploading] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState<Set<number>>(new Set());
  // Photos whose file could not be loaded (e.g. saved on the other server): show the placeholder, not a broken image.
  const [brokenKeys, setBrokenKeys] = useState<Set<string>>(new Set());
  const [session, setSession] = useState<{ queue: ClassStudent[]; startIndex: number } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<number | null>(null);

  // Remembered per device; on unless the Controller turned it off.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(WHITE_BG_KEY) === 'off') setWhiteBackgroundState(false);
    } catch {
      /* storage unavailable: keep the default */
    }
  }, []);

  const setWhiteBackground = useCallback((on: boolean) => {
    setWhiteBackgroundState(on);
    try {
      window.localStorage.setItem(WHITE_BG_KEY, on ? 'on' : 'off');
    } catch {
      /* storage unavailable: applies to this visit only */
    }
  }, []);

  useEffect(() => {
    fetchSubClasses().then(setSubClasses).catch(() => toast.error(t('Could not load the classes')));
  }, [t]);

  const loadStudents = useCallback(async () => {
    if (!subClassId || !academicYearId) {
      setStudents([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchStudents({ academicYearId, subClassId, page: 1, limit: 500 });
      setStudents(
        (res.data || [])
          .filter((s) => String(s.status ?? '').toUpperCase() !== 'WITHDRAWN')
          .map(toClassStudent)
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch {
      setStudents([]);
      toast.error(t('Could not load the students'));
    } finally {
      setLoading(false);
    }
  }, [subClassId, academicYearId, t]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const withPhoto = students.filter((s) => s.photo).length;
  const visible = useMemo(() => (onlyMissing ? students.filter((s) => !s.photo) : students), [students, onlyMissing]);

  const markSaved = useCallback((studentId: number, filename: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, photo: filename, version: s.version + 1 } : s)),
    );
  }, []);

  const removePhoto = async (student: ClassStudent) => {
    if (!academicYearId || !student.photo) return;
    if (!window.confirm(`${t('Delete the photo of')} ${student.name}?`)) return;
    setDeleting((prev) => new Set(prev).add(student.id));
    try {
      await deleteStudentPhoto(student.id, academicYearId);
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, photo: null, version: s.version + 1 } : s)),
      );
      toast.success(t('Photo deleted'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('The photo could not be deleted. Try again.'));
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(student.id);
        return next;
      });
    }
  };

  const startSession = (fromStudentId?: number) => {
    if (fromStudentId !== undefined) {
      // Started from one student's card: walk the whole class from there.
      const startIndex = students.findIndex((s) => s.id === fromStudentId);
      setSession({ queue: students, startIndex: Math.max(startIndex, 0) });
      return;
    }
    const queue = retakeAll ? students : students.filter((s) => !s.photo);
    if (queue.length === 0) {
      toast.success(t('Every student in this class already has a photo.'));
      return;
    }
    setSession({ queue, startIndex: 0 });
  };

  const pickFileFor = (studentId: number) => {
    uploadTarget.current = studentId;
    fileRef.current?.click();
  };

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const studentId = uploadTarget.current;
    e.target.value = '';
    uploadTarget.current = null;
    if (!file || studentId === null || !academicYearId) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('Please choose a picture (JPG or PNG).'));
      return;
    }
    setUploading((prev) => new Set(prev).add(studentId));
    try {
      let blob = await fileToJpeg(file);
      if (whiteBackground) {
        const result = await whitenOrOriginal(blob);
        blob = result.blob;
        if (!result.ok) toast.error(t('The background could not be removed, the original photo is kept.'));
      }
      const filename = await saveStudentPhoto(studentId, blob, academicYearId);
      markSaved(studentId, filename);
      toast.success(t('Photo saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('The photo could not be saved. Try again.'));
    } finally {
      setUploading((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('Student Photos')}</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          {t('Pick a class, then upload each student’s picture or take the pictures one after the other.')}
        </p>
      </div>

      {!academicYearId ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          {t('Select an academic year first.')}
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <label className="flex-1 block">
              <span className="block text-sm font-medium text-gray-700 mb-1">{t('Class')}</span>
              <select
                value={subClassId}
                onChange={(e) => setSubClassId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('Select a class')}</option>
                {subClasses.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!subClassId || loading || students.length === 0}
              onClick={() => startSession()}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
            >
              <CameraIcon className="w-5 h-5" />
              {t('Take photos')}
            </button>
          </div>

          {subClassId && students.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-700">
              <span className="font-medium">
                {withPhoto} / {students.length} {t('have a photo')}
              </span>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
                {t('Show only students without a photo')}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={whiteBackground} onChange={(e) => setWhiteBackground(e.target.checked)} />
                {t('White background')}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={retakeAll} onChange={(e) => setRetakeAll(e.target.checked)} />
                {t('Also retake students who already have a photo')}
              </label>
            </div>
          )}
        </div>
      )}

      {subClassId && loading && <p className="text-sm text-gray-500">{t('Loading…')}</p>}
      {subClassId && !loading && students.length === 0 && (
        <p className="text-sm text-gray-500">{t('No students in this class.')}</p>
      )}

      <input ref={fileRef} type="file" accept="image/*" onChange={onFilePicked} className="hidden" />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {visible.map((s) => {
          const busy = uploading.has(s.id) || deleting.has(s.id);
          return (
            <div key={s.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
              <div className="relative aspect-square bg-gray-100">
                {s.photo && !brokenKeys.has(`${s.id}:${s.photo}:${s.version}`) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${getPhotoUrl(s.photo)}${s.version ? `?v=${s.version}` : ''}`}
                    alt={s.name}
                    loading="lazy"
                    onError={() => setBrokenKeys((prev) => new Set(prev).add(`${s.id}:${s.photo}:${s.version}`))}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                    <UserCircleIcon className="w-20 h-20" />
                  </div>
                )}
                {s.photo && (
                  <CheckCircleIcon className="absolute top-1.5 right-1.5 w-6 h-6 text-green-600 bg-white rounded-full" />
                )}
                {busy && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-sm font-medium text-gray-700">
                    {deleting.has(s.id) ? t('Deleting…') : t('Saving…')}
                  </div>
                )}
              </div>
              <div className="p-2 flex-1 flex flex-col gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{s.name}</p>
                  {s.matricule && <p className="text-xs text-gray-500 truncate">{s.matricule}</p>}
                </div>
                <div className="mt-auto grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => pickFileFor(s.id)}
                    className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ArrowUpTrayIcon className="w-4 h-4" />
                    {t('Upload')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => startSession(s.id)}
                    className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-blue-50 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  >
                    <CameraIcon className="w-4 h-4" />
                    {t('Camera')}
                  </button>
                  {s.photo && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removePhoto(s)}
                      className="col-span-2 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <TrashIcon className="w-4 h-4" />
                      {t('Delete photo')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {session && academicYearId && (
        <CaptureSession
          queue={session.queue}
          startIndex={session.startIndex}
          academicYearId={academicYearId}
          whiteBackground={whiteBackground}
          onWhiteBackgroundChange={setWhiteBackground}
          onSaved={markSaved}
          onClose={() => setSession(null)}
        />
      )}

    </div>
  );
}
