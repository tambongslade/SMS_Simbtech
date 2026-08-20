// Device identity and the per-device sequence counter.
//
// Both are required on every queued write (contract R3): the server uses
// clientDeviceId + clientSeq to order writes that arrive out of order, because
// the wall clock on these phones cannot be trusted for ordering.

const DEVICE_ID_KEY = 'offlineDeviceId';
const CLIENT_SEQ_KEY = 'offlineClientSeq';

/** RFC4122 v4, falling back for the older WebViews that lack randomUUID. */
export const uuid = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    // Last resort. Only reachable on a WebView with no crypto at all, where a
    // collision is still less harmful than refusing to queue the write.
    return `fallback-${Date.now().toString(16)}-${Math.floor(Math.random() * 1e12).toString(16)}`;
};

/** Stable per-install id. Survives reloads; a reinstall legitimately gets a new one. */
export const getDeviceId = (): string => {
    if (typeof window === 'undefined') return 'server';
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = uuid();
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
};

/**
 * Monotonic counter, incremented once per queued write.
 *
 * Kept in localStorage rather than IndexedDB so it can be read synchronously at
 * the moment of enqueueing — an async read here would let two writes race onto
 * the same sequence number.
 */
export const nextClientSeq = (): number => {
    if (typeof window === 'undefined') return 0;
    const current = Number(localStorage.getItem(CLIENT_SEQ_KEY) ?? '0');
    const next = Number.isFinite(current) ? current + 1 : 1;
    localStorage.setItem(CLIENT_SEQ_KEY, String(next));
    return next;
};

/** ISO 8601 with the device's offset, as the contract requires (R3). */
export const clientTimestamp = (): string => new Date().toISOString();
