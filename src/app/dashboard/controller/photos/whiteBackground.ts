// Replaces the background of a student photo with pure white.
//
// Runs entirely in the browser with MediaPipe's selfie segmenter: the library, its WebAssembly files and
// the model are served from this site (public/mediapipe), so nothing is sent to an outside service and it
// works on the school network without internet. They are only downloaded the first time it is used.
//
// Some web views (the mobile app) hand the model an empty picture instead of the photo. The model then
// still answers, with a generic head-and-shoulders outline that has nothing to do with the student, and the
// result is a cut-out of the wall behind them. So every photo is checked: the model is also shown the photo
// moved sideways, and if the outline does not move with it, the model did not see the photo. Then other
// ways of handing over the picture are tried, and if none works the original photo is kept.

const BASE = '/mediapipe';

/** Long side of the copy the model looks at; the model itself works at 256 x 256. */
const MODEL_INPUT_SIZE = 512;
/** The photo is also shown moved right by this share of its width... */
const SHIFT = 0.2;
/** ...and the outline must follow it at least this far (a share of SHIFT), or the model did not see the photo. */
const MIN_FOLLOW = 0.35;

interface ConfidenceMask {
  width: number;
  height: number;
  getAsFloat32Array(): Float32Array;
  close(): void;
}

interface Segmenter {
  segment(image: unknown): { confidenceMasks?: ConfidenceMask[]; close?: () => void };
}

type Delegate = 'CPU' | 'GPU';
type InputKind = 'canvas' | 'imageData' | 'bitmap';
interface Way {
  delegate: Delegate;
  input: InputKind;
}

const WAYS: Way[] = [
  { delegate: 'CPU', input: 'canvas' },
  { delegate: 'CPU', input: 'imageData' },
  { delegate: 'CPU', input: 'bitmap' },
  { delegate: 'GPU', input: 'canvas' },
  { delegate: 'GPU', input: 'imageData' },
  { delegate: 'GPU', input: 'bitmap' },
];
/** The way that worked last on this device, tried first next time. */
let lastGoodWay: Way | null = null;

