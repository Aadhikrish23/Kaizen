import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdempotent, clientRequestIdPattern, isDuplicateKeyError } from '../src/utils/idempotency';
import MealLog from '../src/features/meals/MealLog';
import WaterLog from '../src/features/water/WaterLog';
import WeightLog from '../src/features/weight/WeightLog';
import SleepLog from '../src/features/sleep/SleepLog';
import { createMealLogSchema, MEAL_CREATE_KEYS } from '../src/features/meals/meal.schema';
import { createWaterLogSchema, WATER_CREATE_KEYS } from '../src/features/water/water.schema';
import { upsertWeightSchema } from '../src/features/weight/weight.schema';
import { upsertSleepSchema } from '../src/features/sleep/sleep.schema';
import { pickAllowed } from '../src/utils/pickAllowed';

const ID = '3f2b8a52-7c1d-4a69-9d3e-0b1f2a3c4d5e';

const fakeStore = () => {
  const docs: any[] = [];
  return {
    docs,
    find: (id?: string) => async () => docs.find((d) => d.clientRequestId === id) ?? null,
    create: (doc: any) => async () => { docs.push(doc); return doc; },
  };
};

test('without a clientRequestId every call creates (normal behaviour)', async () => {
  const s = fakeStore();
  const a = await createIdempotent(undefined, s.find(undefined), s.create({ n: 1 }));
  const b = await createIdempotent(undefined, s.find(undefined), s.create({ n: 2 }));
  assert.deepEqual([a.replayed, b.replayed, s.docs.length], [false, false, 2]);
});

test('the same clientRequestId creates once; a replay returns the original document', async () => {
  const s = fakeStore();
  const first = await createIdempotent(ID, s.find(ID), s.create({ clientRequestId: ID, n: 1 }));
  assert.equal(first.replayed, false);
  let createdAgain = false;
  const again = await createIdempotent(ID, s.find(ID), async () => { createdAgain = true; return { clientRequestId: ID, n: 2 }; });
  assert.equal(again.replayed, true);
  assert.equal(createdAgain, false);
  assert.equal(again.doc, first.doc);
  assert.equal(s.docs.length, 1);
  // another id is a different logical write
  await createIdempotent('another-id-12345', s.find('another-id-12345'), s.create({ clientRequestId: 'another-id-12345' }));
  assert.equal(s.docs.length, 2);
});

test('a concurrent replay that loses the race (duplicate key) returns the winner', async () => {
  const winner = { clientRequestId: ID, n: 1 };
  let finds = 0;
  const r = await createIdempotent(
    ID,
    async () => (finds++ === 0 ? null : winner), // first look: nothing; after the duplicate error: the winner
    async () => { throw { code: 11000 }; }
  );
  assert.deepEqual([r.replayed, r.doc], [true, winner]);
  assert.equal(finds, 2);
});

test('other errors, and a duplicate error without a winner, are rethrown', async () => {
  await assert.rejects(createIdempotent(ID, async () => null, async () => { throw new Error('db down'); }), /db down/);
  await assert.rejects(createIdempotent(ID, async () => null, async () => { throw { code: 11000 }; }));
  assert.equal(isDuplicateKeyError({ code: 11000 }), true);
  assert.equal(isDuplicateKeyError({ code: 1 }), false);
  assert.equal(isDuplicateKeyError(null), false);
});

test('clientRequestId format: UUIDs and similar tokens only', () => {
  for (const ok of [ID, 'abcdefgh', 'A_b-c_d-12345678']) assert.ok(clientRequestIdPattern.test(ok), ok);
  for (const bad of ['', 'short', 'has space 12345', 'x'.repeat(65), '$ne12345678', '{"$ne":1}']) assert.ok(!clientRequestIdPattern.test(bad), bad);
});

test('create endpoints accept clientRequestId (deliberately added to the strict whitelists) and reject malformed ones', () => {
  const meal = { name: 'Oats', calories: 300, mealType: 'breakfast', time: '08:00 AM', date: '2026-03-08' };
  const water = { amount: 250, time: '08:00', date: '2026-03-08' };
  const weight = { weight: 70, date: '2026-03-08' };
  const sleep = { date: '2026-03-08', bedtime: '23:00', wakeTime: '07:00' };
  const ok = (schema: any, body: any) => schema.safeParse({ body }).success;
  for (const [schema, body] of [[createMealLogSchema, meal], [createWaterLogSchema, water], [upsertWeightSchema, weight], [upsertSleepSchema, sleep]] as const) {
    assert.equal(ok(schema, body), true);
    assert.equal(ok(schema, { ...body, clientRequestId: ID }), true);
    assert.equal(ok(schema, { ...body, clientRequestId: 'bad id' }), false);
    assert.equal(ok(schema, { ...body, clientRequestId: { $ne: 'x' } }), false);
  }
  assert.ok(MEAL_CREATE_KEYS.includes('clientRequestId') && WATER_CREATE_KEYS.includes('clientRequestId'));
  assert.deepEqual(pickAllowed({ ...meal, clientRequestId: ID, userId: 'x', _id: 'y' }, MEAL_CREATE_KEYS), { ...meal, clientRequestId: ID });
});

test('every log model has a unique partial index on (userId, clientRequestId) so replays cannot duplicate', () => {
  for (const [name, model] of [['MealLog', MealLog], ['WaterLog', WaterLog], ['WeightLog', WeightLog], ['SleepLog', SleepLog]] as const) {
    const idx = (model as any).schema.indexes().find(([keys]: any[]) => keys.clientRequestId === 1 && keys.userId === 1);
    assert.ok(idx, `${name} has the index`);
    assert.equal(idx[1].unique, true);
    // partial (not sparse): a compound sparse index would still index documents without the field and collide on null
    assert.deepEqual(idx[1].partialFilterExpression, { clientRequestId: { $type: 'string' } });
    assert.ok((model as any).schema.path('clientRequestId'), `${name} stores clientRequestId`);
  }
});
