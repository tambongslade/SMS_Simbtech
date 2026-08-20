// Read-through cache for GET responses, so pages still render during a blackout.
//
// Entries are namespaced by user id: a shared staff phone must never show one
// teacher the roster another teacher loaded. Clearing happens on logout.

import { dbCount, dbDelete, dbGet, dbGetAll, dbPut, isOfflineStorageAvailable, STORE_CACHE } from './db';
import { CACHE_MAX_ENTRIES, CACHE_STALE_AFTER_MS } from './config';

export interface CachedRead<T = unknown> {
    key: string;
    endpoint: string;
    userId: string | null;
    body: T;
    savedAt: number;
}

const currentUserId = (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem('userData');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const id = parsed?.id ?? parsed?.userId;
        return id != null ? String(id) : null;
    } catch {
        return null;
    }
};

const cacheKey = (endpoint: string): string => `${currentUserId() ?? 'anon'}::${endpoint}`;

export const putCachedRead = async (endpoint: string, body: unknown): Promise<void> => {
    if (!isOfflineStorageAvailable()) return;
    try {
        await dbPut<CachedRead>(STORE_CACHE, {
            key: cacheKey(endpoint),
            endpoint,
            userId: currentUserId(),
            body,
            savedAt: Date.now(),
        });
        await evictIfOversized();
    } catch {
        // Storage full or blocked. Caching is best-effort; the online path is
        // unaffected and must not fail because the cache could not be written.
    }
};

export const getCachedRead = async <T>(endpoint: string): Promise<CachedRead<T> | null> => {
    if (!isOfflineStorageAvailable()) return null;
    try {
        const hit = await dbGet<CachedRead<T>>(STORE_CACHE, cacheKey(endpoint));
        return hit ?? null;
    } catch {
        return null;
    }
};

export const isStale = (entry: CachedRead): boolean => Date.now() - entry.savedAt > CACHE_STALE_AFTER_MS;

/** Oldest-first eviction once the store passes its cap. */
const evictIfOversized = async (): Promise<void> => {
    const total = await dbCount(STORE_CACHE);
    if (total <= CACHE_MAX_ENTRIES) return;
    const all = await dbGetAll<CachedRead>(STORE_CACHE);
    const excess = all.sort((a, b) => a.savedAt - b.savedAt).slice(0, total - CACHE_MAX_ENTRIES);
    await Promise.all(excess.map((entry) => dbDelete(STORE_CACHE, entry.key)));
};

/**
 * Wipe cached reads on logout.
 *
 * Deliberately does NOT touch the write queue: unsent work belongs to the
 * person who entered it, and destroying it because someone logged out is the
 * exact silent-loss failure this whole layer exists to prevent.
 */
export const clearCachedReads = async (): Promise<void> => {
    if (!isOfflineStorageAvailable()) return;
    try {
        const all = await dbGetAll<CachedRead>(STORE_CACHE);
        await Promise.all(all.map((entry) => dbDelete(STORE_CACHE, entry.key)));
    } catch {
        // Nothing actionable — a failed cache clear is not worth blocking logout.
    }
};
