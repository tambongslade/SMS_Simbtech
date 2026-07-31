'use client';

import { useEffect } from 'react';

// Handles the Android hardware/gesture back button inside the Capacitor app.
// The native shell injects window.Capacitor into the remote site; without a
// backButton listener Capacitor closes the activity on every back press.
export default function CapacitorBackButton() {
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cap = (window as any).Capacitor;
        if (!cap?.isNativePlatform?.()) return;
        const appPlugin = cap.Plugins?.App;
        if (!appPlugin?.addListener) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let handle: any;
        (async () => {
            handle = await appPlugin.addListener('backButton', () => {
                const path = window.location.pathname;
                // At the app's entry points there is nothing to go back to —
                // background the app instead of closing it outright.
                const isRoot = path === '/' || /^\/dashboard\/[^/]+\/?$/.test(path);
                if (!isRoot && window.history.length > 1) {
                    window.history.back();
                } else if (appPlugin.minimizeApp) {
                    appPlugin.minimizeApp();
                } else {
                    appPlugin.exitApp?.();
                }
            });
        })();

        return () => { handle?.remove?.(); };
    }, []);

    return null;
}
