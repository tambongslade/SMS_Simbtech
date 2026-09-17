'use client';

import { useEffect } from 'react';

// Every `next build` on the VPS regenerates all /_next/static chunk hashes
// from scratch -- nothing preserves the previous build's files, so a tab
// that's been open since before the last redeploy is holding HTML that
// references chunk URLs which no longer exist on disk. The next lazy-loaded
// script or stylesheet from that page 404s (or gets served some non-JS/CSS
// fallback, which the browser then refuses on MIME-type grounds), and the
// user is stuck looking at a broken page/console full of red errors with no
// obvious way out other than knowing to hard-refresh.
//
// A plain reload fixes it -- it fetches the current HTML (network-first per
// sw.js's navigation strategy), which points at the chunks that actually
// exist -- so do that automatically the moment such a failure is detected,
// instead of leaving a broken page on screen.
//
// Resource load failures (script/link) don't bubble, so this has to listen
// on the capture phase at the window level; there is no single "chunk failed"
// event to hook otherwise.
const STORAGE_KEY = 'sm.chunkErrorReload.lastAt';
const MIN_INTERVAL_MS = 15_000; // guards against a reload loop if the server is genuinely down

function isStaticAssetFailure(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    const url =
        target instanceof HTMLScriptElement ? target.src :
            target instanceof HTMLLinkElement ? target.href :
                null;
    return !!url && url.includes('/_next/static/');
}

export default function ChunkErrorReload() {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResourceError = (event: Event) => {
            if (!isStaticAssetFailure(event.target)) return;
            reloadOnce();
        };

        // Dynamic import() failures (webpack ChunkLoadError) surface as an
        // unhandled rejection rather than a resource error event.
        const handleRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            const message = typeof reason === 'string' ? reason : reason?.message;
            const name = reason?.name;
            if (name === 'ChunkLoadError' || /loading chunk .* failed/i.test(String(message))) {
                reloadOnce();
            }
        };

        const reloadOnce = () => {
            let lastAt = 0;
            try {
                lastAt = Number(window.sessionStorage.getItem(STORAGE_KEY) || 0);
            } catch {
                // sessionStorage unavailable -- fall back to reloading without the
                // loop guard rather than not recovering at all.
            }
            if (Date.now() - lastAt < MIN_INTERVAL_MS) return; // already tried recently, don't loop
            try {
                window.sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
            } catch {
                /* ignore */
            }
            window.location.reload();
        };

        window.addEventListener('error', handleResourceError, true);
        window.addEventListener('unhandledrejection', handleRejection);
        return () => {
            window.removeEventListener('error', handleResourceError, true);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);

    return null;
}
