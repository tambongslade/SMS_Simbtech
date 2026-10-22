// Saving a file to the device.
//
// The web app runs in three containers, and only one of them can download a
// file the way the DOM says it should:
//
//   * A desktop or mobile browser, and Electron — clicking an <a download>
//     pointed at a blob: URL saves the file. This is what every export in the
//     app used to do inline.
//
//   * The Android WebView inside the Capacitor app — it has no download manager
//     of its own. The `download` attribute is ignored outright, and a blob: URL
//     is never reported to a DownloadListener, so the click silently does
//     nothing. That is the "downloads don't work on mobile" report.
//
//   * WKWebView inside the iOS app — same story: an anchor pointing at a blob:
//     URL neither saves nor opens anything.
//
// So the native apps expose their own handler and this module routes to it:
// MainActivity registers `window.SMSNativeDownloader` (a @JavascriptInterface)
// and AppDelegate registers the `smsDownload` WKScriptMessageHandler. Both take
// the file as base64, write it out natively (Android: the shared Downloads
// collection; iOS: the app's Documents folder plus a share sheet), and report
// back through `window.__smsNativeDownloadResult`.
//
// Call `saveFile` for every download in the app — it picks the right route and
// resolves once the file is actually on the device, so callers can toast.

type NativeResolver = (result: { ok: boolean; message?: string }) => void;

interface NativeDownloaderBridge {
    save(requestId: string, base64: string, filename: string, mimeType: string): void;
}

declare global {
    interface Window {
        SMSNativeDownloader?: NativeDownloaderBridge;
        __smsNativeDownloadResult?: (requestId: string, ok: boolean, message?: string) => void;
        webkit?: {
            messageHandlers?: Record<string, { postMessage: (message: unknown) => void }>;
        };
        Capacitor?: { isNativePlatform?: () => boolean };
    }
}

// The native side can take a while for a big report card batch: it has to
// decode the base64 and write it out. Give it plenty of room, but never leave
// the caller's toast spinning forever if the handler dies.
const NATIVE_TIMEOUT_MS = 120000;

const pendingNativeSaves = new Map<string, NativeResolver>();
let requestCounter = 0;

const nextRequestId = (): string => `dl_${++requestCounter}_${Date.now().toString(36)}`;

const MIME_BY_EXTENSION: Record<string, string> = {
    pdf: 'application/pdf',
    csv: 'text/csv',
    json: 'application/json',
    txt: 'text/plain',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    zip: 'application/zip',
};

export const guessMimeType = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase() ?? '';
    return MIME_BY_EXTENSION[extension] ?? 'application/octet-stream';
};

/** Strips the characters a file system (or MediaStore) would reject. */
export const safeFileName = (filename: string): string => {
    // Path separators and the Windows-reserved set only: spaces and hyphens
    // are fine, and callers already build readable names out of them.
    const cleaned = filename
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/[\u0000-\u001f]/g, '')
        .trim();
    return cleaned || 'download';
};

type NativePlatform = 'android' | 'ios';

const nativePlatform = (): NativePlatform | null => {
    if (typeof window === 'undefined') return null;
    if (typeof window.SMSNativeDownloader?.save === 'function') return 'android';
    if (window.webkit?.messageHandlers?.smsDownload) return 'ios';
    return null;
};

/** True inside the Capacitor Android/iOS shell, where downloads go native. */
export const isNativeApp = (): boolean => nativePlatform() !== null;

/**
 * Inside the mobile app but with no download handler — an installed build from
 * before the handler existed. The anchor fallback would fail silently there,
 * which is exactly the bug this module fixes, so say so instead.
 */
const isStaleAppShell = (): boolean =>
    nativePlatform() === null && window.Capacitor?.isNativePlatform?.() === true;

const installResultCallback = () => {
    if (typeof window === 'undefined' || window.__smsNativeDownloadResult) return;
    window.__smsNativeDownloadResult = (requestId, ok, message) => {
        const resolve = pendingNativeSaves.get(requestId);
        if (!resolve) return;
        pendingNativeSaves.delete(requestId);
        resolve({ ok, message });
    };
};

const toBlob = (data: Blob | ArrayBuffer | ArrayBufferView | string, mimeType: string): Blob => {
    if (data instanceof Blob) return data;
    if (typeof data === 'string') return new Blob([data], { type: mimeType });
    if (ArrayBuffer.isView(data)) {
        // Copy out of the view so the Blob never keeps a window over a larger
        // backing buffer.
        const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
        return new Blob([buffer], { type: mimeType });
    }
    return new Blob([data], { type: mimeType });
};

const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
        reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : '';
            // readAsDataURL gives "data:<mime>;base64,<payload>" — the native
            // side only wants the payload.
            const comma = result.indexOf(',');
            resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.readAsDataURL(blob);
    });

const saveViaNative = async (
    platform: NativePlatform,
    blob: Blob,
    filename: string,
    mimeType: string,
): Promise<void> => {
    installResultCallback();

    const base64 = await blobToBase64(blob);
    const requestId = nextRequestId();

    const result = await new Promise<{ ok: boolean; message?: string }>((resolve) => {
        const timeout = setTimeout(() => {
            pendingNativeSaves.delete(requestId);
            resolve({ ok: false, message: 'The app took too long to save the file.' });
        }, NATIVE_TIMEOUT_MS);

        pendingNativeSaves.set(requestId, (settled) => {
            clearTimeout(timeout);
            resolve(settled);
        });

        try {
            if (platform === 'android') {
                window.SMSNativeDownloader!.save(requestId, base64, filename, mimeType);
            } else {
                window.webkit!.messageHandlers!.smsDownload.postMessage({
                    requestId,
                    base64,
                    filename,
                    mimeType,
                });
            }
        } catch (err) {
            clearTimeout(timeout);
            pendingNativeSaves.delete(requestId);
            resolve({
                ok: false,
                message: err instanceof Error ? err.message : 'The app could not save the file.',
            });
        }
    });

    if (!result.ok) throw new Error(result.message || 'The app could not save the file.');
};

const saveViaBrowser = (blob: Blob, filename: string) => {
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Safari needs the URL to outlive the click, so revoke on the next tick.
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
};

/**
 * Saves `data` to the device as `filename`: natively when running inside the
 * mobile app, through an <a download> everywhere else.
 *
 * Rejects when the save fails, so callers can turn a loading toast into an
 * error rather than claiming a download that never happened.
 */
export async function saveFile(
    data: Blob | ArrayBuffer | ArrayBufferView | string,
    filename: string,
    mimeType?: string,
): Promise<void> {
    if (typeof window === 'undefined') {
        throw new Error('Downloads are only available in the browser.');
    }

    const name = safeFileName(filename);
    const type = mimeType || (data instanceof Blob && data.type) || guessMimeType(name);
    const blob = toBlob(data, type);

    const platform = nativePlatform();
    if (platform) {
        await saveViaNative(platform, blob, name, type);
        return;
    }

    if (isStaleAppShell()) {
        throw new Error('Please update the app from the store to download files.');
    }

    saveViaBrowser(blob, name);
}

/**
 * Fetches a URL and saves the response. Use this instead of `window.open` for
 * download links — a new tab pointed at a file is another thing the mobile web
 * views will not save.
 */
export async function saveFileFromUrl(
    url: string,
    filename: string,
    init?: RequestInit,
): Promise<void> {
    const response = await fetch(url, { credentials: 'include', ...init });
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    await saveFile(await response.blob(), filename);
}

export default saveFile;
