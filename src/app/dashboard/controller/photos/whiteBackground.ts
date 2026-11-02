// Replaces the background of a student photo with pure white.
//
// Runs entirely in the browser with MediaPipe's selfie segmenter: the library, its WebAssembly files and
// the model are served from this site (public/mediapipe), so nothing is sent to an outside service and it
// works on the school network without internet. They are only downloaded the first time it is used.

const BASE = '/mediapipe';

interface ConfidenceMask {
  width: number;
  height: number;
  getAsFloat32Array(): Float32Array;
  close(): void;
}

interface Segmenter {
  segment(image: CanvasImageSource): { confidenceMasks?: ConfidenceMask[]; close?: () => void };
}

let segmenterPromise: Promise<Segmenter> | null = null;

function loadSegmenter(): Promise<Segmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      // A runtime import: the bundle is a plain file in /public, not something webpack should process.
      const bundleUrl = `${BASE}/vision_bundle.mjs`;
      const mod = await import(/* webpackIgnore: true */ bundleUrl);
      const fileset = await mod.FilesetResolver.forVisionTasks(`${BASE}/wasm`);
      return (await mod.ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${BASE}/selfie_segmenter.tflite`, delegate: 'CPU' },
        runningMode: 'IMAGE',
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      })) as Segmenter;
    })().catch((err) => {
      segmenterPromise = null; // let the next photo try again
      throw err;
    });
  }
  return segmenterPromise;
}

/** Start downloading the model while the camera is being set up, so the first photo is not slow. */
export function preloadWhiteBackground(): void {
  loadSegmenter().catch(() => undefined);
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Returns the same picture with everything except the person painted pure white (#FFFFFF).
 * Throws if the segmentation model cannot be loaded; callers should fall back to the original photo.
 */
export async function whitenBackground(photo: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(photo);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas is not available');
    ctx.drawImage(bitmap, 0, 0);

    const segmenter = await loadSegmenter();
    const result = segmenter.segment(canvas);
    try {
      const mask = result.confidenceMasks?.[0];
      if (!mask) throw new Error('The background could not be detected');
      const conf = mask.getAsFloat32Array();
      if (mask.width !== canvas.width || mask.height !== canvas.height) {
        throw new Error('Unexpected mask size');
      }

      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const px = image.data;
      for (let i = 0, p = 0; i < conf.length; i++, p += 4) {
        // Soft edge between 'surely background' (<0.35) and 'surely person' (>0.65).
        const a = smoothstep(0.35, 0.65, conf[i]);
        px[p] = px[p] * a + 255 * (1 - a);
        px[p + 1] = px[p + 1] * a + 255 * (1 - a);
        px[p + 2] = px[p + 2] * a + 255 * (1 - a);
        px[p + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
    } finally {
      result.confidenceMasks?.forEach((m) => m.close());
      result.close?.();
    }

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the photo'))), 'image/jpeg', 0.9);
    });
  } finally {
    bitmap.close();
  }
}

/** Same as whitenBackground, but never fails: if it cannot be done the original photo comes back with ok=false. */
export async function whitenOrOriginal(photo: Blob): Promise<{ blob: Blob; ok: boolean }> {
  try {
    return { blob: await whitenBackground(photo), ok: true };
  } catch {
    return { blob: photo, ok: false };
  }
}
