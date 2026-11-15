import test from 'node:test';
import assert from 'node:assert/strict';
import { loadClientModule } from './helpers/loadClientModule';

const m = loadClientModule('client/src/contexts/sessionCache.ts');

test('the query cache is cleared whenever the signed-in user changes', () => {
  assert.equal(m.shouldClearQueryCache('userA', 'userB'), true); // B signs in in the same tab
  assert.equal(m.shouldClearQueryCache('userA', null), true); // logout / forced logout
  assert.equal(m.shouldClearQueryCache(null, 'userA'), true); // sign-in or register after sign-out (cache must be empty)
  assert.equal(m.shouldClearQueryCache(undefined, 'userA'), true);
});

test('the query cache is kept when the same user is restored or re-asserted', () => {
  assert.equal(m.shouldClearQueryCache('userA', 'userA'), false);
  assert.equal(m.shouldClearQueryCache(null, null), false);
  assert.equal(m.shouldClearQueryCache('', null), false); // blank ids count as nobody
  assert.equal(m.shouldClearQueryCache(undefined, ''), false);
});

test('session-expired event name is stable (the API client dispatches it, AuthProvider listens)', () => {
  assert.equal(m.SESSION_EXPIRED_EVENT, 'kaizen:session-expired');
});
