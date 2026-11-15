import test from 'node:test';
import assert from 'node:assert/strict';
import {
  literalMatcher, ownRecipeFallbackFilter, localFoodFilter, normalizeInstructions, MAX_QUERY_LENGTH, MAX_STEP_LENGTH, MAX_STEPS,
} from '../src/features/externalFood/externalFood.query';
import { externalRecipesQuerySchema, externalFoodsQuerySchema, importRecipeSchema } from '../src/features/externalFood/externalFood.schema';
import { apiRateLimitMax } from '../src/middleware/globalRateLimit';
import { aiLimits } from '../src/middleware/aiRateLimit';
import { remindersLimits } from '../src/middleware/remindersRateLimit';

const OTHER = '64b000000000000000000001';

test('recipe fallback filter is always scoped to the caller and never built without a user', () => {
  const f: any = ownRecipeFallbackFilter('me', 'pie');
  assert.equal(f.userId, 'me');
  assert.ok(f.name instanceof RegExp);
  assert.ok(!JSON.stringify(f).includes(OTHER));
  assert.equal(ownRecipeFallbackFilter(undefined, 'pie'), null);
  assert.equal(ownRecipeFallbackFilter('', 'pie'), null);
  assert.equal(ownRecipeFallbackFilter('me', ''), null);
  assert.equal(ownRecipeFallbackFilter('me', '   '), null);
  assert.equal(ownRecipeFallbackFilter('me', { $ne: 'x' }), null);
  assert.equal(ownRecipeFallbackFilter('me', ['a']), null);
});

test('queries are matched literally: regex operators cannot widen the match, and length is capped', () => {
  assert.equal(literalMatcher('.*')!.test('chicken soup'), false);
  assert.ok(literalMatcher('.*')!.test('a.*b'));
  assert.equal(literalMatcher('^c')!.test('chicken'), false);
  assert.equal(literalMatcher('(a+)+$')!.test('aaaa'), false);
  assert.ok(literalMatcher('Chicken')!.test('grilled chicken'));
  const long = literalMatcher('a'.repeat(500))!;
  assert.equal(long.source.length, MAX_QUERY_LENGTH);
  assert.equal(literalMatcher(undefined), null);
});

test('local food filter: global foods plus the caller\'s own custom foods only, requires a user', () => {
  const f: any = localFoodFilter('me', 'oats');
  assert.deepEqual(f.$and[0], { $or: [{ isCustom: false }, { userId: 'me', isCustom: true }] });
  assert.equal(f.$and[1].$or.length, 2);
  assert.ok(!JSON.stringify(f).includes(OTHER));
  assert.equal(localFoodFilter(undefined, 'oats'), null); // the old code returned everyone's foods without a user
  assert.equal(localFoodFilter('me', '.*')!.$and[1].$or[0].name.test('oats'), false);
});

test('external search query validation: plain strings, bounded', () => {
  const rq = (query: unknown) => externalRecipesQuerySchema.safeParse({ query }).success;
  const fq = (query: unknown) => externalFoodsQuerySchema.safeParse({ query }).success;
  assert.equal(rq({}), true);
  assert.equal(rq({ q: 'chicken', diet: 'vegan', cuisine: 'indian' }), true);
  assert.equal(rq({ q: 'x'.repeat(101) }), false);
  assert.equal(rq({ q: { $ne: 'x' } }), false);
  assert.equal(rq({ q: ['a', 'b'] }), false);
  assert.equal(rq({ q: 'a', diet: 'x'.repeat(51) }), false);
  assert.equal(fq({ q: 'oats' }), true);
  assert.equal(fq({ q: { $regex: '.*' } }), false);
  assert.equal(fq({ q: 'x'.repeat(101) }), false);
});

test('global API limit is configurable via API_RATE_LIMIT_MAX; defaults unchanged; invalid values fall back', () => {
  assert.equal(apiRateLimitMax({ NODE_ENV: 'production' } as any), 100);
  assert.equal(apiRateLimitMax({ NODE_ENV: 'development' } as any), 5000);
  assert.equal(apiRateLimitMax({} as any), 5000);
  assert.equal(apiRateLimitMax({ NODE_ENV: 'production', API_RATE_LIMIT_MAX: '100000' } as any), 100000);
  assert.equal(apiRateLimitMax({ NODE_ENV: 'production', API_RATE_LIMIT_MAX: ' 250 ' } as any), 250);
  for (const bad of ['', 'abc', '0', '-5', '1.5', '10x', '99999999999999999999']) {
    assert.equal(apiRateLimitMax({ NODE_ENV: 'production', API_RATE_LIMIT_MAX: bad } as any), 100, bad);
  }
});

test('the AI and reminders limiters are independent of the global limit setting', () => {
  const prev = process.env.API_RATE_LIMIT_MAX;
  process.env.API_RATE_LIMIT_MAX = '100000';
  try {
    assert.equal(aiLimits().llm.max, 30);
    assert.equal(aiLimits().light.max, 60);
    assert.deepEqual(remindersLimits(), { user: { windowMs: 900000, max: 120 }, ip: { windowMs: 900000, max: 3000 } });
  } finally {
    if (prev === undefined) delete process.env.API_RATE_LIMIT_MAX; else process.env.API_RATE_LIMIT_MAX = prev;
  }
});

test('import: fractional servings and long raw instruction text are accepted by the schema', () => {
  const base = { name: 'Soup', calories: 100, protein: 5, carbs: 10, fat: 2, ingredients: [] as any[] };
  const ok = (b: unknown) => importRecipeSchema.safeParse({ body: b }).success;
  assert.equal(ok({ ...base, servings: 0.5 }), true);
  assert.equal(ok({ ...base, servings: 0 }), false);
  assert.equal(ok({ ...base, servings: -1 }), false);
  assert.equal(ok({ ...base, servings: 1001 }), false);
  assert.equal(ok({ ...base, instructions: ['x'.repeat(20000)] }), true); // no longer a 400
  assert.equal(ok({ ...base, instructions: Array(501).fill('step') }), false);
});

test('normalizeInstructions splits long text at sentences instead of rejecting, and caps the step count', () => {
  assert.deepEqual(normalizeInstructions(['  Mix. ', 'Bake.']), ['Mix.', 'Bake.']);
  assert.deepEqual(normalizeInstructions(undefined), []);
  assert.deepEqual(normalizeInstructions([1, null, '']), []);
  const sentence = 'Stir the pot gently until the sauce thickens. ';
  const long = sentence.repeat(200); // about 9200 characters
  const steps = normalizeInstructions([long]);
  assert.ok(steps.length >= 5);
  assert.ok(steps.every((s) => s.length <= MAX_STEP_LENGTH && s.length > 0));
  assert.ok(steps.slice(0, -1).every((s) => s.endsWith('.'))); // cut at sentence ends
  assert.equal(steps.join(' ').replace(/\s+/g, ' ').length, long.trim().replace(/\s+/g, ' ').length); // nothing lost
  // text with no spaces or sentences is still split (no infinite loop)
  const blob = normalizeInstructions(['x'.repeat(5000)]);
  assert.ok(blob.length >= 3 && blob.every((s) => s.length <= MAX_STEP_LENGTH));
  assert.equal(normalizeInstructions(Array(300).fill('step')).length, MAX_STEPS);
});
