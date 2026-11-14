import test from 'node:test';
import assert from 'node:assert/strict';
import { detectGoalChange, normalizeDate, isFutureDate, computeGoalProgress, GoalProgressInput } from '../src/features/goals/goals.logic';

test('normalizeDate handles Date, string, null and invalid input', () => {
  assert.equal(normalizeDate(new Date('2026-06-01T00:00:00Z')), '2026-06-01');
  assert.equal(normalizeDate('2026-06-01'), '2026-06-01');
  assert.equal(normalizeDate(null), null);
  assert.equal(normalizeDate(undefined), null);
  assert.equal(normalizeDate('not a date'), null);
});

test('detectGoalChange only reports fields present in the patch that differ', () => {
  const before = { goal: 'lose_weight', targetWeightKg: 70, targetDate: '2026-06-01' };
  assert.deepEqual(detectGoalChange(before, {}), []);
  assert.deepEqual(detectGoalChange(before, { name: 'x', heightCm: 180 }), []);
  assert.deepEqual(detectGoalChange(before, { goal: 'lose_weight', targetWeightKg: 70, targetDate: '2026-06-01' }), []);
  assert.deepEqual(detectGoalChange(before, { targetWeightKg: 68 }), ['targetWeightKg']);
  assert.deepEqual(detectGoalChange(before, { goal: 'maintain_weight', targetDate: '2026-09-01' }), ['goal', 'targetDate']);
  assert.deepEqual(detectGoalChange(before, { targetDate: new Date('2026-06-01T00:00:00Z') }), []); // same day as a Date
  assert.deepEqual(detectGoalChange({}, { goal: 'gain_weight' }), ['goal']); // first time
  assert.deepEqual(detectGoalChange({ goal: undefined }, { goal: undefined }), []);
});

test('isFutureDate is strictly after today', () => {
  assert.equal(isFutureDate('2026-03-09', '2026-03-08'), true);
  assert.equal(isFutureDate('2026-03-08', '2026-03-08'), false);
  assert.equal(isFutureDate('2026-03-07', '2026-03-08'), false);
});

const base = (over: Partial<GoalProgressInput> = {}): GoalProgressInput => ({
  startWeightKg: 90, targetWeightKg: 80, targetDate: '2026-06-08', today: '2026-03-08', weighIns: [], ...over,
});

test('no target set or no weigh-ins: honest messages, no numbers invented', () => {
  const none = computeGoalProgress(base({ targetWeightKg: null }));
  assert.equal(none.status, 'no_target');
  assert.equal(none.currentWeightKg, null);
  const noLogs = computeGoalProgress(base());
  assert.equal(noLogs.status, 'not_enough_data');
  assert.equal(noLogs.currentWeightKg, null);
  assert.equal(noLogs.estimatedDate, null);
  assert.equal(noLogs.actualWeeklyChangeKg, null);
});

test('fewer than 2 weigh-ins (or less than a week apart): not enough data for pace, but remaining is shown', () => {
  const one = computeGoalProgress(base({ weighIns: [{ date: '2026-03-08', weight: 88 }] }));
  assert.equal(one.status, 'not_enough_data');
  assert.match(one.message, /2 weigh-ins at least 7 days apart/);
  assert.equal(one.currentWeightKg, 88);
  assert.equal(one.remainingKg, 8);
  assert.equal(one.percentComplete, 20);
  assert.equal(one.estimatedDate, null);
  assert.equal(one.requiredWeeklyChangeKg, -0.61); // 8 kg over 92 days
  const close = computeGoalProgress(base({ weighIns: [{ date: '2026-03-05', weight: 89 }, { date: '2026-03-08', weight: 88.5 }] }));
  assert.equal(close.status, 'not_enough_data'); // only 3 days apart
});

