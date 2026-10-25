'use client';

import { useEffect, useRef, useState } from 'react';
import { BellAlertIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/components/context/LanguageContext';
import { getPushState, openNotificationSettings, setPushEnabled } from '@/lib/push';

// Banner shown inside the mobile app, every time it is opened, while the signed-in
// user has not got notifications on. Tapping it turns them on (OS permission
// dialog first; if the OS will no longer ask, it opens the device settings).
// The ✕ hides it until the app is brought back to the foreground.
// On the plain website, or when signed out, it renders nothing.
export default function PushPrompt() {
    const { t } = useLanguage();
    const [visible, setVisible] = useState(false);
    const [busy, setBusy] = useState(false);
    const [canAsk, setCanAsk] = useState(true);
    const dismissed = useRef(false);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(window as any).Capacitor?.isNativePlatform?.()) return;

        let cancelled = false;
        const check = async () => {
            let signedIn = false;
            try { signedIn = !!localStorage.getItem('token'); } catch { /* unreadable storage */ }
            if (!signedIn || dismissed.current) { setVisible(false); return; }
            const state = await getPushState();
            if (cancelled) return;
            setCanAsk(state.canAsk);
            setVisible(state.supported && !state.optedIn);
        };

        check();
        // Sign-in happens inside the same page, so keep looking until it is on.
        const interval = setInterval(check, 4000);
        const onVisible = () => {
            if (document.hidden) return;
            dismissed.current = false; // coming back to the app counts as opening it
            check();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelled = true;
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    if (!visible) return null;

    const activate = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const state = canAsk ? await setPushEnabled(true) : await openNotificationSettings();
            setCanAsk(state.canAsk);
            if (state.optedIn) {
                setVisible(false);
                toast.success(t('Notifications on'));
            } else if (!state.canAsk) {
                toast.error(t('Notifications are turned off for this app on your device. Allow them in your phone settings.'));
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            className="fixed inset-x-0 top-0 z-[9000] px-3 pointer-events-none"
            style={{ paddingTop: 'max(env(safe-area-inset-top), 0.5rem)' }}
        >
            <div className="pointer-events-auto mx-auto flex max-w-md items-stretch overflow-hidden rounded-xl bg-blue-700 text-white shadow-lg">
                <button
                    type="button"
                    onClick={activate}
                    disabled={busy}
                    className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left active:bg-blue-800"
                >
                    <BellAlertIcon className="h-7 w-7 shrink-0" />
                    <span className="min-w-0">
                        <span className="block text-sm font-semibold leading-tight">
                            {t('Turn on notifications')}
                        </span>
                        <span className="block text-xs text-blue-100 leading-snug">
                            {canAsk
                                ? t('Tap here to get alerts about your school, even when the app is closed.')
                                : t('Tap here to open your phone settings and allow notifications.')}
                        </span>
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => { dismissed.current = true; setVisible(false); }}
                    aria-label={t('Dismiss')}
                    className="px-3 text-blue-200 active:bg-blue-800"
                >
                    <XMarkIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
