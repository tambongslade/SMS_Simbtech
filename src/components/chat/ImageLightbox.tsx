'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { saveFileFromUrl } from '@/lib/download';

export interface LightboxImage {
  url: string;
  name?: string;
}

/**
 * Full-screen image viewer that always opens fit-to-screen.
 *
 * Opening an attachment in a new tab hands the raw file to the browser, which
 * renders it at native resolution — a phone photo then lands zoomed into its
 * top-left corner. Here the image is always contained in the viewport first,
 * and 1:1 is something the reader opts into.
 */
export default function ImageLightbox({
  images,
  startIndex = 0,
  onClose,
}: {
  images: LightboxImage[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = images[index];
  const hasMany = images.length > 1;

  const go = useCallback(
    (delta: number) => {
      setZoomed(false);
      setIndex((i) => (i + delta + images.length) % images.length);
    },
    [images.length],
  );

  // A download attribute on an <a> is ignored by the mobile app's web view, so
  // the file is fetched and handed to the saver instead — which routes it
  // natively there and falls back to the ordinary anchor on the web.
  const download = useCallback(async () => {
    const image = images[index];
    if (!image || saving) return;

    setSaving(true);
    const toastId = toast.loading('Saving image...');
    try {
      await saveFileFromUrl(image.url, image.name || `image-${index + 1}.jpg`);
      toast.success('Image saved.', { id: toastId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save the image.';
      toast.error(message, { id: toastId });
    } finally {
      setSaving(false);
    }
  }, [images, index, saving]);

  // Keyboard: escape closes, arrows move between images in the message.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && images.length > 1) go(1);
      else if (e.key === 'ArrowLeft' && images.length > 1) go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, go, images.length]);

  // The viewer covers the app, so stop the page behind it from scrolling.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={current.name || 'Image'}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-2 text-white/90 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm truncate min-w-0">
          {current.name || 'Image'}
          {hasMany && (
            <span className="ml-2 text-white/50">
              {index + 1}/{images.length}
            </span>
          )}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setZoomed((z) => !z)}
            className="p-2 rounded-full hover:bg-white/10"
            aria-label={zoomed ? 'Fit to screen' : 'Zoom to full size'}
            title={zoomed ? 'Fit to screen' : 'Zoom to full size'}
          >
            {zoomed ? (
              <MagnifyingGlassMinusIcon className="h-6 w-6" />
            ) : (
              <MagnifyingGlassPlusIcon className="h-6 w-6" />
            )}
          </button>
          <button
            type="button"
            onClick={download}
            disabled={saving}
            className="p-2 rounded-full hover:bg-white/10 disabled:opacity-50"
            aria-label="Download image"
            title="Download"
          >
            <ArrowDownTrayIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div
        className={`flex-1 min-h-0 flex items-center justify-center ${zoomed ? 'overflow-auto' : 'overflow-hidden'}`}
        onClick={(e) => {
          // Tapping the backdrop closes; tapping the image toggles zoom.
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.name || 'Image'}
          onClick={(e) => {
            e.stopPropagation();
            setZoomed((z) => !z);
          }}
          className={
            zoomed
              ? 'max-w-none cursor-zoom-out'
              : 'max-w-full max-h-full w-auto h-auto object-contain cursor-zoom-in'
          }
        />
      </div>

      {hasMany && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60"
            aria-label="Previous image"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60"
            aria-label="Next image"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        </>
      )}
    </div>
  );
}
