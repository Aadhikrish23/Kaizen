import test from 'node:test';
import assert from 'node:assert/strict';
import { getJwtSecret, getJwtRefreshSecret, assertSecretsConfigured } from '../src/config/secrets';

const KEYS = ['NODE_ENV', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;

const withEnv = (env: Partial<Record<(typeof KEYS)[number], string>>, fn: () => void) => {
  const saved: Record<string, string | undefined> = {};
  for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
  Object.assign(process.env, env);
  try { fn(); } finally {
    for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  }
};

const LONG = 'a'.repeat(16);

test('production: missing secrets fail fast', () => {
  withEnv({ NODE_ENV: 'production' }, () => {
    assert.throws(() => getJwtSecret(), /JWT_SECRET must be set/);
    assert.throws(() => getJwtRefreshSecret(), /JWT_REFRESH_SECRET must be set/);
    assert.throws(() => assertSecretsConfigured());
  });
});

test('production: secrets shorter than 16 characters (or blank) are rejected, 16 is accepted', () => {
  withEnv({ NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(15), JWT_REFRESH_SECRET: LONG }, () => {
    assert.throws(() => getJwtSecret(), /min 16/);
    assert.equal(getJwtRefreshSecret(), LONG);
  });
  withEnv({ NODE_ENV: 'production', JWT_SECRET: '                ', JWT_REFRESH_SECRET: LONG }, () => {
    assert.throws(() => getJwtSecret()); // whitespace only does not count
  });
  withEnv({ NODE_ENV: 'production', JWT_SECRET: LONG, JWT_REFRESH_SECRET: LONG }, () => {
    assert.doesNotThrow(() => assertSecretsConfigured());
  });
});

test('any NODE_ENV other than development/test/unset is strict (e.g. staging)', () => {
  withEnv({ NODE_ENV: 'staging' }, () => assert.throws(() => getJwtSecret()));
});

test('development, test and UNSET NODE_ENV fall back to insecure dev-only secrets (why NODE_ENV=production must always be set)', () => {
  for (const env of [{ NODE_ENV: 'development' }, { NODE_ENV: 'test' }, {}]) {
    withEnv(env, () => {
      assert.match(getJwtSecret(), /dev_only/);
      assert.match(getJwtRefreshSecret(), /dev_only/);
    });
  }
});
