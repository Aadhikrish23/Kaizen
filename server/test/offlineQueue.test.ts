import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { loadClientModule } from './helpers/loadClientModule';

const q = loadClientModule('client/src/offline/queueCore.ts');
const { createQueueItem, processQueue, classifyFailure, isNetworkFailure, memoryStore, retryItem, describeItem, MAX_ATTEMPTS, failureMessage } = q;

const netErr = () => ({ isAxiosError: true, code: 'ERR_NETWORK', message: 'Network Error' }); // raw axios error: no response
const serverErr = (status: number, code = 'X') => ({ code, message: `error ${status}`, status }); // rejected server error + status

test('queue items carry the clientRequestId in the body and a readable label', () => {
  const item = createQueueItem('u1', 'meal', { name: 'Oats', calories: 300, date: '2026-03-08' }, 'req-12345678', 1000);
  assert.deepEqual(item.body, { name: 'Oats', calories: 300, date: '2026-03-08', clientRequestId: 'req-12345678' });
  assert.deepEqual([item.url, item.status, item.attempts, item.userId, item.createdAt], ['/meals', 'pending', 0, 'u1', 1000]);
  assert.equal(item.label, 'Meal: Oats (300 kcal)');
  assert.equal(createQueueItem('u', 'water', { amount: 250 }).url, '/water');
  assert.equal(createQueueItem('u', 'weight', { weight: 70 }).url, '/weight');
  assert.equal(createQueueItem('u', 'sleep', { bedtime: '23:00', wakeTime: '07:00' }).url, '/sleep');
  assert.equal(describeItem('sleep', { bedtime: '23:00', wakeTime: '07:00' }), 'Sleep: 23:00 to 07:00');
  const a = createQueueItem('u', 'water', { amount: 1 });
  const b = createQueueItem('u', 'water', { amount: 1 });
  assert.notEqual(a.clientRequestId, b.clientRequestId); // each logical write gets its own key
});

test('failure classification: only transient failures are retried', () => {
  assert.equal(classifyFailure(netErr()), 'retry');
  assert.equal(classifyFailure(serverErr(500)), 'retry');
  assert.equal(classifyFailure(serverErr(503)), 'retry');
  assert.equal(classifyFailure(serverErr(429, 'RATE_LIMITED')), 'retry');
  assert.equal(classifyFailure(serverErr(408)), 'retry');
  assert.equal(classifyFailure(serverErr(400, 'VALIDATION_ERROR')), 'fail');
  assert.equal(classifyFailure(serverErr(401, 'UNAUTHORIZED')), 'fail');
  assert.equal(classifyFailure(serverErr(404)), 'fail');
  assert.equal(classifyFailure(new Error('boom')), 'fail'); // unknown errors are shown, not retried forever
  assert.equal(isNetworkFailure(netErr()), true);
  assert.equal(isNetworkFailure(serverErr(500)), false);
  assert.equal(isNetworkFailure({ code: 'VALIDATION_ERROR', message: 'bad' }), false); // a rejected server error is never "offline"
  assert.equal(isNetworkFailure(new Error('x')), false);
  assert.equal(failureMessage({ message: 'Invalid input' }), 'Invalid input');
});

test('replay sends each item once, oldest first, and removes it; the same clientRequestId is sent on every attempt', async () => {
  const store = memoryStore();
  const first = createQueueItem('u1', 'meal', { name: 'A', calories: 1 }, 'id-aaaaaaaa', 100);
  const second = createQueueItem('u1', 'water', { amount: 250 }, 'id-bbbbbbbb', 200);
  await store.put(second); await store.put(first); // inserted out of order
  const sent: any[] = [];
  const res = await processQueue({ store, userId: 'u1', send: async (i: any) => { sent.push([i.clientRequestId, i.body.clientRequestId]); } });
  assert.deepEqual(res, { sent: 2, failed: 0, stopped: false });
  assert.deepEqual(sent, [['id-aaaaaaaa', 'id-aaaaaaaa'], ['id-bbbbbbbb', 'id-bbbbbbbb']]);
  assert.deepEqual(await store.list(), []);
});

test('a network failure keeps the item, counts an attempt and stops (order preserved, nothing burned)', async () => {
  const store = memoryStore();
  await store.put(createQueueItem('u1', 'meal', { name: 'A', calories: 1 }, 'id-aaaaaaaa', 1));
  await store.put(createQueueItem('u1', 'meal', { name: 'B', calories: 1 }, 'id-bbbbbbbb', 2));
  let calls = 0;
  const res = await processQueue({ store, userId: 'u1', send: async () => { calls++; throw netErr(); } });
  assert.deepEqual([res.sent, res.stopped, calls], [0, true, 1]); // second item was not even attempted
  const items = await store.list();
  assert.deepEqual(items.map((i: any) => [i.clientRequestId, i.attempts, i.status]), [['id-aaaaaaaa', 1, 'pending'], ['id-bbbbbbbb', 0, 'pending']]);
  // connection back: both go through, still with their original ids (idempotent on the server)
  const ok = await processQueue({ store, userId: 'u1', send: async () => undefined });
  assert.equal(ok.sent, 2);
  assert.deepEqual(await store.list(), []);
});

