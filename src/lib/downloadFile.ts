// Mobile-safe blob download helper.
//
// The classic pattern (`<a download>` + click) fails on:
//   - iOS Safari (has never fully honored the `download` attribute)
//   - iOS PWA / Add-to-Home-Screen apps (attribute is silently ignored)
//   - Android PWAs (Chrome shows "File couldn't be downloaded")
//   - Any browser where the click happens after an `await`, because the
//     click loses its user-gesture context and the download manager rejects it
//
// On mobile / standalone, we open the blob URL in a new tab so the browser
// renders the PDF in its viewer (from which the user can save) or triggers
// a native download for CSV/XLSX. Popup blocked → fall back to same-tab
// navigation. Desktop keeps the fast `<a download>` path.

function needsMobileFallback(): boolean {
    if (typeof window === 'undefined') return false;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const iosStandalone = nav.standalone === true;
    const displayStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
    const isMobile = /Android|iPhone|iPad|iPod/.test(nav.userAgent);
    return iosStandalone || displayStandalone || isMobile;
}

/**
 * Save a Blob as a file, choosing the strategy that actually works on the
 * caller's device (desktop, mobile browser, or installed PWA).
 */
export function saveBlob(blob: Blob, filename: string): void {
    if (!(blob instanceof Blob)) {
        throw new Error('saveBlob: expected a Blob instance');
    }
    const url = window.URL.createObjectURL(blob);

    if (needsMobileFallback()) {
        // Try to open in a new tab first so the user can view/save from the
        // browser's own PDF viewer or download manager.
        const opened = window.open(url, '_blank');
        if (!opened) {
            // Popup blocked (common in PWAs) — same-tab navigation is the
            // reliable fallback. User can hit back afterwards.
            window.location.href = url;
        }
        // Keep the object URL alive long enough for the new tab to fetch it.
        setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
        return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Give the browser a beat before revoking; some engines race the revoke
    // against the download start and end up with an aborted download.
    setTimeout(() => window.URL.revokeObjectURL(url), 1_000);
}

/**
 * Convenience wrapper around `fetch` that saves the response body as a file
 * with the mobile-safe strategy. Throws on non-2xx.
 */
export async function fetchAndSave(input: RequestInfo | URL, init: RequestInit, filename: string): Promise<void> {
    const response = await fetch(input, init);
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(body || `Download failed (${response.status})`);
    }
    const blob = await response.blob();
    saveBlob(blob, filename);
}