test('losing weight on a steady pace: actual vs required pace and estimated date', () => {
  const r = computeGoalProgress(base({
    weighIns: [{ date: '2026-02-08', weight: 90 }, { date: '2026-02-22', weight: 88.5 }, { date: '2026-03-08', weight: 87 }],
  }));
  assert.equal(r.status, 'ok');
  assert.equal(r.currentWeightKg, 87);
  assert.equal(r.remainingKg, 7);
  assert.equal(r.percentComplete, 30);
  assert.equal(r.actualWeeklyChangeKg, -0.75); // -3 kg over 28 days
  assert.equal(r.requiredWeeklyChangeKg, -0.53); // 7 kg over 92 days
  assert.equal(r.estimatedDate, '2026-05-13'); // ceil(7 / 0.75 * 7) = 66 days after 03-08
  assert.equal(r.onTrack, true);
});

test('too slow: estimated date after the target date means not on track', () => {
  const r = computeGoalProgress(base({
    weighIns: [{ date: '2026-02-08', weight: 90 }, { date: '2026-03-08', weight: 89.6 }],
    targetDate: '2026-04-08',
  }));
  assert.equal(r.status, 'ok');
  assert.equal(r.onTrack, false);
  assert.ok(r.estimatedDate! > '2026-04-08');
});

test('gaining toward a higher target works symmetrically', () => {
  const r = computeGoalProgress(base({
    startWeightKg: 60, targetWeightKg: 66, targetDate: '2026-09-08',
    weighIns: [{ date: '2026-02-08', weight: 60 }, { date: '2026-03-08', weight: 61.4 }],
  }));
  assert.equal(r.status, 'ok');
  assert.equal(r.actualWeeklyChangeKg, 0.35);
  assert.equal(r.percentComplete, 23);
  assert.ok(r.requiredWeeklyChangeKg! > 0);
});

test('moving away and flat are reported honestly without a finish date', () => {
  const away = computeGoalProgress(base({ weighIns: [{ date: '2026-02-08', weight: 88 }, { date: '2026-03-08', weight: 89 }] }));
  assert.equal(away.status, 'moving_away');
  assert.equal(away.estimatedDate, null);
  assert.equal(away.onTrack, false);
  const flat = computeGoalProgress(base({ weighIns: [{ date: '2026-02-08', weight: 88 }, { date: '2026-03-08', weight: 88 }] }));
  assert.equal(flat.status, 'flat');
  assert.equal(flat.estimatedDate, null);
});

test('target reached (either direction) and past or missing target dates', () => {
  const lost = computeGoalProgress(base({ weighIns: [{ date: '2026-03-08', weight: 79.5 }] }));
  assert.equal(lost.status, 'reached');
  assert.equal(lost.percentComplete, 100);
  assert.equal(lost.remainingKg, 0);
  const gained = computeGoalProgress(base({ startWeightKg: 60, targetWeightKg: 65, weighIns: [{ date: '2026-03-08', weight: 65 }] }));
  assert.equal(gained.status, 'reached');
  const noDate = computeGoalProgress(base({ targetDate: null, weighIns: [{ date: '2026-02-08', weight: 90 }, { date: '2026-03-08', weight: 88 }] }));
  assert.equal(noDate.status, 'ok');
  assert.equal(noDate.requiredWeeklyChangeKg, null);
  assert.equal(noDate.onTrack, null);
  const past = computeGoalProgress(base({ targetDate: '2026-03-01', weighIns: [{ date: '2026-02-08', weight: 90 }, { date: '2026-03-08', weight: 88 }] }));
  assert.equal(past.requiredWeeklyChangeKg, null); // the date has passed: no required pace
});

test('only weigh-ins since the goal was set drive the pace; start weight defaults to the first of those', () => {
  const r = computeGoalProgress(base({
    startWeightKg: null, goalSetDate: '2026-02-20',
    weighIns: [{ date: '2026-01-01', weight: 100 }, { date: '2026-02-22', weight: 90 }, { date: '2026-03-08', weight: 88.5 }],
  }));
  assert.equal(r.startWeightKg, 90);
  assert.equal(r.actualWeeklyChangeKg, -0.75); // 1.5 kg over 14 days, not diluted by the January weigh-in
});
