'use client';

// A single honest line about what is and is not saved to the server.
//
// It only appears when there is something to say: offline, or work still
// waiting to upload, or a write the server refused. When everything is synced
// it renders nothing at all.

import { useState } from 'react';
import {
    ArrowPathIcon,
    CloudArrowUpIcon,
    ExclamationTriangleIcon,
    SignalSlashIcon,
} from '@heroicons/react/24/outline';
import { useOffline } from './OfflineProvider';
import PendingSyncPanel from './PendingSyncPanel';

export default function OfflineBanner() {
    const { online, syncing, pending, failed } = useOffline();
    const [panelOpen, setPanelOpen] = useState(false);

    const showBanner = !online || pending > 0 || failed > 0;
    if (!showBanner) return null;

    // Failures first: an item the server refused is the only state that needs
    // a decision from a person.
    const tone = failed > 0 ? 'failed' : !online ? 'offline' : 'pending';

    const styles = {
        offline: 'bg-slate-800 text-slate-100',
        pending: 'bg-blue-700 text-blue-50',
        failed: 'bg-amber-600 text-amber-50',
    }[tone];

    const Icon = tone === 'failed' ? ExclamationTriangleIcon : tone === 'offline' ? SignalSlashIcon : CloudArrowUpIcon;

    const message = (() => {
        if (failed > 0) {
            return `${failed} ${failed === 1 ? 'entry needs' : 'entries need'} your attention`;
        }
        if (!online) {
            return pending > 0
                ? `Offline — ${pending} ${pending === 1 ? 'entry' : 'entries'} saved on this device`
                : 'Offline — your work is being saved on this device';
        }
        return syncing
            ? `Uploading ${pending} ${pending === 1 ? 'entry' : 'entries'}…`
            : `${pending} ${pending === 1 ? 'entry' : 'entries'} waiting to upload`;
    })();

    return (
        <>
            <div className={`w-full px-4 py-2 text-sm ${styles}`} role="status" aria-live="polite">
                <div className="mx-auto flex max-w-7xl items-center gap-2">
                    {syncing ? (
                        <ArrowPathIcon className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                    ) : (
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{message}</span>
                    {(pending > 0 || failed > 0) && (
                        <button
                            type="button"
                            onClick={() => setPanelOpen(true)}
                            className="shrink-0 rounded px-2 py-0.5 text-xs font-medium underline underline-offset-2 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        >
                            Details
                        </button>
                    )}
                </div>
            </div>
            {panelOpen && <PendingSyncPanel onClose={() => setPanelOpen(false)} />}
        </>
    );
}

/** Compact variant for a header or nav bar, where the full banner is too much. */
export function OfflineIndicator() {
    const { online, syncing, pending, failed } = useOffline();
    if (online && pending === 0 && failed === 0) return null;

    const label = failed > 0 ? `${failed} failed` : !online ? 'Offline' : `${pending} pending`;
    const tone = failed > 0 ? 'bg-amber-100 text-amber-800' : !online ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-800';

    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
            {syncing && <ArrowPathIcon className="h-3 w-3 animate-spin" aria-hidden="true" />}
            {label}
        </span>
    );
}
