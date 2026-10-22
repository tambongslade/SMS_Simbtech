// Kept for callers written against the old helper. Every download goes through
// `saveFile` in ./download, which also knows how to hand the file to the native
// Android / iOS shells — a plain blob URL never saves inside their web views.

import { saveFile } from '@/lib/download';

/** Save a Blob as a file. Prefer `saveFile` from '@/lib/download' in new code. */
export function saveBlob(blob: Blob, filename: string): Promise<void> {
    return saveFile(blob, filename);
}

/**
 * Fetches a URL and saves the response body as a file. Throws on non-2xx.
 */
export async function fetchAndSave(input: RequestInfo | URL, init: RequestInit, filename: string): Promise<void> {
    const response = await fetch(input, init);
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(body || `Download failed (${response.status})`);
    }
    await saveFile(await response.blob(), filename);
}
