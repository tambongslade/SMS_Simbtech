// Tiny synchronous event bus so the UI can react to queue and sync changes
// without polling IndexedDB. Kept local to the offline layer — the app already
// has SWR for server state and this is not that.

export type OfflineEvent = 'queue-changed' | 'sync-started' | 'sync-finished' | 'connectivity-changed';

type Listener = () => void;

const listeners = new Map<OfflineEvent, Set<Listener>>();

export const onOffline = (event: OfflineEvent, listener: Listener): (() => void) => {
    const set = listeners.get(event) ?? new Set<Listener>();
    set.add(listener);
    listeners.set(event, set);
    return () => set.delete(listener);
};

export const emitOffline = (event: OfflineEvent): void => {
    listeners.get(event)?.forEach((listener) => {
        try {
            listener();
        } catch (error) {
            // A broken subscriber must never take down a sync run.
            console.error(`Offline listener for "${event}" threw:`, error);
        }
    });
};
