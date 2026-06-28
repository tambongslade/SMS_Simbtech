'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker (public/sw.js) so the app is installable as a PWA.
 * Service workers only activate over HTTPS or on localhost — on a plain-HTTP LAN
 * address the registration is silently skipped by the browser, which is expected.
 *
 * The SW is registered in production only. In development it caches `/_next/static`
 * chunks cache-first, which serves stale JS/HTML after code changes (e.g. new
 * sidebar tabs not showing up, hydration mismatches). So in dev we instead
 * unregister any previously-installed worker and purge its caches.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // In development, tear down any SW a previous run installed so it can't
    // serve stale cached assets.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((reg) => reg.unregister()));
      if (typeof caches !== 'undefined') {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
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