test('a permanent rejection marks the item failed with the server message and does not block later items', async () => {
  const store = memoryStore();
  await store.put(createQueueItem('u1', 'meal', { name: 'bad', calories: -1 }, 'id-aaaaaaaa', 1));
  await store.put(createQueueItem('u1', 'water', { amount: 250 }, 'id-bbbbbbbb', 2));
  const res = await processQueue({
    store, userId: 'u1',
    send: async (i: any) => { if (i.kind === 'meal') throw serverErr(400, 'VALIDATION_ERROR'); },
  });
  assert.deepEqual(res, { sent: 1, failed: 1, stopped: false });
  const [failed] = await store.list();
  assert.deepEqual([failed.status, failed.error], ['failed', 'error 400']);
  // failed items are not retried automatically...
  const again = await processQueue({ store, userId: 'u1', send: async () => { throw new Error('must not be called'); } });
  assert.deepEqual(again, { sent: 0, failed: 0, stopped: false });
  // ...until the user retries them
  await retryItem(store, 'id-aaaaaaaa');
  const [retried] = await store.list();
  assert.deepEqual([retried.status, retried.attempts, retried.error], ['pending', 0, undefined]);
});

test('repeated transient failures give up after MAX_ATTEMPTS', async () => {
  const store = memoryStore();
  await store.put(createQueueItem('u1', 'weight', { weight: 70 }, 'id-aaaaaaaa', 1));
  for (let i = 0; i < MAX_ATTEMPTS; i++) await processQueue({ store, userId: 'u1', send: async () => { throw serverErr(500); } });
  const [item] = await store.list();
  assert.equal(item.status, 'failed');
  assert.match(item.error, /Gave up after 5 attempts/);
});

test('items are only replayed for the user who queued them', async () => {
  const store = memoryStore();
  await store.put(createQueueItem('alice', 'meal', { name: 'A', calories: 1 }, 'id-aaaaaaaa', 1));
  await store.put(createQueueItem('bob', 'meal', { name: 'B', calories: 1 }, 'id-bbbbbbbb', 2));
  const sent: string[] = [];
  await processQueue({ store, userId: 'bob', send: async (i: any) => { sent.push(i.userId); } });
  assert.deepEqual(sent, ['bob']);
  assert.deepEqual((await store.list()).map((i: any) => i.userId), ['alice']); // alice's item is untouched
});

test('service worker caching rule never caches auth, admin, health or the reminders poll', () => {
  const cfg = fs.readFileSync(path.resolve(__dirname, '../../client/vite.config.ts'), 'utf8');
  const m = /!\/(.+?)\/\.test\(url\.pathname \+ url\.search\)/.exec(cfg);
  assert.ok(m, 'exclusion regex found in vite.config.ts');
  const excluded = new RegExp(m![1]);
  for (const p of ['/api/v1/auth/me', '/api/v1/auth/refresh', '/api/v1/admin/users', '/api/v1/health', '/api/v1/reminders/due']) {
    assert.ok(excluded.test(p), `${p} must not be cached`);
  }
  for (const p of ['/api/v1/meals?date=2026-03-08', '/api/v1/summary?date=2026-03-08', '/api/v1/reminders', '/api/v1/profile', '/api/v1/authors']) {
    assert.ok(!excluded.test(p), `${p} may be cached`);
  }
  assert.match(cfg, /handler: 'NetworkFirst'/);
  assert.match(cfg, /maxEntries: 60/);
  assert.match(cfg, /networkTimeoutSeconds: 4/);
});

test('cache owner: keep only when the recorded owner is the signed-in user', () => {
  assert.equal(q.cacheOwnerAction('u1', 'u1'), 'keep');
  assert.equal(q.cacheOwnerAction('u1', 'u2'), 'clear'); // another user signed in on this browser
  assert.equal(q.cacheOwnerAction(null, 'u1'), 'clear'); // unknown owner (e.g. cache from before this fix, or after a forced logout)
  assert.equal(q.cacheOwnerAction(undefined, 'u1'), 'clear');
  assert.equal(q.cacheOwnerAction('', 'u1'), 'clear');
  assert.equal(q.cacheOwnerAction('u1', null), 'clear'); // nobody signed in
  assert.equal(q.cacheOwnerAction('u1', ''), 'clear');
  assert.equal(q.CACHE_OWNER_KEY, 'kaizen-cache-owner');
});

test('a queued item is never created without a user id', () => {
  for (const bad of ['', '   ', undefined, null, 5]) {
    assert.throws(() => q.createQueueItem(bad, 'water', { amount: 250 }), /signed-in user/);
    assert.equal(q.hasQueueOwner(bad), false);
  }
  assert.equal(q.hasQueueOwner('u1'), true);
  assert.equal(q.createQueueItem('u1', 'water', { amount: 250 }).userId, 'u1');
});
