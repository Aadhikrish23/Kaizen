import test from 'node:test';
import assert from 'node:assert/strict';
import { regexParseFood, searchTerms, pickBestFood, resolveAmount, computeNutrition, buildResult, toMl, normalizeFractions, MAX_QUANTITY } from '../src/features/ai/foodParsing';
import { aiParseResponseSchema } from '../src/features/ai/parseFood.service';
import { parseFoodSchema, recommendationsSchema } from '../src/features/ai/ai.schema';
import { CANDIDATE_SORT } from '../src/features/ai/recommendations';
import { escapeRegex } from '../src/utils/escapeRegex';

const item = (o: any) => ({ name: 'x', quantity: 1, unit: 'piece', grams: null, confidence: 0.9, ...o });
const per100 = { name: 'Chicken', basis: 'per_100g' as const, calories: 165, protein: 31, carbs: 0, fat: 3.6 };

test('regex fallback: quantity + unit + name segments', () => {
  const r = regexParseFood('2 rotis and 1 cup dal');
  assert.deepEqual(r.map((i) => [i.name, i.quantity, i.unit]), [['rotis', 2, 'piece'], ['dal', 1, 'cup']]);
  assert.equal(r[0].grams, null);
});

test('regex fallback: weights give grams, glued units, fractions and words', () => {
  const [a, b, c, d] = regexParseFood('150g chicken breast, 0.5 kg rice, 1/2 cup oats, two eggs');
  assert.deepEqual([a.name, a.quantity, a.unit, a.grams], ['chicken breast', 150, 'g', 150]);
  assert.deepEqual([b.name, b.unit, b.grams], ['rice', 'kg', 500]);
  assert.deepEqual([c.name, c.quantity, c.unit], ['oats', 0.5, 'cup']);
  assert.deepEqual([d.name, d.quantity, d.unit], ['eggs', 2, 'piece']);
});

test('regex fallback: no quantity means 1, junk and empty input are dropped', () => {
  assert.deepEqual(regexParseFood('banana').map((i) => [i.name, i.quantity]), [['banana', 1]]);
  assert.deepEqual(regexParseFood('2 apples').map((i) => [i.name, i.quantity]), [['apples', 2]]);
  assert.deepEqual(regexParseFood('   '), []);
  assert.deepEqual(regexParseFood('2 g'), []); // unit without a food name
  assert.equal(regexParseFood('a, '.repeat(40) + 'egg').length <= 20, true);
  assert.ok(regexParseFood('2 apples')[0].confidence < regexParseFood('150 g chicken')[0].confidence + 0.5);
});

test('searchTerms and pickBestFood', () => {
  assert.deepEqual(searchTerms('apples'), ['apples', 'apple']);
  assert.ok(searchTerms('tomatoes').includes('tomato'));
  assert.ok(searchTerms('berries').includes('berry'));
  assert.deepEqual(searchTerms('rice'), ['rice']);
  assert.deepEqual(searchTerms('glass'), ['glass']);
  assert.deepEqual(searchTerms('peaches'), ['peaches', 'peach']);
  const foods = [{ name: 'Apple pie' }, { name: 'Apple' }, { name: 'Green apple juice' }];
  assert.equal(pickBestFood('apple', foods)?.name, 'Apple');
  assert.equal(pickBestFood('pie', foods), pickBestFood('pie', foods));
  assert.equal(pickBestFood('x', []), undefined);
});

test('per-100g food scales by grams (150 g => 1.5x)', () => {
  const n = computeNutrition(item({ name: 'chicken', quantity: 150, unit: 'g', grams: 150 }), per100)!;
  assert.deepEqual(n.nutrition, { calories: 248, protein: 46.5, carbs: 0, fat: 5.4 });
  assert.deepEqual([n.amount, n.amountUnit], [150, 'g']);
});

test('per-100g food with a count unit uses the known serving size, otherwise cannot be scaled', () => {
  const withServing = { ...per100, servingQty: 30, servingUnit: 'g' as const };
  const n = computeNutrition(item({ quantity: 2, unit: 'piece' }), withServing)!;
  assert.equal(n.amount, 60);
  assert.equal(n.nutrition.calories, 99);
  assert.equal(resolveAmount(item({ quantity: 2, unit: 'piece' }), per100), null); // no serving size known: do not guess
});

