'use client';

import { useEffect, useState } from 'react';

// Initializes OneSignal push notifications inside the Capacitor mobile app.
// The native shell injects the OneSignal Cordova plugin; on the plain website
// this component does nothing.
//
// The external id MUST be the bare user id as a string ("42"), because the
// backend targets pushes with external_id = String(user.id). Any other format
// makes every send fail with "All included players are not subscribed".
//
// Parent-portal sessions are matricule-based and have no real user id (the
// synthetic user is id -1, see AuthContext.loginParent), so they register the
// alias below but the backend cannot target them until it grows matricule
// support.

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getOneSignal = (): any => (window as any).plugins?.OneSignal;

const currentExternalId = (): string | null => {
    try {
        const token = localStorage.getItem('token');
        if (token) {
            const user = JSON.parse(localStorage.getItem('userData') || 'null');
            // Bare id — this is what the backend targets.
            if (user?.id != null && user.id !== -1) return String(user.id);
        }
        const portal = JSON.parse(localStorage.getItem('parentPortal') || 'null');
        if (portal?.active) return `parent-${portal.active}`;
        if (portal?.matricules?.[0]) return `parent-${portal.matricules[0]}`;
    } catch { /* unreadable storage — stay anonymous */ }
    return null;
};

interface PriorityAlert {
    title: string;
    body: string;
    actionUrl?: string;
}

export default function OneSignalInit() {
    const [alert, setAlert] = useState<PriorityAlert | null>(null);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cap = (window as any).Capacitor;
        if (!cap?.isNativePlatform?.()) return;
        if (!APP_ID) {
            // NEXT_PUBLIC_* values are baked in at build time, so a server whose
            // .env lacks this one produces a bundle where push silently never
            // starts — no registration, no notifications, no error. Say so.
            console.error(
                'OneSignal disabled: NEXT_PUBLIC_ONESIGNAL_APP_ID was missing when this ' +
                'bundle was built. Add it to .env on the server and rebuild.',
            );
            return;
        }

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

        // Permission is deliberately NOT requested here. The OS shows that dialog
        // once per install on iOS and twice on Android; spending it seconds after
        // login, before the user has been told what we send, means one reflexive
        // "Don't allow" locks the app out of notifications for good — recoverable
        // only through device settings. Settings → Notifications asks instead,
        // where the user has just chosen to turn them on. See lib/push.ts.

        // The plugin may not be injected yet when React mounts — retry briefly.
        let attempts = 0;
        const init = () => {
            if (cancelled) return;
            const OneSignal = getOneSignal();
            if (!OneSignal) {
                if (attempts++ < 20) { setTimeout(init, 500); return; }
                // Ten seconds without the plugin means the Cordova bridge was
                // never injected into this page — the usual cause is loading the
                // app from a remote server.url. Push cannot work at all here.
                console.error(
                    'OneSignal disabled: window.plugins.OneSignal never appeared after 10s. ' +
                    'The Cordova plugin bridge is not present in this WebView.',
                );
                return;
            }
            try {
                OneSignal.initialize(APP_ID);
                // Permission is requested from syncIdentity, once a user is known.
                // Tapping a notification follows the backend's payload contract:
                // actionUrl wins, then entityType/entityId, then the chat fallback.
                OneSignal.Notifications.addEventListener('click', (event: {
                    notification?: {
                        additionalData?: {
                            actionUrl?: string;
                            entityType?: string;
                            entityId?: number;
                            category?: string;
                            notificationId?: number;
                            url?: string;
                            type?: string;
                        };
                    };
                }) => {
                    const data = event?.notification?.additionalData;
                    const actionUrl = data?.actionUrl ?? data?.url;
                    if (actionUrl) {
                        window.location.href = actionUrl;
                    } else if (data?.entityType && data?.entityId != null) {
                        window.location.href = `/${data.entityType.toLowerCase()}/${data.entityId}`;
                    } else if (data?.type && /message|chat/i.test(data.type)) {
                        // Role-agnostic: every dashboard shows the chat indicator; the
                        // parent portal has a dedicated chat page.
                        const portal = localStorage.getItem('parentPortal');
                        window.location.href = portal
                            ? '/dashboard/parent-student/chat'
                            : '/dashboard';
                    }
                });

                // High-priority pushes that land while the app is open. Android
                // would otherwise slide them quietly into the shade, which is
                // exactly what "urgent" must not do — so suppress the system
                // notification and show a blocking modal instead. `popup` is set
                // by the backend only for HIGH/URGENT.
                OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: {
                    preventDefault?: () => void;
                    notification?: {
                        title?: string;
                        body?: string;
                        additionalData?: {
                            actionUrl?: string;
                            notificationId?: number;
                            popup?: boolean;
                            priority?: string;
                        };
                    };
                }) => {
                    const data = event?.notification?.additionalData;
                    const urgent = data?.popup === true
                        || data?.priority === 'HIGH'
                        || data?.priority === 'URGENT';
                    if (!urgent) return;
                    event.preventDefault?.();
                    setAlert({
                        title: event.notification?.title ?? 'Urgent notification',
                        body: event.notification?.body ?? '',
                        actionUrl: data?.actionUrl,
                    });
                });

                syncIdentity();
            } catch (e) {
                console.warn('OneSignal init failed:', e);
            }
        };
        init();

        // Keep the device identity in step with login/logout. The storage event
        // only fires in *other* documents, so in the single-page webview this
        // poll is what actually notices a login — keep it short enough that the
        // permission prompt still feels like part of signing in.
        const onStorage = () => syncIdentity();
        window.addEventListener('storage', onStorage);
        const interval = setInterval(syncIdentity, 3000);

        return () => {
            cancelled = true;
            window.removeEventListener('storage', onStorage);
            clearInterval(interval);
        };
    }, []);

    if (!alert) return null;

    return (
        <div
            role="alertdialog"
            aria-modal="true"
            aria-label={alert.title}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
        >
            <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
                <div className="flex items-start gap-3 p-5">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-lg">
                        &#9888;
                    </span>
                    <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{alert.title}</p>
                        {alert.body && (
                            <p className="mt-1 text-sm text-gray-600">{alert.body}</p>
                        )}
                    </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
                    <button
                        type="button"
                        onClick={() => setAlert(null)}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                        Dismiss
                    </button>
                    {alert.actionUrl && (
                        <button
                            type="button"
                            onClick={() => {
                                const url = alert.actionUrl!;
                                setAlert(null);
                                window.location.href = url;
                            }}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            View
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
