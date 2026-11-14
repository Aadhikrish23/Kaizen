import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import { aiLimits, createAiLimiter, userKey, rateLimitedResponse } from '../src/middleware/aiRateLimit';

test('default limits: 30/min for LLM-backed routes, looser for deterministic ones', () => {
  delete process.env.AI_RATE_LIMIT_PER_MIN;
  delete process.env.AI_LIGHT_RATE_LIMIT_PER_MIN;
  assert.deepEqual(aiLimits().llm, { windowMs: 60000, max: 30 });
  assert.deepEqual(aiLimits().light, { windowMs: 60000, max: 60 });
});

test('limits can be overridden from env; invalid values fall back to defaults', () => {
  process.env.AI_RATE_LIMIT_PER_MIN = '5';
  process.env.AI_LIGHT_RATE_LIMIT_PER_MIN = 'abc';
  assert.equal(aiLimits().llm.max, 5);
  assert.equal(aiLimits().light.max, 60);
  delete process.env.AI_RATE_LIMIT_PER_MIN;
  delete process.env.AI_LIGHT_RATE_LIMIT_PER_MIN;
});

test('key is the authenticated user id, falling back to IP', () => {
  assert.equal(userKey({ user: { _id: 'abc' }, ip: '1.2.3.4' } as any), 'user:abc');
  assert.equal(userKey({ user: { id: 'xyz' }, ip: '1.2.3.4' } as any), 'user:xyz');
  assert.equal(userKey({ ip: '1.2.3.4' } as any), 'ip:1.2.3.4');
});

test('429 uses the standard error shape', () => {
  assert.deepEqual(Object.keys(rateLimitedResponse()), ['success', 'error']);
  assert.equal(rateLimitedResponse().success, false);
  assert.equal(rateLimitedResponse().error.code, 'RATE_LIMITED');
});

test('limiter enforces the cap per user and returns 429 JSON', async () => {
  const app = express();
  app.use((req, _res, next) => { (req as any).user = { _id: req.header('x-user') }; next(); });
  app.get('/x', createAiLimiter({ windowMs: 60000, max: 2 }), (_req, res) => res.json({ ok: true }));
  const server = http.createServer(app).listen(0);
  const port = (server.address() as AddressInfo).port;
  const hit = async (user: string) => {
    const res = await fetch(`http://127.0.0.1:${port}/x`, { headers: { 'x-user': user } });
    return { status: res.status, body: await res.json() as any };
  };
  try {
    assert.equal((await hit('a')).status, 200);
    assert.equal((await hit('a')).status, 200);
    const blocked = await hit('a');
    assert.equal(blocked.status, 429);
    assert.deepEqual([blocked.body.success, blocked.body.error.code], [false, 'RATE_LIMITED']);
    assert.equal((await hit('b')).status, 200); // another user has their own budget
  } finally {
    server.close();
  }
});
