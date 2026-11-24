import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import type { AddressInfo } from 'net';
import { AppError } from '../src/middleware/errorHandler';
import { forwardToAi, mapAiError } from '../src/features/ai/aiProxy.service';

interface Seen { method?: string; url?: string; auth?: string; internal?: string; body?: string }

const withAiService = async (reply: (seen: Seen) => { status: number; body: unknown }, run: (seen: Seen, url: string) => Promise<void>) => {
  const seen: Seen = {};
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      Object.assign(seen, { method: req.method, url: req.url, auth: req.headers.authorization, internal: req.headers['x-kaizen-internal'] as string | undefined, body });
      const r = reply(seen);
      res.writeHead(r.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(r.body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const before = { url: process.env.AI_SERVICE_URL, token: process.env.AI_INTERNAL_TOKEN };
  process.env.AI_SERVICE_URL = url;
  try {
    await run(seen, url);
  } finally {
    for (const [key, value] of [['AI_SERVICE_URL', before.url], ['AI_INTERNAL_TOKEN', before.token]] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await new Promise((resolve) => server.close(resolve));
  }
};

const req = (authorization?: string) => ({ headers: authorization ? { authorization } : {} }) as any;

test('forwards the path, query, body and the user\'s own token', async () => {
  delete process.env.AI_INTERNAL_TOKEN;
  await withAiService(() => ({ status: 200, body: { items: [] } }), async (seen) => {
    const out = await forwardToAi<{ items: unknown[] }>({ method: 'POST', path: '/api/me/parse-food', req: req('Bearer user-token'), body: { text: '2 eggs' }, params: { date: '2026-03-08' }, timeoutMs: 5000 });
    assert.deepEqual(out, { items: [] });
    assert.equal(seen.method, 'POST');
    assert.equal(seen.url, '/api/me/parse-food?date=2026-03-08');
    assert.equal(seen.auth, 'Bearer user-token');
    assert.deepEqual(JSON.parse(seen.body || '{}'), { text: '2 eggs' });
    assert.equal(seen.internal, undefined); // no secret configured: none is sent
  });
});

test('sends the shared server secret only when one of at least 16 characters is configured', async () => {
  await withAiService(() => ({ status: 200, body: {} }), async (seen) => {
    process.env.AI_INTERNAL_TOKEN = 'short';
    await forwardToAi({ method: 'GET', path: '/x', req: req('Bearer t'), timeoutMs: 5000 });
    assert.equal(seen.internal, undefined);
    process.env.AI_INTERNAL_TOKEN = 'a-long-shared-secret-123';
    await forwardToAi({ method: 'GET', path: '/x', req: req('Bearer t'), timeoutMs: 5000 });
    assert.equal(seen.internal, 'a-long-shared-secret-123');
  });
});

test('AI service errors are mapped to this API\'s own error shape', async () => {
  const cases: Array<[number, unknown, number, string]> = [
    [401, { detail: 'Missing bearer token' }, 401, 'UNAUTHORIZED'],
    [403, { detail: { code: 'X', message: 'no' } }, 401, 'UNAUTHORIZED'],
    [404, { detail: { code: 'NOT_FOUND', message: 'nope' } }, 404, 'NOT_FOUND'],
    [429, { detail: { code: 'RATE_LIMITED', message: 'slow down' } }, 429, 'RATE_LIMITED'],
    [422, { detail: [{ loc: ['body', 'message'], msg: 'x' }] }, 400, 'VALIDATION_ERROR'],
    [503, { detail: { code: 'UPSTREAM_UNAVAILABLE', message: 'x' } }, 503, 'AI_UNAVAILABLE'],
    [500, { detail: 'boom stack trace' }, 502, 'AI_UPSTREAM_ERROR'],
  ];
  for (const [status, body, expectStatus, expectCode] of cases) {
    await withAiService(() => ({ status, body }), async () => {
      await assert.rejects(
        () => forwardToAi({ method: 'GET', path: '/x', req: req('Bearer t'), timeoutMs: 5000 }),
        (err: unknown) => err instanceof AppError && err.statusCode === expectStatus && err.code === expectCode,
        `status ${status}`,
      );
    });
  }
});

test('internal error text from the AI service is never passed to the client', async () => {
  await withAiService(() => ({ status: 500, body: { detail: 'Traceback: secret path /srv/app.py' } }), async () => {
    await assert.rejects(() => forwardToAi({ method: 'GET', path: '/x', req: req('Bearer t'), timeoutMs: 5000 }), (err: unknown) => err instanceof AppError && !/Traceback|secret/.test(err.message));
  });
});

test('an unreachable service is AI_UNAVAILABLE', async () => {
  process.env.AI_SERVICE_URL = 'http://127.0.0.1:1'; // nothing listens on port 1
  try {
    await assert.rejects(() => forwardToAi({ method: 'GET', path: '/x', req: req('Bearer t'), timeoutMs: 2000 }), (err: unknown) => err instanceof AppError && err.code === 'AI_UNAVAILABLE' && err.statusCode === 503);
  } finally {
    delete process.env.AI_SERVICE_URL;
  }
});

test('mapAiError keeps an AppError as it is and treats anything else as unavailable', () => {
  const own = new AppError(400, 'X', 'y');
  assert.equal(mapAiError(own), own);
  assert.equal(mapAiError(new Error('socket hang up')).code, 'AI_UNAVAILABLE');
});
