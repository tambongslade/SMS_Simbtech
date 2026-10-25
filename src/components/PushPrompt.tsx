'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BellAlertIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/components/context/LanguageContext';
import { getPushState } from '@/lib/push';

// Banner shown inside the mobile app, on every screen, for as long as the signed-in
// user has not got notifications on. Tapping it opens Settings → Notifications
// and turns them on there (OS permission dialog; if the OS will no longer ask,
// the phone's settings open).
// It has no dismiss button: it goes away only once notifications are on, and
// returns if they are later turned off (the state is re-read every few seconds).
// On the plain website, or when signed out, it renders nothing.
export default function PushPrompt() {
    const { t } = useLanguage();
    const [visible, setVisible] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const [canAsk, setCanAsk] = useState(true);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(window as any).Capacitor?.isNativePlatform?.()) return;

        let cancelled = false;
        const check = async () => {
            let signedIn = false;
            try { signedIn = !!localStorage.getItem('token'); } catch { /* unreadable storage */ }
            if (!signedIn) { setVisible(false); return; }
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
            check();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelled = true;
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    // The Settings page is where it gets turned on, so don't cover that page.
    if (!visible || pathname === '/dashboard/settings') return null;

    const activate = () => {
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
            </div>
        </div>
    );
}
