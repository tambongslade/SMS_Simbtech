'use client';

import { useEffect } from 'react';

// Initializes OneSignal push notifications inside the Capacitor mobile app.
// The native shell injects the OneSignal Cordova plugin; on the plain website
// this component does nothing. Devices are identified with an external id
// (user-<id> for signed-in accounts, parent-<matricule> for portal parents)
// so the backend can target message notifications at specific people.

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getOneSignal = (): any => (window as any).plugins?.OneSignal;

const currentExternalId = (): string | null => {
    try {
        const token = localStorage.getItem('token');
        if (token) {
            const user = JSON.parse(localStorage.getItem('userData') || 'null');
            if (user?.id != null && user.id !== -1) return `user-${user.id}`;
        }
        const portal = JSON.parse(localStorage.getItem('parentPortal') || 'null');
        if (portal?.active) return `parent-${portal.active}`;
        if (portal?.matricules?.[0]) return `parent-${portal.matricules[0]}`;
    } catch { /* unreadable storage — stay anonymous */ }
    return null;
};

export default function OneSignalInit() {
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cap = (window as any).Capacitor;
        if (!cap?.isNativePlatform?.() || !APP_ID) return;

        let cancelled = false;
        let lastExternalId: string | null = null;

        const syncIdentity = () => {
            const OneSignal = getOneSignal();
            if (!OneSignal) return;
            const externalId = currentExternalId();
            if (externalId === lastExternalId) return;
            lastExternalId = externalId;
            try {
                if (externalId) OneSignal.login(externalId);
                else OneSignal.logout();
            } catch (e) { console.warn('OneSignal identity sync failed:', e); }
        };

        // The plugin may not be injected yet when React mounts — retry briefly.
        let attempts = 0;
        const init = () => {
            if (cancelled) return;
            const OneSignal = getOneSignal();
            if (!OneSignal) {
                if (attempts++ < 20) setTimeout(init, 500);
                return;
            }
            try {
                OneSignal.initialize(APP_ID);
                // Ask for permission (no-op if already granted/denied)
                OneSignal.Notifications.requestPermission(true);
                // Tapping a notification: follow the url in its data payload;
                // message notifications land on the chat.
                OneSignal.Notifications.addEventListener('click', (event: {
                    notification?: { additionalData?: { url?: string; type?: string } };
                }) => {
                    const data = event?.notification?.additionalData;
                    if (data?.url) {
                        window.location.href = data.url;
                    } else if (data?.type && /message|chat/i.test(data.type)) {
                        // Role-agnostic: every dashboard shows the chat indicator; the
                        // parent portal has a dedicated chat page.
                        const portal = localStorage.getItem('parentPortal');
                        window.location.href = portal
                            ? '/dashboard/parent-student/chat'
                            : '/dashboard';
                    }
                });
                syncIdentity();
            } catch (e) {
                console.warn('OneSignal init failed:', e);
            }
        };
        init();

        // Keep the device identity in step with login/logout
        const onStorage = () => syncIdentity();
        window.addEventListener('storage', onStorage);
        const interval = setInterval(syncIdentity, 30000);

        return () => {
            cancelled = true;
            window.removeEventListener('storage', onStorage);
            clearInterval(interval);
        };
    }, []);

    return null;
}
