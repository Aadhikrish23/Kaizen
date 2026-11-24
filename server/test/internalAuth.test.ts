import test from 'node:test';
import assert from 'node:assert/strict';
import { isInternalRequest, INTERNAL_HEADER } from '../src/middleware/internalAuth';

const SECRET = 'a-long-shared-secret-123';
const req = (value?: string | string[]) => ({ headers: value === undefined ? {} : { [INTERNAL_HEADER]: value } }) as any;

test('the matching secret is recognised', () => {
  assert.equal(isInternalRequest(req(SECRET), { AI_INTERNAL_TOKEN: SECRET } as any), true);
  assert.equal(isInternalRequest(req(SECRET), { AI_INTERNAL_TOKEN: `  ${SECRET}  ` } as any), true); // env whitespace is trimmed
});

test('a wrong, missing, repeated or different-length value is not', () => {
  const env = { AI_INTERNAL_TOKEN: SECRET } as any;
  assert.equal(isInternalRequest(req('a-long-shared-secret-124'), env), false);
  assert.equal(isInternalRequest(req(SECRET + 'x'), env), false);
  assert.equal(isInternalRequest(req(SECRET.slice(0, -1)), env), false);
  assert.equal(isInternalRequest(req(), env), false);
  assert.equal(isInternalRequest(req([SECRET, SECRET]), env), false);
  assert.equal(isInternalRequest(req(''), env), false);
});

test('the feature is off unless a secret of at least 16 characters is configured', () => {
  assert.equal(isInternalRequest(req('short'), { AI_INTERNAL_TOKEN: 'short' } as any), false);
  assert.equal(isInternalRequest(req(''), { AI_INTERNAL_TOKEN: '' } as any), false);
  assert.equal(isInternalRequest(req('undefined'), {} as any), false);
});
