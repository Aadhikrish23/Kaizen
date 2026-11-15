import test from 'node:test';
import assert from 'node:assert/strict';
import { loadClientModule } from './helpers/loadClientModule';

const m = loadClientModule('client/src/api/refreshPolicy.ts');
const should = (url: string | undefined, status = 401, alreadyRetried = false) => m.shouldAttemptRefresh({ status, url, alreadyRetried });

test('a first 401 on a normal API request attempts a refresh', () => {
  for (const url of ['/meals', '/auth/me', '/profile', '/meals?date=2026-01-01', 'http://localhost:5000/api/v1/water']) assert.equal(should(url), true, url);
});

test('auth endpoints never trigger refresh-and-retry (a wrong password must reach the login form untouched)', () => {
  for (const url of ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password',
    '/auth/login?x=1', 'http://localhost:5000/api/v1/auth/login', 'https://api.example.com/api/v1/auth/refresh#h']) {
    assert.equal(should(url), false, url);
  }
});

test('no refresh without a 401, after a retry already happened, or without a response', () => {
  assert.equal(should('/meals', 403), false);
  assert.equal(should('/meals', 500), false);
  assert.equal(m.shouldAttemptRefresh({ url: '/meals' }), false); // network error: no response
  assert.equal(should('/meals', 401, true), false); // no retry loops
  assert.equal(should(undefined), true); // unknown URL on a 401 still behaves like a normal request
});

test('similar-looking paths are not mistaken for auth endpoints', () => {
  assert.equal(should('/authors/login-history'), true);
  assert.equal(should('/auth/me'), true);
});
