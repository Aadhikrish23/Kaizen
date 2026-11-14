import test from 'node:test';
import assert from 'node:assert/strict';
import { parseServingSize, per100gFromOff, perServingFrom100g, scaleMacros, portionFactor } from '../src/features/externalFood/nutrition';
import { calculateTotals } from '../src/features/recipes/recipe.service';
import { loadClientModule } from './helpers/loadClientModule';

const { scaleFood, resolveBasis, defaultAmount, amountUnitLabel } = loadClientModule('client/src/utils/nutrition.ts');
const { computeReadiness, readinessTier } = loadClientModule('client/src/features/dashboard/readiness.ts');

test('parseServingSize: numeric g/ml only', () => {
  assert.deepEqual(parseServingSize('30 g'), { qty: 30, unit: 'g' });
  assert.deepEqual(parseServingSize('30g'), { qty: 30, unit: 'g' });
  assert.deepEqual(parseServingSize('1 cup (240 ml)'), { qty: 240, unit: 'ml' });
  assert.deepEqual(parseServingSize('2,5 g'), { qty: 2.5, unit: 'g' });
  assert.equal(parseServingSize('1 slice'), undefined);
  assert.equal(parseServingSize('1 piece'), undefined);
  assert.equal(parseServingSize(''), undefined);
  assert.equal(parseServingSize(undefined), undefined);
  assert.equal(parseServingSize('0 g'), undefined);
});

test('per100gFromOff uses only *_100g fields and keeps decimals', () => {
  const m = per100gFromOff({ 'energy-kcal_100g': 52.4, proteins_100g: 0.4, carbohydrates_100g: 13.8, fat_100g: 0.2, proteins: 99 });
  assert.deepEqual(m, { calories: 52, protein: 0.4, carbs: 13.8, fat: 0.2 });
  // un-suffixed (possibly per-serving) values are ignored
  assert.equal(per100gFromOff({ 'energy-kcal': 200, proteins: 5 }), undefined);
  // kJ fallback
  assert.equal(per100gFromOff({ 'energy-kj_100g': 418.4 })?.calories, 100);
  assert.equal(per100gFromOff(undefined), undefined);
});

test('per-serving is derived only when a numeric serving is known', () => {
  const per100 = { calories: 400, protein: 10, carbs: 50, fat: 15 };
  assert.deepEqual(perServingFrom100g(per100, { qty: 30, unit: 'g' }), { calories: 120, protein: 3, carbs: 15, fat: 4.5 });
  assert.equal(perServingFrom100g(per100, undefined), undefined);
});

test('logging 150 g yields 1.5x the per-100g values', () => {
  const food = { basis: 'per_100g' as const, calories: 200, protein: 10, carbs: 20, fat: 8 };
  assert.deepEqual(scaleFood(food, 150), { calories: 300, protein: 15, carbs: 30, fat: 12 });
  assert.deepEqual(scaleFood(food, 100), { calories: 200, protein: 10, carbs: 20, fat: 8 });
  assert.deepEqual(scaleMacros(food, portionFactor('per_100g', 150)), { calories: 300, protein: 15, carbs: 30, fat: 12 });
});

test('per-serving foods scale by number of servings, not grams', () => {
  const food = { basis: 'per_serving' as const, calories: 95, protein: 0.5, carbs: 25, fat: 0.3 };
  assert.deepEqual(scaleFood(food, 2), { calories: 190, protein: 1, carbs: 50, fat: 0.6 });
  assert.equal(defaultAmount(food), 1);
});

test('legacy openfoodfacts rows without basis are treated as per 100 g', () => {
  assert.equal(resolveBasis({ source: 'openfoodfacts' }), 'per_100g');
  assert.equal(resolveBasis({ source: 'local' }), 'per_serving');
  assert.equal(resolveBasis({}), 'per_serving');
  const legacy = { source: 'openfoodfacts', calories: 500, protein: 20, carbs: 60, fat: 20 };
  assert.equal(scaleFood(legacy, 30).calories, 150); // a 30 g serving is not 500 kcal
  assert.equal(defaultAmount(legacy), 100);
  assert.equal(defaultAmount({ ...legacy, servingQty: 30 }), 30);
  assert.equal(amountUnitLabel({ ...legacy, servingUnit: 'ml' }), 'ml');
});

test('recipe totals are not recomputed from ingredients that lack macros', () => {
  assert.equal(calculateTotals([{ name: 'flour' }, { name: 'egg' }]), null);
  assert.deepEqual(
    calculateTotals([{ calories: 100, protein: 5, carbs: 10, fat: 2 }, { calories: 50 }]),
    { totalCalories: 150, totalProtein: 5, totalCarbs: 10, totalFat: 2 }
  );
});

test('readiness: missing inputs give "not enough data", never defaults', () => {
  const r = computeReadiness({});
  assert.equal(r.status, 'insufficient');
  assert.deepEqual(r.missing, ['nutrition', 'hydration', 'workout', 'sleep']);

  const two = computeReadiness({
    nutrition: { totalCalories: 2000, calorieGoal: 2000, meals: [{}] },
    hydration: { totalWater: 2500, waterGoal: 2500 },
  });
  assert.equal(two.status, 'insufficient');
  assert.deepEqual(two.missing, ['workout', 'sleep']);

  // no meals logged => nutrition is missing even though goal exists
  const noMeals = computeReadiness({ nutrition: { totalCalories: 0, calorieGoal: 2000, meals: [] } });
  assert.ok(noMeals.missing.includes('nutrition'));
});

test('readiness: score averages only logged inputs and tier derives from score', () => {
  const r = computeReadiness({
    nutrition: { totalCalories: 1000, calorieGoal: 2000, meals: [{}] }, // 50
    hydration: { totalWater: 3000, waterGoal: 2500 }, // 100 (capped)
    sleep: { logged: true, recoveryScore: 60 },
  });
  assert.equal(r.status, 'ok');
  if (r.status === 'ok') {
    assert.equal(r.score, 70);
    assert.equal(r.tier, 2);
    assert.equal(r.label, 'Strong');
    assert.deepEqual(r.missing, ['workout']);
  }
  const full = computeReadiness({
    nutrition: { totalCalories: 2000, calorieGoal: 2000, meals: [{}] },
    hydration: { totalWater: 2500, waterGoal: 2500 },
    strength: { workoutCompleted: true },
    sleep: { logged: true, recoveryScore: 90 },
  });
  assert.equal(full.status === 'ok' && full.tier, 1);
  assert.deepEqual(readinessTier(49), { tier: 4, label: 'Needs Attention' });
  assert.deepEqual(readinessTier(50), { tier: 3, label: 'Building' });
  assert.deepEqual(readinessTier(85), { tier: 1, label: 'Prime Condition' });
});