test('per-serving food scales by servings or by grams over a numeric serving size', () => {
  const food = { name: 'Roti', basis: 'per_serving' as const, servingSize: '1 roti (40 g)', calories: 120, protein: 4, carbs: 20, fat: 3 };
  assert.deepEqual(computeNutrition(item({ quantity: 2, unit: 'piece' }), food)!.nutrition, { calories: 240, protein: 8, carbs: 40, fat: 6 });
  assert.equal(computeNutrition(item({ quantity: 80, unit: 'g', grams: 80 }), food)!.nutrition.calories, 240); // 80 g = 2 servings
  assert.equal(computeNutrition(item({ quantity: 80, unit: 'g', grams: 80 }), { ...food, servingSize: '1 piece' }), null);
});

test('legacy openfoodfacts rows without basis are per 100 g', () => {
  const legacy = { name: 'Biscuit', source: 'openfoodfacts', calories: 500, protein: 6, carbs: 70, fat: 20 };
  assert.equal(computeNutrition(item({ quantity: 30, unit: 'g', grams: 30 }), legacy)!.nutrition.calories, 150);
});

test('buildResult: no match or unconvertible amount yields an estimate with null nutrition', () => {
  const none = buildResult(item({ name: 'unicorn steak' }), undefined);
  assert.deepEqual([none.source, none.nutrition, none.needsConfirmation, none.food], ['estimate', null, true, null]);
  const unconvertible = buildResult(item({ name: 'chicken', quantity: 1, unit: 'piece' }), per100 as any);
  assert.deepEqual([unconvertible.source, unconvertible.nutrition], ['estimate', null]);
  assert.equal(unconvertible.food?.name, 'Chicken'); // match kept so the UI can ask for an amount
  const ok = buildResult(item({ name: 'chicken', quantity: 100, unit: 'g', grams: 100 }), per100 as any);
  assert.deepEqual([ok.source, ok.nutrition?.calories, ok.needsConfirmation], ['database', 165, false]);
});

test('AI output is re-validated: invented nutrition and malformed items are rejected', () => {
  const good = { items: [{ name: 'egg', quantity: 2, unit: 'piece', grams: null, confidence: 0.9 }], model_used: 'm', source: 'x' };
  assert.ok(aiParseResponseSchema.safeParse(good).success);
  assert.equal(aiParseResponseSchema.safeParse({ items: [{ ...good.items[0], calories: 70 }] }).success, false);
  assert.equal(aiParseResponseSchema.safeParse({ items: [] }).success, false);
  assert.equal(aiParseResponseSchema.safeParse({ items: [{ name: 'egg', quantity: 0, unit: 'piece', confidence: 1 }] }).success, false);
  assert.equal(aiParseResponseSchema.safeParse({ items: [{ name: 'egg', quantity: 1, unit: 'piece', confidence: 5 }] }).success, false);
  assert.equal(aiParseResponseSchema.safeParse('garbage').success, false);
});

test('request validation: text 1..500 chars, recommendations query', () => {
  const p = (text: unknown) => parseFoodSchema.safeParse({ body: { text } }).success;
  assert.equal(p(''), false);
  assert.equal(p('   '), false);
  assert.equal(p('2 apples'), true);
  assert.equal(p('x'.repeat(500)), true);
  assert.equal(p('x'.repeat(501)), false);
  assert.equal(p(5), false);
  assert.ok(recommendationsSchema.safeParse({ query: { limit: '5', date: '2026-03-08' } }).success);
  assert.equal(recommendationsSchema.safeParse({ query: { limit: '50' } }).success, false);
  assert.equal(recommendationsSchema.safeParse({ query: { date: 'today' } }).success, false);
});

test('escapeRegex neutralises regex operators', () => {
  assert.equal(escapeRegex('a.b*c'), 'a\\.b\\*c');
  assert.ok(new RegExp(escapeRegex('(x+)+$')).test('(x+)+$'));
  assert.equal(new RegExp(escapeRegex('.*')).test('anything'), false);
});

