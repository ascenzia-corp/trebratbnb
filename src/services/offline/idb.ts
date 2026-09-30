/**
 * Minimal IndexedDB wrapper for offline support.
 *
 * IndexedDB (not localStorage) because pending photos are stored as Blobs and
 * can weigh several hundred KB each, well beyond localStorage's ~5 MB budget.
 *
 * - `ops`   : queue of changes waiting to be sent to Supabase (FIFO by `seq`)
 * - `cache` : last known server data per screen, to keep working offline
 */

const DB_NAME = 'trebrat-offline';
const DB_VERSION = 1;
export const OPS_STORE = 'ops';
const CACHE_STORE = 'cache';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(OPS_STORE)) {
          db.createObjectStore(OPS_STORE, { keyPath: 'seq', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

export function idbGetAll<T>(store: string): Promise<T[]> {
  return run<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>);
}

export function idbAdd<T>(store: string, value: T): Promise<number> {
  return run<IDBValidKey>(store, 'readwrite', (s) => s.add(value)) as Promise<number>;
}

export function idbPut<T>(store: string, value: T): Promise<void> {
  return run(store, 'readwrite', (s) => s.put(value)).then(() => undefined);
}

export function idbDelete(store: string, key: IDBValidKey): Promise<void> {
  return run(store, 'readwrite', (s) => s.delete(key)).then(() => undefined);
}

export function cacheGet<T>(key: string): Promise<T | undefined> {
  return run<T | undefined>(CACHE_STORE, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>).catch(
    () => undefined
  );
}

export function cacheSet<T>(key: string, value: T): Promise<void> {
  return run(CACHE_STORE, 'readwrite', (s) => s.put(value, key))
    .then(() => undefined)
    .catch(() => undefined);
}
