import test from 'node:test';
import assert from 'node:assert/strict';
import { pickAllowed, bodyKeys, SERVER_OWNED_KEYS } from '../src/utils/pickAllowed';
import { workoutRoutineSchema, ROUTINE_KEYS } from '../src/features/routines/routine.schema';
import { createRecipeSchema, updateRecipeSchema, RECIPE_CREATE_KEYS, RECIPE_UPDATE_KEYS } from '../src/features/recipes/recipe.schema';
import { buildRecipeDoc, buildRecipeUpdate } from '../src/features/recipes/recipe.service';
import { measurementLogSchema, MEASUREMENT_KEYS, MEASUREMENT_FIELDS } from '../src/features/measurements/measurement.schema';
import { createFoodSchema, FOOD_CREATE_KEYS } from '../src/features/foods/food.schema';
import { createExerciseSchema, EXERCISE_CREATE_KEYS } from '../src/features/exercises/exercise.schema';
import { createMealLogSchema, MEAL_CREATE_KEYS } from '../src/features/meals/meal.schema';
import { createWaterLogSchema, WATER_CREATE_KEYS } from '../src/features/water/water.schema';
import { importRecipeSchema } from '../src/features/externalFood/externalFood.schema';
import { exerciseScope } from '../src/features/search/search.query';

const ok = (schema: any, body: unknown) => schema.safeParse({ body }).success;
const FOREIGN = '64b000000000000000000001';

test('pickAllowed keeps whitelisted keys only and tolerates junk input', () => {
  assert.deepEqual(pickAllowed({ a: 1, userId: FOREIGN, _id: 'x' }, ['a']), { a: 1 });
  assert.deepEqual(pickAllowed(null, ['a']), {});
  assert.deepEqual(pickAllowed('str', ['a']), {});
  assert.deepEqual(pickAllowed(undefined, ['a']), {});
  assert.deepEqual(bodyKeys(measurementLogSchema as any).sort(), [...MEASUREMENT_KEYS].sort());
});

test('no client-writable key list contains a server-owned field', () => {
  const lists: Record<string, string[]> = {
    ROUTINE_KEYS, RECIPE_CREATE_KEYS, RECIPE_UPDATE_KEYS, MEASUREMENT_KEYS, MEASUREMENT_FIELDS, FOOD_CREATE_KEYS,
    EXERCISE_CREATE_KEYS, MEAL_CREATE_KEYS, WATER_CREATE_KEYS,
  };
  for (const [name, keys] of Object.entries(lists)) {
    for (const forbidden of SERVER_OWNED_KEYS) assert.ok(!keys.includes(forbidden), `${name} allows ${forbidden}`);
  }
});

test('routines: strict body rejects userId, _id, createdAt and other server-owned fields', () => {
  const good = { name: 'Push', description: 'x', exercises: [{ exerciseName: 'Bench', targetMuscle: 'chest', sets: 3, targetReps: '8-12' }] };
  assert.equal(ok(workoutRoutineSchema, good), true);
  assert.equal(ok(workoutRoutineSchema, { name: 'Push' }), true);
  for (const key of ['userId', '_id', 'createdAt', 'updatedAt', '__v', 'role']) {
    assert.equal(ok(workoutRoutineSchema, { ...good, [key]: FOREIGN }), false, key);
  }
  assert.equal(ok(workoutRoutineSchema, { name: 'Push', exercises: [{ ...good.exercises[0], userId: FOREIGN }] }), false);
  assert.equal(ok(workoutRoutineSchema, {}), false); // name still required, as before
  assert.deepEqual(ROUTINE_KEYS.sort(), ['description', 'exercises', 'name']);
});

test('recipes: strict create/update bodies, and the written documents can never carry userId or totals from the body', () => {
  const ing = { name: 'Rice', servingSize: '1 cup', quantity: 1, calories: 200, protein: 4, carbs: 40, fat: 1 };
  const good = { name: 'Rice bowl', description: 'd', ingredients: [ing] };
  assert.equal(ok(createRecipeSchema, good), true);
  assert.equal(ok(updateRecipeSchema, { name: 'Renamed' }), true);
  assert.equal(ok(updateRecipeSchema, { description: 'only' }), true);
  for (const key of ['userId', '_id', 'createdAt', 'totalCalories', 'imageUrl']) {
    assert.equal(ok(createRecipeSchema, { ...good, [key]: FOREIGN }), false, `create ${key}`);
    assert.equal(ok(updateRecipeSchema, { name: 'Renamed', [key]: FOREIGN }), false, `update ${key}`);
  }
  assert.equal(ok(createRecipeSchema, { ...good, ingredients: [{ ...ing, _id: FOREIGN }] }), false);
  assert.equal(ok(createRecipeSchema, { ...good, ingredients: [{ ...ing, foodId: 'abc' }] }), true);

  // defence in depth: even if a raw body reached the service
  const evil = { ...good, userId: FOREIGN, _id: FOREIGN, totalCalories: 1, createdAt: '2000-01-01' };
  const doc: any = buildRecipeDoc('me', evil);
  assert.equal(doc.userId, 'me');
  assert.equal(doc.totalCalories, 200); // recomputed, not taken from the body
  assert.ok(!('_id' in doc) && !('createdAt' in doc));
  const upd = buildRecipeUpdate({ name: 'x', userId: FOREIGN, _id: FOREIGN, totalCalories: 9, ingredients: [ing] });
  assert.ok(!('userId' in upd) && !('_id' in upd));
  assert.equal(upd.totalCalories, 200);
  assert.deepEqual(buildRecipeUpdate({ userId: FOREIGN }), {});
});