test('absurd or overflowing quantities are dropped, never Infinity/null in the response', () => {
  for (const text of ['9'.repeat(400) + ' apples', '1e400 apples', '20000 apples', '9999 kg rice', '1/0 cup rice', '99999999999 g rice']) {
    assert.deepEqual(regexParseFood(text), [], text);
  }
  const mixed = regexParseFood('2 apples and ' + '9'.repeat(400) + ' bananas');
  assert.deepEqual(mixed.map((i) => i.name), ['apples']); // the sane item survives
  const json = JSON.parse(JSON.stringify(regexParseFood('2 apples, 150 g chicken')));
  for (const it of json) assert.ok(Number.isFinite(it.quantity) && it.quantity > 0 && it.quantity <= MAX_QUANTITY);
  assert.equal(regexParseFood(MAX_QUANTITY + ' g rice').length, 1); // boundary is accepted
});

test('mixed and unicode fractions parse to the right quantity', () => {
  const q = (t: string) => regexParseFood(t).map((i) => [i.name, i.quantity, i.unit]);
  assert.deepEqual(q('1 1/2 cups rice'), [['rice', 1.5, 'cup']]);
  assert.deepEqual(q('2 3/4 tbsp honey'), [['honey', 2.75, 'tbsp']]);
  assert.deepEqual(q('1/2 cup oats'), [['oats', 0.5, 'cup']]);
  assert.deepEqual(q('1½ cups milk'), [['milk', 1.5, 'cup']]);
  assert.deepEqual(q('1 ½ cups milk'), [['milk', 1.5, 'cup']]);
  assert.deepEqual(q('½ cup oats'), [['oats', 0.5, 'cup']]);
  assert.deepEqual(q('¾ tsp salt'), [['salt', 0.75, 'tsp']]);
  assert.equal(normalizeFractions('1½'), '1 1/2');
  assert.equal(normalizeFractions('½'), '1/2');
  assert.deepEqual(q('1 egg'), [['egg', 1, 'piece']]); // a following non-fraction is not merged
});

test('cup/tbsp/tsp are real volumes, not whole servings', () => {
  assert.equal(toMl('cup', 1), 240);
  assert.equal(toMl('tbsp', 2), 30);
  assert.equal(toMl('tsp', 1.5), 7.5);
  assert.equal(toMl('l', 0.5), 500);
  assert.equal(toMl('piece', 2), null);

  const solid = { name: 'Rice', basis: 'per_100g' as const, calories: 130, protein: 2.7, carbs: 28, fat: 0.3 };
  assert.equal(resolveAmount(item({ quantity: 1, unit: 'cup' }), solid), null); // density unknown: ask the user
  assert.equal(buildResult(item({ name: 'rice', quantity: 1, unit: 'cup' }), solid as any).source, 'estimate');

  const milk = { name: 'Milk', basis: 'per_100g' as const, servingUnit: 'ml' as const, calories: 64, protein: 3.4, carbs: 5, fat: 3.6 };
  assert.deepEqual(resolveAmount(item({ quantity: 1, unit: 'cup' }), milk), { amount: 240, amountUnit: 'ml' });
  assert.equal(computeNutrition(item({ quantity: 1, unit: 'cup' }), milk)!.nutrition.calories, 154); // 2.4 x 64
  assert.deepEqual(resolveAmount(item({ quantity: 2, unit: 'tbsp' }), milk), { amount: 30, amountUnit: 'ml' });

  const drink = { name: 'Juice', basis: 'per_serving' as const, servingSize: '250 ml', calories: 110, protein: 1, carbs: 26, fat: 0 };
  assert.deepEqual(resolveAmount(item({ quantity: 1, unit: 'cup' }), drink), { amount: 0.96, amountUnit: 'serving' });
  const unitless = { ...drink, servingSize: '1 glass' };
  assert.equal(resolveAmount(item({ quantity: 1, unit: 'cup' }), unitless), null);
  // countable units still scale by servings
  assert.deepEqual(resolveAmount(item({ quantity: 2, unit: 'glass' }), unitless), { amount: 2, amountUnit: 'serving' });
});

test('recommendation candidate pools use a deterministic sort', () => {
  assert.deepEqual(CANDIDATE_SORT, { name: 1, _id: 1 });
});
