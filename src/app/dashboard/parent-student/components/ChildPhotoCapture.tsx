'use client';

import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  CameraIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  ArrowPathIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { uploadChildPhoto } from '@/lib/parentPortalApi';
import { useLanguage } from '@/components/context/LanguageContext';

interface Props {
  isOpen: boolean;
  matricule: string;
  childName?: string;
  onClose: () => void;
  onUploaded?: (url: string) => void;
}

// Downscale a captured/uploaded image to ~1024px longest side so we don't
// upload phone-camera 12MP JPEGs. Preserves aspect ratio, encodes as JPEG.
async function resizeToJpeg(source: Blob, maxSide = 1024, quality = 0.9): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return source;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve) => {
    canvas.toBlob(b => resolve(b || source), 'image/jpeg', quality);
  });
}

export const ChildPhotoCapture: FC<Props> = ({ isOpen, matricule, childName, onClose, onUploaded }) => {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'camera' | 'file'>('camera');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pickedBlob, setPickedBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── camera lifecycle ────────────────────────────────────────────────────
  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    stopCamera();
    setCameraError(null);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (e: any) {
      setCameraError(e?.message || t('Camera not available.'));
    }
  }, [t]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    if (isOpen && tab === 'camera' && !previewUrl) startCamera(facingMode);
    return () => { if (!isOpen) stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tab, facingMode, previewUrl]);

  useEffect(() => () => stopCamera(), []);

  // Cleanup preview URL when replaced
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const resetPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPickedBlob(null);
  };

  const closeAll = () => {
    resetPreview();
    stopCamera();
    setCameraError(null);
    setUploading(false);
    onClose();
  };

  const capture = async () => {
    if (!videoRef.current || !cameraReady) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const small = await resizeToJpeg(blob);
      setPickedBlob(small);
      setPreviewUrl(URL.createObjectURL(small));
      stopCamera();
    }, 'image/jpeg', 0.92);
  };

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('Please choose an image file.'));
      return;
    }
    const small = await resizeToJpeg(file);
    setPickedBlob(small);
    setPreviewUrl(URL.createObjectURL(small));
  };

  const doUpload = async () => {
    if (!pickedBlob) return;
    setUploading(true);
    try {
      const res = await uploadChildPhoto(matricule, pickedBlob);
      toast.success(t('Photo updated.'));
      onUploaded?.(res.url);
      closeAll();
    } catch (e: any) {
      toast.error(e?.message || t('Upload failed.'));
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{t('Update photo')}</h3>
            {childName && <p className="text-xs text-slate-500">{childName}</p>}
          </div>
          <button
            onClick={closeAll}
            className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label={t('Close')}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {!previewUrl && (
          <div className="px-5 pt-4">
            <div className="inline-flex p-1 rounded-full bg-slate-100">
              <button
                onClick={() => { resetPreview(); setTab('camera'); }}
                className={`px-4 py-1.5 text-sm font-medium rounded-full inline-flex items-center gap-1.5 transition ${
                  tab === 'camera' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                <CameraIcon className="w-4 h-4" />
                {t('Camera')}
              </button>
              <button
                onClick={() => { resetPreview(); setTab('file'); stopCamera(); }}
                className={`px-4 py-1.5 text-sm font-medium rounded-full inline-flex items-center gap-1.5 transition ${
                  tab === 'file' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
                {t('Upload')}
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="p-5">
          {previewUrl ? (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden bg-slate-900 aspect-square flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
              </div>
              <p className="text-xs text-slate-500 text-center">
                {t('Looks good? Tap "Use photo" to save it, or retake.')}
              </p>
            </div>
          ) : tab === 'camera' ? (
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden bg-slate-900 aspect-square relative">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!cameraReady && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
                    {t('Starting camera…')}
                  </div>
                )}
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/90 text-sm px-4 text-center">
                    <p>{cameraError}</p>
                    <p className="text-xs text-white/60">{t('Try uploading a file instead.')}</p>
                  </div>
                )}
                {cameraReady && (
                  <button
                    onClick={() => setFacingMode(m => m === 'user' ? 'environment' : 'user')}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur text-white hover:bg-black/60 transition"
                    aria-label={t('Flip camera')}
                    title={t('Flip camera')}
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file?.type.startsWith('image/')) {
                  const small = await resizeToJpeg(file);
                  setPickedBlob(small);
                  setPreviewUrl(URL.createObjectURL(small));
                }
              }}
              className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 transition p-10 text-center cursor-pointer"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <ArrowUpTrayIcon className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-800">{t('Click to choose a photo')}</p>
              <p className="text-xs text-slate-500 mt-1">{t('or drag and drop it here')}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onFilePicked}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          {previewUrl ? (
            <>
              <button
                onClick={resetPreview}
                disabled={uploading}
                className="px-4 py-2.5 rounded-full text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
              >
                {t('Retake')}
              </button>
              <button
                onClick={doUpload}
                disabled={uploading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition"
              >
                {uploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('Uploading…')}
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    {t('Use photo')}
                  </>
                )}
              </button>
            </>
          ) : tab === 'camera' ? (
            <button
              onClick={capture}
              disabled={!cameraReady}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition"
            >
              <CameraIcon className="w-4 h-4" />
              {t('Take photo')}
            </button>
          ) : (
            <p className="text-xs text-slate-500 mx-auto">{t('PNG or JPEG · up to 5 MB')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChildPhotoCapture;
