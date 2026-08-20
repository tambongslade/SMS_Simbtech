'use client';

// Connectivity and sync state for the whole app.
//
// Deliberately thin: it owns nothing the server owns. Its only job is to answer
// "are we online", "how much is waiting to upload", and "did anything fail",
// so the UI can be honest about what has actually been saved.

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { onOffline } from '@/lib/offline/events';
import { listMutations, summarise, discardMutation, type QueuedMutation } from '@/lib/offline/queue';
import { getLastSyncAt, isOnline, isSyncRunning, retryMutation, startAutoSync, syncNow } from '@/lib/offline/sync';

interface OfflineContextValue {
    online: boolean;
    syncing: boolean;
    /** Writes waiting to upload. */
    pending: number;
    /** Writes the server refused — these need a person to look at them. */
    failed: number;
    mutations: QueuedMutation[];
    lastSyncAt: string | null;
    syncNow: () => Promise<void>;
    retry: (id: string) => Promise<void>;
    discard: (id: string) => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue>({
    online: true,
    syncing: false,
    pending: 0,
    failed: 0,
    mutations: [],
    lastSyncAt: null,
    syncNow: async () => {},
    retry: async () => {},
    discard: async () => {},
});

export const useOffline = (): OfflineContextValue => useContext(OfflineContext);

export default function OfflineProvider({ children }: { children: ReactNode }) {
    const [online, setOnline] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [mutations, setMutations] = useState<QueuedMutation[]>([]);
    const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        const [queue, last] = await Promise.all([listMutations(), getLastSyncAt()]);
        setMutations(queue);
        setLastSyncAt(last);
    }, []);

    useEffect(() => {
        // Start pessimistic only if the browser already says so — assuming
        // offline on first paint would flash a banner at everyone.
        setOnline(isOnline());
        void refresh();

        const stopAutoSync = startAutoSync();
        const unsubscribers = [
            onOffline('queue-changed', () => void refresh()),
            onOffline('sync-started', () => setSyncing(true)),
            onOffline('sync-finished', () => {
                setSyncing(isSyncRunning());
                void refresh();
            }),
            onOffline('connectivity-changed', () => setOnline(isOnline())),
        ];

        return () => {
            stopAutoSync();
            unsubscribers.forEach((off) => off());
        };
    }, [refresh]);

    const value = useMemo<OfflineContextValue>(() => {
        const { pending, failed } = summarise(mutations);
        return {
            online,
            syncing,
            pending,
            failed,
            mutations,
            lastSyncAt,
            syncNow: async () => {
                await syncNow();
                await refresh();
            },
            retry: async (id: string) => {
                await retryMutation(id);
                await refresh();
            },
            discard: async (id: string) => {
                await discardMutation(id);
                await refresh();
            },
        };
    }, [online, syncing, mutations, lastSyncAt, refresh]);

    return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}
