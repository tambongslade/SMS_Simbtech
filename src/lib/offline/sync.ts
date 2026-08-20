// The replay engine.
//
// Sends queued writes back to the server one at a time, in clientSeq order.
// Serial on purpose: ordering matters, and the scenario this whole feature is
// built for is a whole school reconnecting at once (R7) — firing a queue in
// parallel is how you turn a power cut into an outage.
//
// This talks to fetch directly rather than through apiService. Going through
// apiService would recurse straight back into the queue, and its 401 handler
// would wipe local storage mid-sync.

import { offlineConfig, MAX_ATTEMPTS, RETRY_BASE_MS, RETRY_MAX_MS } from './config';
import { emitOffline } from './events';
import { describeFailure, isRetryable, retryAfterMs, type SyncFailure } from './errors';
import { listMutations, removeMutation, updateMutation, type QueuedMutation } from './queue';
import { dbGet, dbPut, STORE_META } from './db';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';
const LAST_SYNC_KEY = 'lastSyncAt';

export interface SyncResult {
    sent: number;
    failed: number;
    remaining: number;
    /** Set when the run stopped early — no connection, throttled, or session expired. */
    stoppedBecause?: 'offline' | 'throttled' | 'unauthorized';
}

let running = false;

export const isSyncRunning = (): boolean => running;

export const isOnline = (): boolean =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false;

const backoffFor = (attempts: number): number =>
    Math.min(RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1), RETRY_MAX_MS);

/** Fields the contract adds to every queued write (R3). */
const withSyncEnvelope = (mutation: QueuedMutation) => {
    if (mutation.body == null || typeof mutation.body !== 'object' || Array.isArray(mutation.body)) {
        return mutation.body;
    }
    return {
        ...mutation.body,
        clientRecordedAt: mutation.createdAt,
        clientDeviceId: mutation.clientDeviceId,
        clientSeq: mutation.clientSeq,
    };
};

