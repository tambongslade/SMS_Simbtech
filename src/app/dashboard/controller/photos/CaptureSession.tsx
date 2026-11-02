'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  CameraIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronLeftIcon,
  ForwardIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/components/context/LanguageContext';
import { fileToJpeg, saveStudentPhoto, videoFrameToJpeg } from './imageUtils';
import { preloadWhiteBackground, whitenOrOriginal } from './whiteBackground';

export interface PhotoStudent {
  id: number;
  name: string;
  matricule?: string;
  photo?: string | null;
}

interface Props {
  queue: PhotoStudent[];
  startIndex: number;
  academicYearId: number;
  whiteBackground: boolean;
  onWhiteBackgroundChange: (on: boolean) => void;
  onSaved: (studentId: number, filename: string) => void;
  onClose: () => void;
}

interface Captured {
  blob: Blob;
  url: string;
}

type Facing = 'user' | 'environment';

// One student at a time: take the picture, confirm it, and the next student comes up by itself.
export default function CaptureSession({
  queue,
  startIndex,
  academicYearId,
  whiteBackground,
  onWhiteBackgroundChange,
  onSaved,
  onClose,
}: Props) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(startIndex);
  const [captured, setCaptured] = useState<Captured | null>(null);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [facing, setFacing] = useState<Facing>('environment');
  const [live, setLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // getUserMedia only exists on https/localhost. On the school LAN (plain http) the page falls back to the
  // phone's own camera app through <input capture>, which has the same confirm-then-next flow.
  const canLive =
    typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;

  const student: PhotoStudent | undefined = queue[index];
  const finished = index >= queue.length;

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setLive(false);
  }, []);

  useEffect(() => {
    if (!canLive || finished) return;
    let cancelled = false;
    setLiveError(null);
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play().catch(() => undefined);
        }
        setLive(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : '';
        setLiveError(
          name === 'NotAllowedError'
            ? t('Camera access was blocked. Allow the camera for this site, then try again.')
            : t('The camera could not be started on this device.'),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [canLive, facing, finished, t]);

  useEffect(() => stopStream, [stopStream]);

  useEffect(() => {
    if (finished) stopStream();
  }, [finished, stopStream]);

  // Free the preview URL of whatever was captured before.
  useEffect(() => {
    return () => {
      if (captured) URL.revokeObjectURL(captured.url);
    };
  }, [captured]);

  // Download the segmentation model while the first student is being lined up.
  useEffect(() => {
    if (whiteBackground) preloadWhiteBackground();
  }, [whiteBackground]);

  const keep = async (blob: Blob) => {
    let photo = blob;
    if (whiteBackground) {
      setProcessing(true);
      const result = await whitenOrOriginal(blob);
      setProcessing(false);
      photo = result.blob;
      if (!result.ok) toast.error(`${t('The background could not be removed, the original photo is kept.')} (${result.error})`, { duration: 8000 });
    }
    setCaptured({ blob: photo, url: URL.createObjectURL(photo) });
  };

  const takeLive = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    try {
      await keep(await videoFrameToJpeg(video));
    } catch {
      toast.error(t('Could not capture the photo. Try again.'));
    }
  };

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await keep(await fileToJpeg(file));
    } catch {
      toast.error(t('That picture could not be read. Try again.'));
    }
  };

  const goTo = (next: number) => {
    setCaptured(null);
    setIndex(next);
  };

  const confirm = async () => {
    if (!captured || !student || saving) return;
    setSaving(true);
    try {
      const filename = await saveStudentPhoto(student.id, captured.blob, academicYearId);
      onSaved(student.id, filename);
      setSavedCount((n) => n + 1);
      goTo(index + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('The photo could not be saved. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
      <div className="min-w-0">
        <p className="text-xs text-gray-500">
          {finished
            ? t('Finished')
            : `${t('Student')} ${index + 1} ${t('of')} ${queue.length}`}
        </p>
        {student && !finished && (
          <h2 className="text-lg font-bold text-gray-900 truncate">{student.name}</h2>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
        aria-label={t('Close')}
      >
        <XMarkIcon className="w-6 h-6" />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
      {header}

      {finished ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <CheckCircleIcon className="w-16 h-16 text-green-600" />
          <h3 className="text-xl font-bold text-gray-900">{t('All done')}</h3>
          <p className="text-gray-600">
            {savedCount} {t('photos saved')}
          </p>
          <div className="flex gap-2 mt-2">
            {queue.length > 0 && (
              <button
                type="button"
                onClick={() => goTo(Math.max(queue.length - 1, 0))}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium"
              >
                {t('Back to last student')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium"
            >
              {t('Close')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-md mx-auto p-4 space-y-4">
            <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden shadow">
              {/* The video stays mounted so the camera is not restarted for every student. */}
              <video
                ref={videoRef}
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${
                  captured || !canLive ? 'hidden' : ''
                } ${facing === 'user' ? '-scale-x-100' : ''}`}
              />
              {captured && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={captured.url} alt={student?.name ?? ''} className="absolute inset-0 w-full h-full object-cover" />
              )}
              {!captured && !canLive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
                  <CameraIcon className="w-14 h-14 opacity-80" />
                  <p className="text-sm opacity-90">
                    {t('Tap the button below to open the camera and take the picture.')}
                  </p>
                </div>
              )}
              {processing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-6 text-center text-white text-sm font-medium">
                  {t('Removing the background…')}
                </div>
              )}
              {!captured && canLive && !live && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white text-sm">
                  {liveError ?? t('Starting the camera…')}
                </div>
              )}
            </div>

            <label className="flex items-center justify-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={whiteBackground}
                disabled={processing || saving}
                onChange={(e) => onWhiteBackgroundChange(e.target.checked)}
              />
              {t('White background')}
            </label>

            {captured ? (
              <div className="space-y-2">
                <p className="text-center text-sm text-gray-700">{t('Is this photo OK?')}</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setCaptured(null)}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-300 bg-white text-gray-800 font-semibold disabled:opacity-50"
                  >
                    <ArrowPathIcon className="w-5 h-5" />
                    {t('Retake')}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={confirm}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50"
                  >
                    <CheckIcon className="w-5 h-5" />
                    {saving ? t('Saving…') : t('OK, next student')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {canLive ? (
                  <button
                    type="button"
                    disabled={!live || processing}
                    onClick={takeLive}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-blue-600 text-white text-lg font-semibold disabled:opacity-50"
                  >
                    <CameraIcon className="w-6 h-6" />
                    {t('Take photo')}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-blue-600 text-white text-lg font-semibold"
                    >
                      <CameraIcon className="w-6 h-6" />
                      {t('Open camera')}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      capture={facing}
                      onChange={onFilePicked}
                      className="hidden"
                    />
                  </>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => goTo(index - 1)}
                    className="flex items-center justify-center gap-1 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium disabled:opacity-40"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                    {t('Previous')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
                    className="flex items-center justify-center gap-1 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium"
                  >
                    <ArrowsRightLeftIcon className="w-4 h-4" />
                    {t('Flip camera')}
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo(index + 1)}
                    className="flex items-center justify-center gap-1 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium"
                  >
                    {t('Skip')}
                    <ForwardIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
