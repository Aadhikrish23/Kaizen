import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateWeek, heuristicWeeklyInsight, isPerformedWorkout, WeeklyInputs, MIN_DAYS_WITH_DATA } from '../src/features/ai/weeklyInsight';

const targets = { calories: 2000, protein: 150, water: 2500 };
const done = [{ sets: [{ completed: true }] }];
const planned = [{ sets: [{ completed: false }, { completed: false }] }];
const base = (over: Partial<WeeklyInputs> = {}): WeeklyInputs => ({
  endDate: '2026-03-08', targets, meals: [], water: [], workouts: [], weights: [], sleep: [], ...over,
});

test('window is the 7 days ending on endDate, including across a month boundary', () => {
  const a = aggregateWeek(base({ endDate: '2026-03-03' }));
  assert.equal(a.startDate, '2026-02-25');
  assert.equal(a.days.length, 7);
  assert.equal(a.days[0].date, '2026-02-25');
  assert.equal(a.days[6].date, '2026-03-03');
});

test('averages cover only days that have data (missing days are not zeros)', () => {
  const a = aggregateWeek(base({
    meals: [
      { date: '2026-03-06', calories: 1800, protein: 120 },
      { date: '2026-03-06', calories: 400, protein: 30 }, // same day: summed to 2200 / 150
      { date: '2026-03-07', calories: 2000, protein: 100 },
    ],
    water: [{ date: '2026-03-07', amount: 2000 }, { date: '2026-03-07', amount: 500 }],
    sleep: [{ date: '2026-03-07', durationMinutes: 420 }, { date: '2026-03-08', durationMinutes: 480 }],
  }));
  assert.equal(a.avgCalories, 2100);
  assert.equal(a.avgProteinG, 125);
  assert.equal(a.avgWaterMl, 2500);
  assert.equal(a.avgSleepHours, 7.5);
  assert.deepEqual(a.loggedDays, { nutrition: 2, water: 1, sleep: 2, weight: 0, workouts: 0 });
  assert.equal(a.daysWithData, 3);
});

test('nothing logged: all averages are null, insufficient, and every category is listed as missing', () => {
  const a = aggregateWeek(base());
  assert.equal(a.avgCalories, null);
  assert.equal(a.avgSleepHours, null);
  assert.equal(a.weightChangeKg, null);
  assert.equal(a.sufficient, false);
  assert.equal(a.daysWithData, 0);
  assert.equal(a.missing.length, 5);
});

test('weight change needs two weigh-ins; uses first vs last in the window', () => {
  assert.equal(aggregateWeek(base({ weights: [{ date: '2026-03-07', weight: 80 }] })).weightChangeKg, null);
  const a = aggregateWeek(base({ weights: [{ date: '2026-03-02', weight: 81 }, { date: '2026-03-05', weight: 80.4 }, { date: '2026-03-08', weight: 79.6 }] }));
  assert.equal(a.weightChangeKg, -1.4);
});

test('workouts are counted and volume summed inside the window only', () => {
  const a = aggregateWeek(base({
    workouts: [
      { date: '2026-03-03', totalVolumeKg: 4000, exercises: done },
      { date: '2026-03-03', totalVolumeKg: 500, exercises: done },
      { date: '2026-03-07', totalVolumeKg: 3000, exercises: done },
      { date: '2026-02-20', totalVolumeKg: 99999, exercises: done }, // outside the window
    ],
  }));
  assert.equal(a.workoutCount, 3);
  assert.equal(a.workoutDays, 2);
  assert.equal(a.totalVolumeKg, 7500);
});

test('sufficiency threshold: needs at least MIN_DAYS_WITH_DATA days with any log', () => {
  const two = aggregateWeek(base({ meals: [{ date: '2026-03-07', calories: 2000 }, { date: '2026-03-08', calories: 2000 }] }));
  assert.equal(two.sufficient, false);
  const three = aggregateWeek(base({ meals: [{ date: '2026-03-06', calories: 2000 }, { date: '2026-03-07', calories: 2000 }, { date: '2026-03-08', calories: 2000 }] }));
  assert.equal(three.sufficient, true);
  assert.equal(MIN_DAYS_WITH_DATA, 3);
});

test('heuristic insight states missing data instead of faking it', () => {
  const thin = heuristicWeeklyInsight(aggregateWeek(base({ meals: [{ date: '2026-03-08', calories: 2000 }] })));
  assert.match(thin.insight, /^Not enough data/);
  assert.match(thin.insight, /1 of 7 days/);
  assert.ok(thin.highlights.some((h) => /Nothing logged for/.test(h)));
});

test('heuristic insight with enough data uses real numbers and names what is missing', () => {
  const a = aggregateWeek(base({
    meals: [
      { date: '2026-03-05', calories: 2000, protein: 90 },
      { date: '2026-03-06', calories: 2100, protein: 95 },
      { date: '2026-03-07', calories: 1900, protein: 100 },
    ],
    workouts: [{ date: '2026-03-06', totalVolumeKg: 5000, exercises: done }],
  }));
  const r = heuristicWeeklyInsight(a);
  assert.ok(r.highlights.some((h) => h.includes('Average intake 2000 kcal')));
  assert.ok(r.highlights.some((h) => h.includes('Average protein 95 g')));
  assert.ok(r.highlights.some((h) => h.includes('1 workout on 1 day')));
  assert.match(r.insight, /Protein is the gap/); // 95/150 = 63% < 85%
  assert.match(r.insight, /Not logged: water, sleep/);
  assert.ok(!r.highlights.some((h) => /sleep|water/i.test(h) && /Average/.test(h)));
});

test('planned-but-not-performed workouts (only uncompleted sets) do not count', () => {
  assert.equal(isPerformedWorkout({ date: 'd', exercises: planned }), false);
  assert.equal(isPerformedWorkout({ date: 'd', exercises: [] }), false);
  assert.equal(isPerformedWorkout({ date: 'd' }), false);
  assert.equal(isPerformedWorkout({ date: 'd', exercises: [{ sets: [{ completed: false }, { completed: true }] }] }), true);

  const a = aggregateWeek(base({ workouts: [{ date: '2026-03-07', totalVolumeKg: 0, exercises: planned }] }));
  assert.equal(a.workoutCount, 0);
  assert.equal(a.workoutDays, 0);
  assert.equal(a.loggedDays.workouts, 0);
  assert.equal(a.daysWithData, 0);
  assert.ok(a.missing.includes('workouts'));
});

test('activated-but-unperformed plan days cannot push a thin week over the threshold', () => {
  const thin = aggregateWeek(base({
    meals: [{ date: '2026-03-06', calories: 2000 }, { date: '2026-03-07', calories: 2000 }],
    workouts: [{ date: '2026-03-08', exercises: planned }], // planned for the 3rd day, never performed
  }));
  assert.equal(thin.daysWithData, 2);
  assert.equal(thin.sufficient, false);
  const real = aggregateWeek(base({
    meals: [{ date: '2026-03-06', calories: 2000 }, { date: '2026-03-07', calories: 2000 }],
    workouts: [{ date: '2026-03-08', exercises: done }],
  }));
  assert.equal(real.sufficient, true);
});
