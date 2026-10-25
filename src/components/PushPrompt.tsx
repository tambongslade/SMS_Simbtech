'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BellAlertIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/components/context/LanguageContext';
import { getPushState } from '@/lib/push';

// Banner shown inside the mobile app, every time it is opened, while the signed-in
// user has not got notifications on. Tapping it opens Settings → Notifications
// and turns them on there (OS permission dialog; if the OS will no longer ask,
// the phone's settings open).
// The ✕ hides it until the app is brought back to the foreground.
// On the plain website, or when signed out, it renders nothing.
export default function PushPrompt() {
    const { t } = useLanguage();
    const [visible, setVisible] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
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

    const activate = () => {
        dismissed.current = true;
        setVisible(false);
        if (pathname === '/dashboard/settings') {
            window.dispatchEvent(new Event('push-enable-request'));
            return;
        }
        try { sessionStorage.setItem('pushEnableRequest', '1'); } catch { /* storage unavailable */ }
        router.push('/dashboard/settings');
    };

    return (
        <div
            className="fixed inset-x-0 top-0 z-[9000] px-3 pointer-events-none"
            style={{ paddingTop: 'max(env(safe-area-inset-top), 0.5rem)' }}
        >
            <style>{`
                @keyframes push-bell-ring {
                    0%, 40%, 100% { transform: rotate(0deg); }
                    4% { transform: rotate(16deg); }
                    8% { transform: rotate(-14deg); }
                    12% { transform: rotate(12deg); }
                    16% { transform: rotate(-10deg); }
                    20% { transform: rotate(7deg); }
                    24% { transform: rotate(-5deg); }
                    28% { transform: rotate(3deg); }
                    32% { transform: rotate(-1deg); }
                }
                .push-bell { transform-origin: 50% 12%; animation: push-bell-ring 3s ease-in-out infinite; }
                @media (prefers-reduced-motion: reduce) { .push-bell { animation: none; } }
            `}</style>
            <div className="pointer-events-auto mx-auto flex max-w-md items-stretch overflow-hidden rounded-xl bg-blue-700 text-white shadow-lg">
                <button
                    type="button"
                    onClick={activate}
                    className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left active:bg-blue-800"
                >
                    <BellAlertIcon className="push-bell h-7 w-7 shrink-0" />
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
