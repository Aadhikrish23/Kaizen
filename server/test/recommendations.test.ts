import test from 'node:test';
import assert from 'node:assert/strict';
import { rankMeals, scoreCandidate, foodToCandidate, recipeToCandidate, MealCandidate, Suggestion } from '../src/features/ai/recommendations';

const c = (name: string, calories: number, protein: number, extra: Partial<MealCandidate> = {}): MealCandidate => ({
  id: name, type: 'food', name, servingLabel: '1 serving', calories, protein, carbs: 0, fat: 0, ...extra,
});

const pool = [
  c('Chicken breast', 330, 62),
  c('Greek yogurt', 150, 15),
  c('Rice bowl', 520, 12),
  c('Candy', 400, 1),
  c('Protein shake', 160, 30),
  c('Tiny snack', 30, 2),
  c('Huge pizza', 1400, 50),
];

test('ranks protein-forward items that fit the remaining calories first', async () => {
  const r = await rankMeals(pool, { calories: 400, protein: 60 }, 3);
  assert.deepEqual(r.map((s) => s.name), ['Chicken breast', 'Protein shake', 'Greek yogurt']);
  assert.ok(r[0].score >= r[1].score && r[1].score >= r[2].score);
});

test('excludes candidates over the remaining calories and under the minimum meal size', async () => {
  const r = await rankMeals(pool, { calories: 200, protein: 40 }, 10);
  assert.ok(r.every((s) => s.calories <= 200 && s.calories >= 50));
  assert.deepEqual(r.map((s) => s.name), ['Protein shake', 'Greek yogurt']);
});

test('nothing is suggested when (almost) no calories remain', async () => {
  assert.deepEqual(await rankMeals(pool, { calories: 0, protein: 50 }), []);
  assert.deepEqual(await rankMeals(pool, { calories: 49, protein: 50 }), []);
});

test('when protein target is met the ranking still works on calorie fit and density', async () => {
  const r = await rankMeals(pool, { calories: 600, protein: 0 }, 2);
  assert.equal(r.length, 2);
  assert.ok(r.every((s) => s.calories <= 600));
});

test('reason explains the fit; limit and de-duplication are respected', async () => {
  const dup = [...pool, c('chicken breast', 330, 62, { id: 'dup' })];
  const r = await rankMeals(dup, { calories: 700, protein: 60 }, 2);
  assert.equal(r.length, 2);
  assert.equal(r.filter((s) => s.name.toLowerCase() === 'chicken breast').length, 1);
  assert.match(r[0].reason, /62 g protein/);
  assert.match(r[0].reason, /700 kcal remaining/);
  assert.match(r[0].reason, /60 g remaining protein/);
});

test('ranking is deterministic and scores are bounded', async () => {
  const a = await rankMeals(pool, { calories: 700, protein: 60 }, 5);
  const b = await rankMeals([...pool].reverse(), { calories: 700, protein: 60 }, 5);
  assert.deepEqual(a.map((s) => s.name), b.map((s) => s.name));
  for (const cand of pool) {
    const s = scoreCandidate(cand, { calories: 700, protein: 60 });
    assert.ok(s >= 0 && s <= 1);
  }
});

test('re-rank hook can reorder the list', async () => {
  const reverse = (ranked: Suggestion[]) => [...ranked].reverse();
  const base = await rankMeals(pool, { calories: 700, protein: 60 }, 3);
  const re = await rankMeals(pool, { calories: 700, protein: 60 }, 3, reverse);
  assert.notDeepEqual(re.map((s) => s.name), base.map((s) => s.name));
});

test('foodToCandidate honours the nutrition basis', () => {
  const f100 = foodToCandidate({ _id: 1, name: 'Oats', basis: 'per_100g', servingQty: 40, servingUnit: 'g', calories: 380, protein: 13, carbs: 66, fat: 7 })!;
  assert.deepEqual([f100.servingLabel, f100.calories, f100.protein], ['40 g', 152, 5.2]);
  const noServing = foodToCandidate({ _id: 2, name: 'Chicken', basis: 'per_100g', calories: 165, protein: 31, carbs: 0, fat: 3.6 })!;
  assert.deepEqual([noServing.servingLabel, noServing.calories], ['100 g', 165]);
  const perServing = foodToCandidate({ _id: 3, name: 'Roti', servingSize: '1 roti', calories: 120, protein: 4, carbs: 20, fat: 3 })!;
  assert.deepEqual([perServing.servingLabel, perServing.calories], ['1 roti', 120]);
});

test('recipeToCandidate: manual recipes are per serving of the whole, imported totals are already per serving', () => {
  const manual = recipeToCandidate({ _id: 1, name: 'Stew', servings: 4, totalCalories: 1600, totalProtein: 80, totalCarbs: 100, totalFat: 40, ingredients: [{ calories: 800 }, { calories: 800 }] })!;
  assert.deepEqual([manual.calories, manual.protein], [400, 20]);
  const imported = recipeToCandidate({ _id: 2, name: 'Curry', servings: 2, totalCalories: 450, totalProtein: 25, ingredients: [{ name: 'a' }] })!;
  assert.deepEqual([imported.calories, imported.protein], [450, 25]);
  assert.equal(recipeToCandidate({ _id: 3, name: 'x', ingredients: [] }), null);
});
