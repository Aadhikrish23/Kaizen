import test from 'node:test';
import assert from 'node:assert/strict';
import { hashToken, consumeRefreshToken, RefreshTokenStore } from '../src/features/auth/refreshTokenUtils';

// In-memory stand-in whose findOneAndDelete is atomic (like MongoDB's).
const makeStore = (rows: any[]): RefreshTokenStore => ({
  findOneAndDelete: async ({ tokenHash }) => {
    const i = rows.findIndex((r) => r.tokenHash === tokenHash);
    return i === -1 ? null : rows.splice(i, 1)[0];
  },
});

const future = () => new Date(Date.now() + 60_000);

test('hashToken is a deterministic sha256 hex digest that differs from the input', () => {
  const h = hashToken('abc');
  assert.equal(h, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.notEqual(h, 'abc');
  assert.notEqual(hashToken('abd'), h);
});

test('token is consumed once; replay returns null', async () => {
  const store = makeStore([{ tokenHash: hashToken('t1'), user: 'u1', expiresAt: future() }]);
  assert.equal(await consumeRefreshToken(store, 't1'), 'u1');
  assert.equal(await consumeRefreshToken(store, 't1'), null);
});

test('concurrent consumption succeeds exactly once', async () => {
  const store = makeStore([{ tokenHash: hashToken('t2'), user: 'u2', expiresAt: future() }]);
  const results = await Promise.all(Array.from({ length: 10 }, () => consumeRefreshToken(store, 't2')));
  assert.equal(results.filter((r) => r === 'u2').length, 1);
});

test('raw token lookup does not match; expired and revoked tokens are rejected', async () => {
  const store = makeStore([
    { tokenHash: 'raw-value', user: 'u3', expiresAt: future() },
    { tokenHash: hashToken('old'), user: 'u3', expiresAt: new Date(Date.now() - 1000) },
    { tokenHash: hashToken('rev'), user: 'u3', expiresAt: future(), revokedAt: new Date() },
  ]);
  assert.equal(await consumeRefreshToken(store, 'raw-value'), null);
  assert.equal(await consumeRefreshToken(store, 'old'), null);
  assert.equal(await consumeRefreshToken(store, 'rev'), null);
});
