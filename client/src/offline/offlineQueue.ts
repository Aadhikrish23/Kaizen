import { apiClient } from '../api/client';

// The response interceptor unwraps { success, data }, so a call resolves to the payload (not an AxiosResponse)
const post = <T>(url: string, body: unknown) => apiClient.post(url, body) as unknown as Promise<T>;
import { createIdbStore } from './idbStore';
import { createQueueItem, hasQueueOwner, isNetworkFailure, processQueue, QueueItem, QueueKind, retryItem } from './queueCore';

const store = createIdbStore();
const listeners = new Set<() => void>();
let snapshot: QueueItem[] = [];
let flushing = false;

const refresh = async () => {
  snapshot = (await store.list()).sort((a, b) => a.createdAt - b.createdAt);
  listeners.forEach((l) => l());
};

export const subscribeQueue = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const getQueueSnapshot = () => snapshot;
void refresh();

export const isOnline = (): boolean => typeof navigator === 'undefined' || navigator.onLine !== false;

export const enqueue = async (userId: string, kind: QueueKind, data: Record<string, unknown>, clientRequestId?: string) => {
  const item = createQueueItem(userId, kind, data, clientRequestId);
  await store.put(item);
  await refresh();
  return item;
};

export const discardItem = async (clientRequestId: string) => {
  await store.remove(clientRequestId);
  await refresh();
};

export const retryFailedItem = async (clientRequestId: string) => {
  await retryItem(store, clientRequestId);
  await refresh();
};

/** Replay this user's pending items. Safe to call repeatedly (one flush at a time). Returns how many were sent. */
export const flushQueue = async (userId: string): Promise<number> => {
  if (flushing || !isOnline()) return 0;
  flushing = true;
  try {
    const res = await processQueue({ store, userId, send: (item) => post(item.url, item.body) });
    await refresh();
    return res.sent;
  } finally {
    flushing = false;
  }
};

/**
 * Submit a create request, or queue it when there is no network. The same clientRequestId is used for the live attempt
 * and any replay, so a request that actually reached the server before the connection dropped is not duplicated.
 */
export type QueuedResult = { queued: true; clientRequestId: string };

export const submitOrQueue = async <T>(userId: string, kind: QueueKind, url: string, data: Record<string, unknown>): Promise<T | QueuedResult> => {
  // Without a signed-in user an entry could never be replayed (items are only replayed for their owner): refuse to queue it
  const noUser = new Error('You need to be signed in to save entries offline. Sign in again and retry.');
  if (!hasQueueOwner(userId)) {
    if (!isOnline()) throw noUser;
    try { return await post<T>(url, data); } catch (err) { if (isNetworkFailure(err)) throw noUser; throw err; }
  }
  const item = createQueueItem(userId, kind, data);
  if (!isOnline()) {
    await store.put(item);
    await refresh();
    return { queued: true, clientRequestId: item.clientRequestId };
  }
  try {
    return await post<T>(url, item.body);
  } catch (err) {
    if (isNetworkFailure(err)) {
      await store.put(item);
      await refresh();
      return { queued: true, clientRequestId: item.clientRequestId };
    }
    throw err;
  }
};