const sendOne = async (
    mutation: QueuedMutation,
): Promise<{ ok: true } | { ok: false; failure: SyncFailure; retryAfter: number | null }> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    // Off until the server accepts it — an unexpected custom header can fail
    // CORS preflight and break writes that would otherwise have worked.
    if (offlineConfig.idempotencyHeader) headers['Idempotency-Key'] = mutation.id;

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${mutation.endpoint}`, {
            method: mutation.method,
            headers,
            body: JSON.stringify(withSyncEnvelope(mutation)),
        });
    } catch {
        // Never reached a server. Not the write's fault — keep it pending.
        return { ok: false, failure: { status: null, message: 'No connection.' }, retryAfter: null };
    }

    if (response.ok) return { ok: true };

    let code: string | undefined;
    let message = '';
    let details: unknown;
    try {
        const parsed = await response.json();
        code = parsed?.code;
        message = parsed?.message ?? parsed?.error ?? '';
        details = parsed?.details;
    } catch {
        // Non-JSON error body (HTML error page, empty 502). Status is enough.
    }

    return {
        ok: false,
        failure: { status: response.status, code, message, details },
        retryAfter: retryAfterMs(response.headers.get('Retry-After')),
    };
};

export const syncNow = async (): Promise<SyncResult> => {
    if (running) return { sent: 0, failed: 0, remaining: 0 };
    if (!isOnline()) return { sent: 0, failed: 0, remaining: 0, stoppedBecause: 'offline' };

    running = true;
    emitOffline('sync-started');

    let sent = 0;
    let failed = 0;
    let stoppedBecause: SyncResult['stoppedBecause'];

    try {
        const queue = await listMutations();
        const now = Date.now();

        for (const mutation of queue) {
            if (mutation.status === 'failed') continue;
            // Backing off — leave it for a later run.
            if (mutation.nextAttemptAt > now) continue;

            await updateMutation({ ...mutation, status: 'syncing' });
            const result = await sendOne(mutation);

            if (result.ok) {
                await removeMutation(mutation.id);
                sent += 1;
                continue;
            }

            const { failure, retryAfter } = result;
            const attempts = mutation.attempts + 1;

            // No connection: stop the whole run. Every remaining item would
            // fail the same way, and burning attempts on them would push good
            // writes toward the give-up threshold for no reason.
            if (failure.status === null) {
                await updateMutation({ ...mutation, status: 'pending', lastError: failure });
                stoppedBecause = 'offline';
                break;
            }

            // Session expired. Without refresh tokens (R1) nothing here can
            // recover, so hold the queue intact and let the UI ask for a login.
            if (failure.status === 401) {
                await updateMutation({ ...mutation, status: 'pending', lastError: failure });
                stoppedBecause = 'unauthorized';
                break;
            }

            // Throttled. Honour Retry-After and stop — hammering is exactly the
            // retry storm R7 warns about.
            if (failure.status === 429) {
                const wait = retryAfter ?? backoffFor(attempts);
                await updateMutation({
                    ...mutation,
                    status: 'pending',
                    attempts,
                    nextAttemptAt: Date.now() + wait,
                    lastError: failure,
                });
                stoppedBecause = 'throttled';
                break;
            }

            if (isRetryable(failure) && attempts < MAX_ATTEMPTS) {
                await updateMutation({
                    ...mutation,
                    status: 'pending',
                    attempts,
                    nextAttemptAt: Date.now() + (retryAfter ?? backoffFor(attempts)),
                    lastError: failure,
                });
                continue;
            }

            // The server's final answer, or we have tried long enough. Keep it
            // for the user to resolve — never discard silently.
            await updateMutation({
                ...mutation,
                status: 'failed',
                attempts,
                lastError: { ...failure, message: describeFailure(failure) },
            });
            failed += 1;
        }

        if (sent > 0) {
            await dbPut(STORE_META, { key: LAST_SYNC_KEY, value: new Date().toISOString() });
        }

        const remaining = (await listMutations()).filter((m) => m.status !== 'failed').length;
        return { sent, failed, remaining, stoppedBecause };
    } finally {
        running = false;
        emitOffline('sync-finished');
    }
};

export const getLastSyncAt = async (): Promise<string | null> => {
    try {
        const row = await dbGet<{ key: string; value: string }>(STORE_META, LAST_SYNC_KEY);
        return row?.value ?? null;
    } catch {
        return null;
    }
};

/** Retry a write the user previously saw fail. */
export const retryMutation = async (id: string): Promise<void> => {
    const mutation = (await listMutations()).find((m) => m.id === id);
    if (!mutation) return;
    await updateMutation({ ...mutation, status: 'pending', attempts: 0, nextAttemptAt: 0 });
    void syncNow();
};

let autoSyncStarted = false;

/**
 * Replay whenever the connection comes back, when the app is brought forward,
 * and on a slow timer for the case where the browser never fires an event.
 */
export const startAutoSync = (): (() => void) => {
    if (typeof window === 'undefined' || autoSyncStarted) return () => {};
    autoSyncStarted = true;

    const trigger = () => {
        if (isOnline()) void syncNow();
    };

    const onOnlineEvent = () => {
        emitOffline('connectivity-changed');
        // navigator.onLine flips before the connection is usable; a moment's
        // grace avoids a guaranteed-failed first attempt.
        setTimeout(trigger, 1500);
    };
    const onOfflineEvent = () => emitOffline('connectivity-changed');
    const onVisible = () => {
        if (document.visibilityState === 'visible') trigger();
    };

    window.addEventListener('online', onOnlineEvent);
    window.addEventListener('offline', onOfflineEvent);
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(trigger, 60_000);

    trigger();

    return () => {
        window.removeEventListener('online', onOnlineEvent);
        window.removeEventListener('offline', onOfflineEvent);
        document.removeEventListener('visibilitychange', onVisible);
        window.clearInterval(interval);
        autoSyncStarted = false;
    };
};
