// Deciding whether a failed replay is worth retrying.
//
// Contract R6 asks the backend for a machine-readable `code` on every error.
// It does not exist yet, so classification currently rests on the HTTP status,
// which is enough to tell "the network is down" from "the server said no".

export interface SyncFailure {
    status: number | null; // null = the request never reached a server
    code?: string;
    message: string;
    details?: unknown;
}

/** Statuses worth trying again later. Everything else is the server's final answer. */
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export const isRetryable = (failure: SyncFailure): boolean => {
    // No status at all means the request never landed — always worth a retry.
    if (failure.status === null) return true;
    return RETRYABLE_STATUSES.has(failure.status);
};

/**
 * A terminal failure the user has to see and resolve — as opposed to one the
 * sync engine can quietly keep retrying.
 */
export const needsAttention = (failure: SyncFailure): boolean => !isRetryable(failure);

/** Honour Retry-After when the server sends one (R7), in ms. */
export const retryAfterMs = (header: string | null): number | null => {
    if (!header) return null;
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
    const date = Date.parse(header);
    if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
    return null;
};

/** Human text for the pending-sync list. Server prose is preferred when it is clean. */
export const describeFailure = (failure: SyncFailure): string => {
    if (failure.status === null) return 'Waiting for a connection.';
    if (failure.status === 401) return 'Your session expired before this could be sent.';
    if (failure.status === 403) return 'You no longer have permission to save this.';
    if (failure.status === 409) return 'Someone else changed this first.';
    if (failure.status === 404) return 'The server no longer has this record.';
    if (failure.status >= 500) return 'The server had a problem. Will try again.';
    return failure.message || 'This could not be saved.';
};