test('measurements: strict body; the $set can only contain measurement fields', () => {
  assert.equal(ok(measurementLogSchema, { date: '2026-03-08', weight: 70, chestCm: 100 }), true);
  assert.equal(ok(measurementLogSchema, { date: '2026-03-08' }), true);
  for (const key of ['userId', '_id', 'createdAt', 'updatedAt']) {
    assert.equal(ok(measurementLogSchema, { date: '2026-03-08', [key]: FOREIGN }), false, key);
  }
  assert.deepEqual(MEASUREMENT_FIELDS.sort(), ['armsCm', 'bodyFatPercentage', 'chestCm', 'hipsCm', 'legsCm', 'waistCm', 'weight']);
  assert.deepEqual(pickAllowed({ chestCm: 90, userId: FOREIGN, date: '2026-03-08', _id: 'x' }, MEASUREMENT_FIELDS), { chestCm: 90 });
  // the exact payload the client sends (date plus numeric fields) is accepted
  assert.equal(ok(measurementLogSchema, { date: '2026-03-08', bodyFatPercentage: 18.5, chestCm: 99, waistCm: 80, hipsCm: 95, armsCm: 33, legsCm: 55 }), true);
});

test('create paths for foods, exercises, meals and water whitelist client fields', () => {
  const evil = { userId: FOREIGN, _id: FOREIGN, isCustom: false, createdAt: 'x', source: 'local' };
  assert.deepEqual(pickAllowed({ name: 'Oats', calories: 1, ...evil }, FOOD_CREATE_KEYS), { name: 'Oats', calories: 1 });
  assert.deepEqual(pickAllowed({ name: 'Curl', targetMuscle: 'biceps', ...evil }, EXERCISE_CREATE_KEYS), { name: 'Curl', targetMuscle: 'biceps' });
  assert.deepEqual(pickAllowed({ name: 'Eggs', calories: 70, mealType: 'lunch', time: '12:00', date: '2026-03-08', ...evil }, MEAL_CREATE_KEYS),
    { name: 'Eggs', calories: 70, mealType: 'lunch', time: '12:00', date: '2026-03-08' });
  assert.deepEqual(pickAllowed({ amount: 250, time: '10:00', date: '2026-03-08', ...evil }, WATER_CREATE_KEYS), { amount: 250, time: '10:00', date: '2026-03-08' });
  assert.ok(ok(createFoodSchema, { name: 'Oats', servingSize: '40 g', calories: 150 }));
  assert.ok(ok(createExerciseSchema, { name: 'Curl', targetMuscle: 'biceps' }));
  assert.ok(ok(createMealLogSchema, { name: 'Eggs', calories: 70, mealType: 'lunch', time: '12:00', date: '2026-03-08' }));
  assert.ok(ok(createWaterLogSchema, { amount: 250, time: '10:00', date: '2026-03-08' }));
});

test('external recipe import: missing ingredients and bad types are 400s, real client payloads pass', () => {
  const good = {
    externalId: '1', name: 'Curry', description: 'd', imageUrl: 'https://x/y.jpg', sourceUrl: null, servings: 2, prepTimeMinutes: 30,
    calories: 450, protein: 25, carbs: 40, fat: 15, instructions: ['Cook'], source: 'spoonacular',
    ingredients: [{ name: 'beans', amount: 1, unit: 'cup' }, { name: 'rice', amount: 2, unit: 'cup', calories: 100 }],
  };
  assert.equal(ok(importRecipeSchema, good), true);
  assert.equal(ok(importRecipeSchema, { ...good, ingredients: [] }), true); // empty list is valid (no 500 either)
  const { ingredients, ...noIng } = good;
  assert.equal(ok(importRecipeSchema, noIng), false); // the former 500
  assert.equal(ok(importRecipeSchema, { ...good, ingredients: 'x' }), false);
  assert.equal(ok(importRecipeSchema, { ...good, ingredients: [{ amount: 1 }] }), false);
  assert.equal(ok(importRecipeSchema, { ...good, calories: -1 }), false);
  assert.equal(ok(importRecipeSchema, { ...good, calories: '450' }), false);
  assert.equal(ok(importRecipeSchema, { ...good, calories: Infinity }), false);
  const { calories, ...noCal } = good;
  assert.equal(ok(importRecipeSchema, noCal), false);
  assert.equal(ok(importRecipeSchema, { ...good, name: '' }), false);
  assert.equal(ok(importRecipeSchema, { ...good, ingredients: Array(201).fill({ name: 'x' }) }), false);
  assert.equal(ok(importRecipeSchema, { ...good, userId: FOREIGN }), true); // ignored: the service copies explicit fields only
});

test('swap exercise lookup is scoped to the global catalog plus the caller\'s own custom exercises', () => {
  const scope: any = exerciseScope('me');
  assert.deepEqual(scope.$or, [{ userId: null }, { userId: { $exists: false } }, { userId: 'me' }]);
  assert.ok(!JSON.stringify(scope).includes(FOREIGN));
});
