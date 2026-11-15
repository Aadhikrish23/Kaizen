import { memoryStore, QueueItem, QueueStore } from './queueCore';

const DB_NAME = 'kaizen-offline';
const STORE = 'queue';

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'clientRequestId' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const run = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(req.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
};

/** IndexedDB-backed queue store; falls back to memory (lost on reload) where IndexedDB is unavailable (e.g. private mode). */
export const createIdbStore = (): QueueStore => {
  if (typeof indexedDB === 'undefined') return memoryStore();
  const fallback = memoryStore();
  let useFallback = false;
  const guard = async <T>(idb: () => Promise<T>, mem: () => Promise<T>): Promise<T> => {
    if (useFallback) return mem();
    try {
      return await idb();
    } catch {
      useFallback = true;
      return mem();
    }
  };
  return {
    list: () => guard(() => run<QueueItem[]>('readonly', (s) => s.getAll()), () => fallback.list()),
    put: (i) => guard(async () => { await run('readwrite', (s) => s.put(i)); }, () => fallback.put(i)),
    remove: (id) => guard(async () => { await run('readwrite', (s) => s.delete(id)); }, () => fallback.remove(id)),
  };
};
