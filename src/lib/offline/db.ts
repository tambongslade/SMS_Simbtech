// Minimal IndexedDB wrapper for the offline layer.
//
// Deliberately dependency-free: the app ships to phones on slow connections and
// an extra library for three object stores is not worth the bytes. Everything
// here is a thin promise wrapper over the raw API.
//
// Stores:
//   mutations - the write queue (see queue.ts)
//   cache     - cached GET responses so pages render offline (see cache.ts)
//   meta      - small key/value bits (last sync time, device id fallback)

const DB_NAME = 'sms-offline';
const DB_VERSION = 1;

export const STORE_MUTATIONS = 'mutations';
export const STORE_CACHE = 'cache';
export const STORE_META = 'meta';

export const isOfflineStorageAvailable = (): boolean =>
    typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
    if (!isOfflineStorageAvailable()) {
        return Promise.reject(new Error('IndexedDB is not available in this environment.'));
    }
    if (dbPromise) return dbPromise;

    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains(STORE_MUTATIONS)) {
                const mutations = db.createObjectStore(STORE_MUTATIONS, { keyPath: 'id' });
                // Replay order is by clientSeq, never by insertion order — a
                // dependent write must never overtake the one it depends on.
                mutations.createIndex('clientSeq', 'clientSeq', { unique: false });
                mutations.createIndex('status', 'status', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORE_CACHE)) {
                const cache = db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
                cache.createIndex('savedAt', 'savedAt', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORE_META)) {
                db.createObjectStore(STORE_META, { keyPath: 'key' });
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            // A second tab running a newer version blocks this one; drop the
            // handle so the next call reopens rather than using a dead db.
            db.onversionchange = () => {
                db.close();
                dbPromise = null;
            };
            resolve(db);
        };

        request.onerror = () => reject(request.error ?? new Error('Could not open the offline database.'));
        request.onblocked = () => reject(new Error('The offline database is blocked by another tab.'));
    }).catch((error) => {
        // Never cache a rejected promise — a transient failure (private mode,
        // storage pressure) would otherwise disable offline for the session.
        dbPromise = null;
        throw error;
    });

    return dbPromise;
};

const runTransaction = async <T>(
    storeName: string,
    mode: IDBTransactionMode,
    work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
    const db = await openDb();
    return new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const request = work(tx.objectStore(storeName));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Offline database request failed.'));
        tx.onabort = () => reject(tx.error ?? new Error('Offline database transaction aborted.'));
    });
};

export const dbGet = <T>(store: string, key: IDBValidKey): Promise<T | undefined> =>
    runTransaction<T | undefined>(store, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>);

export const dbGetAll = <T>(store: string): Promise<T[]> =>
    runTransaction<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>);

export const dbPut = <T>(store: string, value: T): Promise<IDBValidKey> =>
    runTransaction<IDBValidKey>(store, 'readwrite', (s) => s.put(value));

export const dbDelete = (store: string, key: IDBValidKey): Promise<undefined> =>
    runTransaction<undefined>(store, 'readwrite', (s) => s.delete(key) as IDBRequest<undefined>);

export const dbClear = (store: string): Promise<undefined> =>
    runTransaction<undefined>(store, 'readwrite', (s) => s.clear() as IDBRequest<undefined>);

export const dbCount = (store: string): Promise<number> =>
    runTransaction<number>(store, 'readonly', (s) => s.count());
