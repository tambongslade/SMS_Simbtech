'use client';

// The list of everything not yet on the server.
//
// The rule this screen exists to honour: nothing is ever discarded silently. A
// write the server refused stays here, named, until a person decides what to do
// with it.

import { ArrowPathIcon, ClockIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useOffline } from './OfflineProvider';
import type { QueuedMutation } from '@/lib/offline/queue';

const relativeTime = (iso: string): string => {
    const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (!Number.isFinite(seconds)) return '';
    if (seconds < 60) return 'just now';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    const days = Math.round(hours / 24);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
};

function MutationRow({ mutation }: { mutation: QueuedMutation }) {
    const { retry, discard, online } = useOffline();
    const isFailed = mutation.status === 'failed';

    return (
        <li className="flex items-start gap-3 border-b border-gray-100 py-3 last:border-b-0">
            <span className="mt-0.5 shrink-0">
                {isFailed ? (
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" aria-hidden="true" />
                ) : (
                    <ClockIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                )}
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{mutation.label}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                    Entered {relativeTime(mutation.createdAt)}
                    {mutation.attempts > 0 && ` · ${mutation.attempts} ${mutation.attempts === 1 ? 'try' : 'tries'}`}
                </p>
                {isFailed && mutation.lastError && (
                    <p className="mt-1 text-xs text-amber-700">{mutation.lastError.message}</p>
                )}
            </div>
            {isFailed && (
                <div className="flex shrink-0 gap-1">
                    <button
                        type="button"
                        onClick={() => void retry(mutation.id)}
                        disabled={!online}
                        className="rounded px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-40"
                    >
                        Try again
                    </button>
                    <button
                        type="button"
                        onClick={() => void discard(mutation.id)}
                        className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
                    >
                        Discard
                    </button>
                </div>
            )}
        </li>
    );
}

export default function PendingSyncPanel({ onClose }: { onClose: () => void }) {
    const { mutations, online, syncing, syncNow, lastSyncAt, failed } = useOffline();

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label="Waiting to upload">
            <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-xl bg-white shadow-xl sm:rounded-xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">Waiting to upload</h2>
                        <p className="mt-0.5 text-xs text-gray-500">
                            {lastSyncAt ? `Last upload ${relativeTime(lastSyncAt)}` : 'Nothing uploaded yet'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Close"
                    >
                        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5">
                    {mutations.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-500">Everything is uploaded.</p>
                    ) : (
                        <ul>
                            {mutations.map((mutation) => (
                                <MutationRow key={mutation.id} mutation={mutation} />
                            ))}
                        </ul>
                    )}
                </div>

                <div className="border-t border-gray-200 px-5 py-3">
                    {failed > 0 && (
                        <p className="mb-2 text-xs text-gray-500">
                            Entries needing attention were refused by the server. Nothing is deleted
                            until you choose to discard it.
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={() => void syncNow()}
                        disabled={!online || syncing || mutations.length === 0}
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {syncing && <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {online ? (syncing ? 'Uploading…' : 'Upload now') : 'Waiting for a connection'}
                    </button>
                </div>
            </div>
        </div>
    );
}
