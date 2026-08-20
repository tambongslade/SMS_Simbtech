// The write queue.
//
// Every entry is one HTTP write that could not be sent. The id doubles as the
// Idempotency-Key (R2), so a write keeps the same key across every retry — that
// is what lets the server recognise a replay rather than applying it twice.

import { dbDelete, dbGetAll, dbPut, isOfflineStorageAvailable, STORE_MUTATIONS } from './db';
import { clientTimestamp, getDeviceId, nextClientSeq, uuid } from './identity';
import { emitOffline } from './events';
import type { HttpMethod, QueueRule } from './policy';
import type { SyncFailure } from './errors';

export type MutationStatus = 'pending' | 'syncing' | 'failed';

export interface QueuedMutation {
    /** Also sent as Idempotency-Key. Stable across retries — never regenerate it. */
    id: string;
    endpoint: string;
    method: HttpMethod;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any;
    /** Short human label for the pending list. */
    label: string;
    feature: string;
    /** Who queued it, so one user's queue is never replayed as another. */
    userId: string | null;
    createdAt: string;
    clientSeq: number;
    clientDeviceId: string;
    status: MutationStatus;
    attempts: number;
    /** Epoch ms; the replay engine skips anything scheduled for later. */
    nextAttemptAt: number;
    lastError?: SyncFailure;
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
        // A corrupt userData blob must not stop a teacher saving attendance.
        return null;
    }
};

export const enqueue = async (
    rule: QueueRule,
    endpoint: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any,
): Promise<QueuedMutation> => {
    let label: string;
    try {
        label = rule.describe(body);
    } catch {
        label = `${rule.method} ${endpoint}`;
    }

    const mutation: QueuedMutation = {
        id: uuid(),
        endpoint,
        method: rule.method,
        body,
        label,
        feature: rule.feature,
        userId: currentUserId(),
        createdAt: clientTimestamp(),
        clientSeq: nextClientSeq(),
        clientDeviceId: getDeviceId(),
        status: 'pending',
        attempts: 0,
        nextAttemptAt: 0,
    };

    await dbPut(STORE_MUTATIONS, mutation);
    emitOffline('queue-changed');
    return mutation;
};

/** Everything queued, oldest first — replay order is clientSeq, never insertion order. */
export const listMutations = async (): Promise<QueuedMutation[]> => {
    if (!isOfflineStorageAvailable()) return [];
    try {
        const all = await dbGetAll<QueuedMutation>(STORE_MUTATIONS);
        return all.sort((a, b) => a.clientSeq - b.clientSeq);
    } catch {
        return [];
    }
};

export const updateMutation = async (mutation: QueuedMutation): Promise<void> => {
    await dbPut(STORE_MUTATIONS, mutation);
    emitOffline('queue-changed');
};

export const removeMutation = async (id: string): Promise<void> => {
    await dbDelete(STORE_MUTATIONS, id);
    emitOffline('queue-changed');
};

export interface QueueSummary {
    pending: number;
    failed: number;
    total: number;
}

export const summarise = (mutations: QueuedMutation[]): QueueSummary => {
    const failed = mutations.filter((m) => m.status === 'failed').length;
    return { pending: mutations.length - failed, failed, total: mutations.length };
};

export const getQueueSummary = async (): Promise<QueueSummary> => summarise(await listMutations());

/**
 * Drop a write the user has chosen to abandon from the conflict list.
 * Only ever called from an explicit user action — nothing discards silently.
 */
export const discardMutation = removeMutation;
