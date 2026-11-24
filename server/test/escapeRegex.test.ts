import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeRegex } from '../src/utils/escapeRegex';

test('escapeRegex neutralises regex operators', () => {
  assert.equal(escapeRegex('a.b*c'), 'a\\.b\\*c');
  assert.ok(new RegExp(escapeRegex('(x+)+$')).test('(x+)+$'));
  assert.equal(new RegExp(escapeRegex('.*')).test('anything'), false);
});
