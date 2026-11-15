import test from 'node:test';
import assert from 'node:assert/strict';
import { loadClientModule } from './helpers/loadClientModule';

const m = loadClientModule('client/src/api/singleFlightRefresh.ts');

const unhandled: unknown[] = [];
process.on('unhandledRejection', (e) => unhandled.push(e));
const tick = () => new Promise((r) => setImmediate(r));

const makeStore = (initial: string | null) => {
  let token = initial;
  return { getToken: () => token, setToken: (t: string) => { token = t; }, clear: () => { token = null; }, peek: () => token };
};

test('bearerToken parses an Authorization header', () => {
  assert.equal(m.bearerToken('Bearer abc.def'), 'abc.def');
  assert.equal(m.bearerToken('bearer x'), 'x');
  assert.equal(m.bearerToken(undefined), null);
  assert.equal(m.bearerToken('Basic abc'), null);
});

test('N parallel 401s cause exactly ONE refresh and every retry gets the new token', async () => {
  const store = makeStore('old');
  let refreshCalls = 0;
  const refresh = m.createTokenRefresher({
    ...store,
    doRefresh: async () => { refreshCalls++; await tick(); return 'new'; },
    onFail: () => assert.fail('must not log out'),
  });
  const results = await Promise.all(Array.from({ length: 12 }, () => refresh('old')));
  assert.equal(refreshCalls, 1);
  assert.deepEqual(new Set(results), new Set(['new']));
  assert.equal(store.peek(), 'new');
  // a straggler that still holds the old token after the refresh finished must not refresh again
  assert.equal(await refresh('old'), 'new');
  assert.equal(refreshCalls, 1);
});

test('a failed refresh rejects every waiter, logs out once, and a later request starts a NEW refresh', async () => {
  const store = makeStore('old');
  let refreshCalls = 0, fails = 0;
  let succeed = false;
  const refresh = m.createTokenRefresher({
    ...store,
    doRefresh: async () => { refreshCalls++; await tick(); if (!succeed) throw new Error('401 refresh'); return 'fresh'; },
    onFail: () => { fails++; store.clear(); },
  });
  const settled = await Promise.allSettled(Array.from({ length: 8 }, () => refresh('old')));
  assert.equal(settled.every((s) => s.status === 'rejected'), true);
  assert.equal(refreshCalls, 1);
  assert.equal(fails, 1); // forced logout exactly once, not once per request
  assert.equal(store.peek(), null);

  // the in-flight promise was reset: a later request (e.g. after logging in again) can refresh
  succeed = true;
  assert.equal(await refresh(null), 'fresh');
  assert.equal(refreshCalls, 2);
  assert.equal(fails, 1);
});

test('a request whose token already changed retries with the stored token without refreshing', async () => {
  const store = makeStore('rotated-by-another-tab');
  const refresh = m.createTokenRefresher({
    ...store,
    doRefresh: async () => { assert.fail('must not refresh'); return 'x'; },
    onFail: () => assert.fail('must not log out'),
  });
  assert.equal(await refresh('stale'), 'rotated-by-another-tab');
});

test('a refresh response without an access token is a failure (logout once)', async () => {
  const store = makeStore('old');
  let fails = 0;
  const refresh = m.createTokenRefresher({ ...store, doRefresh: async () => undefined, onFail: () => { fails++; } });
  await assert.rejects(() => refresh('old'), /access token/);
  assert.equal(fails, 1);
});

test('a throwing logout hook does not mask the refresh error', async () => {
  const store = makeStore('old');
  const refresh = m.createTokenRefresher({ ...store, doRefresh: async () => { throw new Error('boom'); }, onFail: () => { throw new Error('hook'); } });
  await assert.rejects(() => refresh('old'), /boom/);
});

// A tiny FIFO lock shared by two "tabs" (stands in for navigator.locks)
const makeLock = () => {
  let tail: Promise<unknown> = Promise.resolve();
  return <T,>(fn: () => Promise<T>): Promise<T> => {
    const run = tail.then(fn, fn);
    tail = run.catch(() => undefined);
    return run;
  };
};