const describe = (err: unknown): string =>
  (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ').slice(0, 140);

let filesetPromise: Promise<{ mod: any; fileset: unknown }> | null = null;
const segmenters: Partial<Record<Delegate, Promise<Segmenter>>> = {};

function loadFileset() {
  if (!filesetPromise) {
    filesetPromise = (async () => {
      // A runtime import: the bundle is a plain file in /public, not something webpack should process.
      const bundleUrl = `${BASE}/vision_bundle.mjs`;
      const mod = await import(/* webpackIgnore: true */ bundleUrl);
      const fileset = await mod.FilesetResolver.forVisionTasks(`${BASE}/wasm`);
      return { mod, fileset };
    })().catch((err) => {
      filesetPromise = null; // let the next photo try again
      throw err;
    });
  }
  return filesetPromise;
}

function loadSegmenter(delegate: Delegate): Promise<Segmenter> {
  let p = segmenters[delegate];
  if (!p) {
    p = (async () => {
      const { mod, fileset } = await loadFileset();
      return (await mod.ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${BASE}/selfie_segmenter.tflite`, delegate },
        runningMode: 'IMAGE',
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      })) as Segmenter;
    })().catch((err) => {
      delete segmenters[delegate]; // let the next photo try again
      throw new Error(`model load (${delegate}): ${describe(err)}`);
    });
    segmenters[delegate] = p;
  }
  return p;
}

/** Start downloading the model while the camera is being set up, so the first photo is not slow. */
export function preloadWhiteBackground(): void {
  loadSegmenter(lastGoodWay?.delegate ?? 'CPU').catch(() => undefined);
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

interface Mask {
  data: Float32Array;
  width: number;
  height: number;
}

/** A fresh canvas (not 'willReadFrequently', which keeps it out of the GPU) for the model to look at. */
function modelCanvas(source: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  ctx.drawImage(source, 0, 0, w, h);
  return c;
}

async function asInput(canvas: HTMLCanvasElement, kind: InputKind): Promise<{ image: unknown; dispose: () => void }> {
  if (kind === 'canvas') return { image: canvas, dispose: () => undefined };
  if (kind === 'imageData') {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    return { image: ctx.getImageData(0, 0, canvas.width, canvas.height), dispose: () => undefined };
  }
  const bitmap = await createImageBitmap(canvas);
  return { image: bitmap, dispose: () => bitmap.close() };
}

async function runModel(segmenter: Segmenter, canvas: HTMLCanvasElement, kind: InputKind): Promise<Mask> {
  const input = await asInput(canvas, kind);
  try {
    let result: ReturnType<Segmenter['segment']>;
    try {
      result = segmenter.segment(input.image);
    } catch (err) {
      throw new Error(`segment: ${describe(err)}`);
    }
    try {
      const mask = result.confidenceMasks?.[0];
      if (!mask) throw new Error('The background could not be detected');
      // Copied: the model reuses its own memory on the next call.
      const data = new Float32Array(mask.getAsFloat32Array());
      if (data.length !== mask.width * mask.height) throw new Error('Unexpected mask size');
      return { data, width: mask.width, height: mask.height };
    } finally {
      result.confidenceMasks?.forEach((m) => m.close());
      result.close?.();
    }
  } finally {
    input.dispose();
  }
}

/** Horizontal centre of the person in the mask, as a share of the width (0 to 1); null if hardly anyone is there. */
function centreX(mask: Mask): number | null {
  let weight = 0;
  let sum = 0;
  for (let y = 0, i = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++, i++) {
      const c = mask.data[i];
      weight += c;
      sum += c * x;
    }
  }
  if (weight < mask.data.length * 0.02) return null;
  return sum / weight / mask.width;
}

/** The person's outline in the photo, by the first way of running the model that really sees the photo. */
async function findPerson(photo: HTMLCanvasElement): Promise<Mask> {
  const scale = Math.min(1, MODEL_INPUT_SIZE / Math.max(photo.width, photo.height));
  const w = Math.max(1, Math.round(photo.width * scale));
  const h = Math.max(1, Math.round(photo.height * scale));
  const small = modelCanvas(photo, w, h);
  // The same photo moved sideways: a model that really sees it moves the outline along with it.
  const offset = Math.round(w * SHIFT);
  const shifted = document.createElement('canvas');
  shifted.width = w;
  shifted.height = h;
  const sctx = shifted.getContext('2d');
  if (!sctx) throw new Error('Canvas is not available');
  sctx.fillStyle = '#808080';
  sctx.fillRect(0, 0, w, h);
  sctx.drawImage(small, offset, 0);

  const ways = lastGoodWay ? [lastGoodWay, ...WAYS.filter((x) => x !== lastGoodWay)] : WAYS;
  const failures: string[] = [];
  for (const way of ways) {
    try {
      const segmenter = await loadSegmenter(way.delegate);
      const person = await runModel(segmenter, small, way.input);
      const moved = await runModel(segmenter, shifted, way.input);
      const a = centreX(person);
      const b = centreX(moved);
      if (a === null || b === null) {
        failures.push(`${way.delegate}/${way.input}: no person in the photo`);
        continue;
      }
      // Measured as a share of the picture width; the person may be partly pushed out of the frame.
      if (b - a < SHIFT * MIN_FOLLOW) {
        failures.push(`${way.delegate}/${way.input}: the model did not see the photo`);
        continue;
      }
      lastGoodWay = way;
      return person;
    } catch (err) {
      failures.push(`${way.delegate}/${way.input}: ${describe(err)}`);
    }
  }
  console.error('Background removal: no way of running the model worked', failures);
  throw new Error(`the model could not see the photo on this device (${failures[0] ?? 'unknown'})`);
}

/**
 * Returns the same picture with everything except the person painted pure white (#FFFFFF).
 * Throws if it cannot be done; callers should fall back to the original photo.
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

    const mask = await findPerson(canvas);
    const conf = mask.data;
    const mw = mask.width;
    const mh = mask.height;

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = image.data;
    const sameSize = mw === canvas.width && mh === canvas.height;
    const w = canvas.width;
    const total = w * canvas.height;
    for (let i = 0, p = 0; i < total; i++, p += 4) {
      // A mask at another resolution is stretched over the picture (nearest neighbour).
      const c = sameSize ? conf[i] : conf[Math.floor(((i / w) | 0) * mh / canvas.height) * mw + Math.floor((i % w) * mw / w)];
      // Soft edge between 'surely background' (<0.35) and 'surely person' (>0.65).
      const a = smoothstep(0.35, 0.65, c);
      px[p] = px[p] * a + 255 * (1 - a);
      px[p + 1] = px[p + 1] * a + 255 * (1 - a);
      px[p + 2] = px[p + 2] * a + 255 * (1 - a);
      px[p + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the photo'))), 'image/jpeg', 0.9);
    });
  } finally {
    bitmap.close();
  }
}

/** Same as whitenBackground, but never fails: if it cannot be done the original photo comes back with ok=false and the reason. */
export async function whitenOrOriginal(photo: Blob): Promise<{ blob: Blob; ok: boolean; error?: string }> {
  try {
    return { blob: await whitenBackground(photo), ok: true };
  } catch (err) {
    console.error('Background removal failed', err);
    return { blob: photo, ok: false, error: describe(err) };
  }
}
