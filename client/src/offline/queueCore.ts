// Pure core of the offline write queue (no IndexedDB, no DOM): easy to unit test.
// Only simple add-only logs are queued; each carries a client-generated clientRequestId that the server uses to make
// replays idempotent (a replay returns the existing document instead of creating another).

export type QueueKind = 'meal' | 'water' | 'weight' | 'sleep';

export interface QueueItem {
  clientRequestId: string;
  userId: string; // items are only ever replayed for the user who created them
  kind: QueueKind;
  url: string;
  body: Record<string, unknown>;
  label: string;
  createdAt: number;
  attempts: number;
  status: 'pending' | 'failed';
  error?: string;
}

export interface QueueStore {
  list(): Promise<QueueItem[]>;
  put(item: QueueItem): Promise<void>;
  remove(clientRequestId: string): Promise<void>;
}

export const MAX_ATTEMPTS = 5;

export const newClientRequestId = (): string => {
  const c: any = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

const KIND_URL: Record<QueueKind, string> = { meal: '/meals', water: '/water', weight: '/weight', sleep: '/sleep' };

export const describeItem = (kind: QueueKind, body: Record<string, unknown>): string => {
  switch (kind) {
    case 'meal': return `Meal: ${String(body.name ?? 'meal')} (${Number(body.calories ?? 0)} kcal)`;
    case 'water': return `Water: ${Number(body.amount ?? 0)} ml`;
    case 'weight': return `Weight: ${Number(body.weight ?? 0)} kg`;
    case 'sleep': return `Sleep: ${String(body.bedtime ?? '')} to ${String(body.wakeTime ?? '')}`;
  }
};

/** localStorage key holding the id of the user who owns the cached API responses. */
export const CACHE_OWNER_KEY = 'kaizen-cache-owner';

/**
 * Should the cached API responses be dropped? They are keyed by URL only, so they must belong to the signed-in user.
 * Clear when nobody is signed in, when no owner was recorded, or when the recorded owner is someone else.
 */
export const cacheOwnerAction = (storedOwner: string | null | undefined, currentUserId: string | null | undefined): 'keep' | 'clear' => {
  if (!currentUserId) return 'clear';
  return storedOwner && storedOwner === currentUserId ? 'keep' : 'clear';
};

/** A queued item must always belong to a user (items are only replayed for their owner). */
export const hasQueueOwner = (userId: unknown): userId is string => typeof userId === 'string' && userId.trim().length > 0;

export const createQueueItem = (
  userId: string,
  kind: QueueKind,
  data: Record<string, unknown>,
  clientRequestId: string = newClientRequestId(),
  now: number = Date.now()
): QueueItem => {
  if (!hasQueueOwner(userId)) throw new Error('Cannot queue an offline entry without a signed-in user');
  const body = { ...data, clientRequestId };
  return { clientRequestId, userId, kind, url: KIND_URL[kind], body, label: describeItem(kind, body), createdAt: now, attempts: 0, status: 'pending' };
};

export interface FailureLike {
  response?: { status?: number } | undefined;
  status?: number; // added by the API client to rejected server errors
  isAxiosError?: boolean;
  code?: string;
  message?: string;
}

/**
 * True when the request never got an HTTP response (offline, DNS, timeout): safe to queue. These reach callers as the raw
 * axios error (isAxiosError, no response); rejected server errors carry a `status` instead.
 */
export const isNetworkFailure = (err: unknown): boolean => {
  const e = err as FailureLike;
  return !!e && e.isAxiosError === true && e.response === undefined && e.status === undefined;
};

/**
 * What to do after a failed replay:
 *  - 'retry': no response, a server error (5xx), a timeout (408) or rate limit (429): try again later
 *  - 'fail': the server rejected the request (validation, auth, not found): retrying cannot help, show it to the user
 */
export const classifyFailure = (err: unknown): 'retry' | 'fail' => {
  const e = err as FailureLike;
  const status = e?.response?.status ?? e?.status;
  if (status === undefined) return isNetworkFailure(err) ? 'retry' : 'fail';
  if (status >= 500 || status === 408 || status === 429) return 'retry';
  return 'fail';
};

export const failureMessage = (err: unknown): string => {
  const e = err as { message?: string; response?: { data?: { error?: { message?: string } } } };
  return e?.response?.data?.error?.message || e?.message || 'Request failed';
};

export interface ProcessResult {
  sent: number;
  failed: number;
  stopped: boolean; // stopped early because the network or server is still unavailable (order is preserved)
}

/**
 * Replay pending items of `userId` oldest first. Success removes the item; a permanent failure marks it failed and
 * continues; a transient failure counts an attempt and stops (so a still-offline device does not burn every item).
 */
export const processQueue = async (opts: {
  store: QueueStore;
  userId: string;
  send: (item: QueueItem) => Promise<unknown>;
  maxAttempts?: number;
}): Promise<ProcessResult> => {
  const max = opts.maxAttempts ?? MAX_ATTEMPTS;
  const items = (await opts.store.list())
    .filter((i) => i.userId === opts.userId && i.status === 'pending')
    .sort((a, b) => a.createdAt - b.createdAt);
  const result: ProcessResult = { sent: 0, failed: 0, stopped: false };

  for (const item of items) {
    try {
      await opts.send(item);
      await opts.store.remove(item.clientRequestId);
      result.sent++;
    } catch (err) {
      if (classifyFailure(err) === 'fail') {
        await opts.store.put({ ...item, status: 'failed', error: failureMessage(err) });
        result.failed++;
        continue;
      }
      const attempts = item.attempts + 1;
      if (attempts >= max) {
        await opts.store.put({ ...item, attempts, status: 'failed', error: `Gave up after ${attempts} attempts: ${failureMessage(err)}` });
        result.failed++;
        continue;
      }
      await opts.store.put({ ...item, attempts });
      result.stopped = true;
      break;
    }
  }
  return result;
};

export const retryItem = async (store: QueueStore, clientRequestId: string): Promise<void> => {
  const item = (await store.list()).find((i) => i.clientRequestId === clientRequestId);
  if (item) await store.put({ ...item, status: 'pending', attempts: 0, error: undefined });
};

export const memoryStore = (): QueueStore => {
  const map = new Map<string, QueueItem>();
  return {
    list: async () => [...map.values()],
    put: async (i) => void map.set(i.clientRequestId, i),
    remove: async (id) => void map.delete(id),
  };
};