test('two tabs sharing one lock and one token store refresh only once (the second sees the changed token inside the lock)', async () => {
  const store = makeStore('old'); // localStorage is shared between tabs
  const lock = makeLock();
  let refreshCalls = 0;
  const deps = {
    ...store,
    doRefresh: async () => { refreshCalls++; await tick(); return `new-${refreshCalls}`; },
    onFail: () => assert.fail('must not log out'),
    withLock: lock,
  };
  const tabA = m.createTokenRefresher(deps);
  const tabB = m.createTokenRefresher(deps);
  const [a, b] = await Promise.all([tabA('old'), tabB('old')]);
  assert.equal(refreshCalls, 1);
  assert.equal(a, 'new-1');
  assert.equal(b, 'new-1');
});

test('works without a lock (navigator.locks missing)', async () => {
  const store = makeStore('old');
  const refresh = m.createTokenRefresher({ ...store, doRefresh: async () => 'n', onFail: () => {} });
  assert.equal(await refresh('old'), 'n');
});

test('a hung refresh times out, counts as a failure (logout once), releases the lock and a later request can refresh', async () => {
  const store = makeStore('old');
  const lock = makeLock();
  let fails = 0, refreshCalls = 0;
  const refresh = m.createTokenRefresher({
    ...store,
    withLock: lock,
    timeoutMs: 30,
    doRefresh: () => {
      refreshCalls++;
      return refreshCalls === 1 ? new Promise<string>(() => {}) /* never settles */ : Promise.resolve('fresh');
    },
    onFail: () => { fails++; store.clear(); },
  });
  const settled = await Promise.allSettled([refresh('old'), refresh('old'), refresh('old')]);
  assert.equal(settled.every((s) => s.status === 'rejected'), true);
  assert.ok((settled[0] as PromiseRejectedResult).reason instanceof m.RefreshTimeoutError);
  assert.match(String((settled[0] as PromiseRejectedResult).reason.message), /timed out/);
  assert.equal(fails, 1);
  assert.equal(refreshCalls, 1);
  // the lock was released by the timeout: the next refresh (even from another tab sharing the lock) runs and succeeds
  const other = m.createTokenRefresher({ ...store, withLock: lock, timeoutMs: 30, doRefresh: async () => 'fresh', onFail: () => assert.fail('no logout') });
  assert.equal(await other(null), 'fresh');
  assert.equal(await refresh(null), 'fresh');
});

test('a refresh that finishes before the timeout is unaffected and leaves no pending timer behind', async () => {
  const store = makeStore('old');
  const refresh = m.createTokenRefresher({ ...store, timeoutMs: 5000, doRefresh: async () => 'ok', onFail: () => assert.fail('no logout') });
  assert.equal(await refresh('old'), 'ok'); // would hang the test process for 5 s if the timer were not cleared
});

test('a throwing token setter is a refresh failure: onFail runs once and every waiter rejects', async () => {
  let fails = 0;
  const refresh = m.createTokenRefresher({
    getToken: () => 'old',
    setToken: () => { throw new Error('localStorage blocked'); },
    doRefresh: async () => 'new',
    onFail: () => { fails++; },
  });
  const settled = await Promise.allSettled([refresh('old'), refresh('old')]);
  assert.equal(settled.every((s) => s.status === 'rejected'), true);
  assert.equal(fails, 1);
});

test('runAllSteps runs every cleanup step even when one throws and reports the errors', () => {
  const ran: string[] = [];
  const errors = m.runAllSteps([
    () => { throw new Error('removeItem blocked'); },
    () => { ran.push('clearCache'); },
    () => { ran.push('event'); },
  ]);
  assert.deepEqual(ran, ['clearCache', 'event']);
  assert.equal(errors.length, 1);
  assert.deepEqual(m.runAllSteps([() => {}]), []);
});

test('no unhandled rejections were produced by any scenario', async () => {
  await tick();
  assert.deepEqual(unhandled, []);
});
