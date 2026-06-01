'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker (public/sw.js) so the app is installable as a PWA.
 * Service workers only activate over HTTPS or on localhost — on a plain-HTTP LAN
 * address the registration is silently skipped by the browser, which is expected.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          // Non-fatal: app still works without offline support.
          console.warn('Service worker registration failed:', err);
        });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
