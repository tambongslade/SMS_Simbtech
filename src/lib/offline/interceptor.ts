// The bridge between apiService and the offline layer.
//
// Kept separate so apiService stays readable: it gains three hooks, and all the
// decisions about what may be queued or served stale live here.

import { toast } from 'react-hot-toast';
import { findQueueRule, isCacheableRead, isQueueableButDisabled } from './policy';
import { enqueue } from './queue';
import { getCachedRead, putCachedRead, isStale } from './cache';
import { isOnline } from './sync';

/** Marker on any response the caller did not actually get from the server. */
export interface OfflineResult {
    offlineQueued?: true;
    offlineFromCache?: true;
    offlineSavedAt?: number;
}

const relative = (endpoint: string): boolean => !endpoint.startsWith('http');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

/**
 * SWR keys come in both forms — some callers pass '/classes', others pass the
 * full `${API_BASE_URL}/sub-classes`. Normalise so the same resource is not
 * cached twice under two keys.
 */
const normaliseKey = (url: string): string =>
    url.startsWith(API_BASE_URL) ? url.slice(API_BASE_URL.length) || '/' : url;

/**
 * Queue a write that cannot be sent, and hand the caller an optimistic result
 * so the UI can carry on. Returns null when the write must not be queued —
 * the caller then fails normally, which is the honest outcome.
 */
export const maybeQueueWrite = async (
    method: string,
    endpoint: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any,
    silent?: boolean,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> => {
    if (typeof window === 'undefined' || !relative(endpoint)) return null;
    // A file upload cannot be replayed from IndexedDB in any useful form.
    if (typeof FormData !== 'undefined' && body instanceof FormData) return null;

    const rule = findQueueRule(method, endpoint);
    if (!rule) {
        // Recognised, but its backend guarantee is not in place yet. Say so,
        // rather than letting the user think a generic network error is bad luck.
        if (!silent && isQueueableButDisabled(method, endpoint)) {
            toast.error('This cannot be saved offline yet. Reconnect and try again.', { id: 'api-error' });
        }
        return null;
    }

    try {
        const mutation = await enqueue(rule, endpoint, body);
        if (!silent) {
            toast.success('Saved on this device. It will upload when you are back online.', {
                id: 'offline-queued',
            });
        }
        const optimistic = rule.optimisticResponse?.(body) ?? {};
        return { success: true, ...optimistic, offlineQueued: true, offlineMutationId: mutation.id };
    } catch (error) {
        // Could not even write to IndexedDB (private mode, no storage). Falling
        // through means the caller sees the real failure, which is correct.
        console.error('Could not queue the offline write:', error);
        return null;
    }
};

/** Last-known response for a GET the network cannot serve right now. */
export const maybeServeFromCache = async <T>(
    endpoint: string,
    responseType: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<(T & OfflineResult) | null> => {
    if (typeof window === 'undefined' || !relative(endpoint)) return null;
    if (!isCacheableRead('GET', endpoint, responseType)) return null;

    const hit = await getCachedRead<T>(endpoint);
    if (!hit) return null;

    if (hit.body && typeof hit.body === 'object') {
        return {
            ...(hit.body as object),
            offlineFromCache: true,
            offlineSavedAt: hit.savedAt,
        } as T & OfflineResult;
    }
    return hit.body as T & OfflineResult;
};

/** Remember a successful GET so it is there during the next blackout. */
export const rememberRead = (endpoint: string, responseType: string, body: unknown): void => {
    if (typeof window === 'undefined' || !relative(endpoint)) return;
    if (!isCacheableRead('GET', endpoint, responseType)) return;
    // Fire and forget — a slow cache write must never delay the render.
    void putCachedRead(endpoint, body);
};

/**
 * Whether a given write would survive being made offline.
 *
 * For screens that fan out to several endpoints in one action: if any leg
 * cannot be queued, the screen should refuse the whole submit rather than
 * half-saving it.
 */
export const canQueueOffline = (method: string, endpoint: string): boolean =>
    !!findQueueRule(method, endpoint);

// ── SWR ──────────────────────────────────────────────────────────────────
//
// SWR does not go through apiService; it uses the raw fetcher in lib/fetcher.ts.
// These two give that path the same read cache, keyed on the SWR key itself.

export const maybeServeCachedUrl = async <T>(url: string): Promise<T | null> => {
    if (typeof window === 'undefined') return null;
    const key = normaliseKey(url);
    if (!isCacheableRead('GET', key, 'json')) return null;
    const hit = await getCachedRead<T>(key);
    return hit ? hit.body : null;
};

export const rememberUrl = (url: string, body: unknown): void => {
    if (typeof window === 'undefined') return;
    const key = normaliseKey(url);
    if (!isCacheableRead('GET', key, 'json')) return;
    void putCachedRead(key, body);
};

/** True when we already know the network is down, so we can skip the doomed fetch. */
export const knownOffline = (): boolean => typeof window !== 'undefined' && !isOnline();

export { isStale };
