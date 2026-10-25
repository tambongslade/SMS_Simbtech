'use client';

import { useEffect } from 'react';

// Handles the Android hardware/gesture back button inside the Capacitor app.
// The native shell injects window.Capacitor into the remote site; without a
// backButton listener Capacitor closes the activity on every back press.
// Pages under /dashboard that belong to every role rather than being one role's
// home, so they must not be mistaken for an entry point.
const SHARED_PAGES = new Set(['settings', 'leave-and-loans', 'marks-management', 'file-management']);

// The signed-in user's menu (home) page, from the role saved at login.
const homePath = (): string => {
    try {
        if (!localStorage.getItem('token') && localStorage.getItem('parentPortal')) return '/dashboard/parent-student';
        const role = localStorage.getItem('userRole');
        if (role) {
            const slug = role === 'STUDENT' || role === 'PARENT'
                ? 'parent-student'
                : role.toLowerCase().replace(/_/g, '-');
            return `/dashboard/${slug}`;
        }
    } catch { /* unreadable storage */ }
    return '/dashboard';
};

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
                const shared = path.match(/^\/dashboard\/([^/]+)\/?$/);
                const sharedPage = !!shared && SHARED_PAGES.has(shared[1]);
                const isRoot = path === '/' || path === '/dashboard' || (!!shared && !sharedPage);
                if (sharedPage) {
                    // Settings and the other shared pages go back to the user's menu page.
                    window.location.href = homePath();
                } else if (!isRoot && window.history.length > 1) {
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
