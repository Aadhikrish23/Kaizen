import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNameMatcher, foodScope, exerciseScope, toFoodResult, toRoutineResult, SEARCH_GROUP_LIMIT } from '../src/features/search/search.query';
import { searchSchema } from '../src/features/search/search.schema';

test('buildNameMatcher trims, collapses spaces and matches case-insensitively', () => {
  const m = buildNameMatcher('  Chicken   BREAST ')!;
  assert.ok(m.test('grilled chicken breast'));
  assert.ok(m.flags.includes('i'));
});

test('buildNameMatcher rejects too short, too long and non-string input', () => {
  assert.equal(buildNameMatcher('a'), null);
  assert.equal(buildNameMatcher('  a '), null);
  assert.equal(buildNameMatcher('x'.repeat(101)), null);
  assert.ok(buildNameMatcher('x'.repeat(100)));
  assert.equal(buildNameMatcher(undefined), null);
  assert.equal(buildNameMatcher({ $ne: 'x' }), null);
  assert.equal(buildNameMatcher(['ab']), null);
});

test('regex metacharacters and operators are matched literally', () => {
  const dot = buildNameMatcher('.*')!;
  assert.equal(dot.test('anything'), false);
  assert.ok(dot.test('a.*b'));
  const group = buildNameMatcher('(a+)+$')!;
  assert.ok(group.test('x(a+)+$y'));
  assert.equal(group.test('aaaa'), false);
  assert.equal(buildNameMatcher('[a-z]+')!.test('abc'), false);
  assert.equal(buildNameMatcher('^abc')!.test('abc'), false);
});

test('per-user scoping: custom rows only for the caller; recipes/routines are filtered by userId in the service', () => {
  assert.deepEqual(foodScope('u1'), { $or: [{ isCustom: false }, { userId: 'u1', isCustom: true }] });
  const ex = exerciseScope('u1') as any;
  assert.deepEqual(ex.$or[2], { userId: 'u1' });
  assert.ok(!JSON.stringify(foodScope('u1')).includes('u2'));
});

test('result mappers expose ids and display fields only', () => {
  const f = toFoodResult({ _id: 'abc', name: 'Oats', brand: 'B', servingSize: '40 g', calories: 150, userId: 'secret', isCustom: true });
  assert.deepEqual(f, { id: 'abc', name: 'Oats', brand: 'B', servingSize: '40 g', calories: 150, basis: undefined });
  assert.deepEqual(toRoutineResult({ _id: 'r', name: 'Push', exercises: [1, 2, 3], userId: 'x' }), { id: 'r', name: 'Push', exercisesCount: 3 });
  assert.equal(SEARCH_GROUP_LIMIT, 8);
});

test('searchSchema: q is a trimmed string of 2..100 characters', () => {
  const ok = (q: unknown) => searchSchema.safeParse({ query: { q } }).success;
  assert.equal(ok('ab'), true);
  assert.equal(ok('  ab  '), true);
  assert.equal(ok(' a '), false);
  assert.equal(ok(''), false);
  assert.equal(ok(undefined), false);
  assert.equal(ok('x'.repeat(101)), false);
  assert.equal(ok({ $ne: 'x' }), false);
  assert.equal(ok(['ab', 'cd']), false);
});
