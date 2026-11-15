import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateWeek, WeeklyInputs } from '../src/features/ai/weeklyInsight';
import { buildReport, PERIOD_DAYS, MIN_DAYS_WITH_DATA, periodStart, isReportPeriod } from '../src/features/reports/reports.logic';
import { reportsSchema, isRealDate } from '../src/features/reports/reports.schema';

const targets = { calories: 2000, protein: 150, water: 2500 };
const done = [{ sets: [{ completed: true }] }];
const input = (over: Partial<WeeklyInputs> = {}, days = 7): WeeklyInputs => ({
  endDate: '2026-03-08', days, targets, meals: [], water: [], workouts: [], weights: [], sleep: [], ...over,
});
const report = (period: 'daily' | 'weekly' | 'monthly', over: Partial<WeeklyInputs> = {}) =>
  buildReport(period, aggregateWeek(input(over, PERIOD_DAYS[period])));

test('period windows and thresholds', () => {
  assert.deepEqual(PERIOD_DAYS, { daily: 1, weekly: 7, monthly: 30 });
  assert.deepEqual(MIN_DAYS_WITH_DATA, { daily: 1, weekly: 3, monthly: 7 });
  assert.equal(periodStart('daily', '2026-03-08'), '2026-03-08');
  assert.equal(periodStart('weekly', '2026-03-08'), '2026-03-02');
  assert.equal(periodStart('monthly', '2026-03-08'), '2026-02-07');
  assert.ok(isReportPeriod('weekly') && !isReportPeriod('yearly'));
});

test('nothing logged: explicit not-enough-data statement, no zero-filled numbers', () => {
  const r = report('weekly');
  assert.equal(r.sufficient, false);
  assert.equal(r.daysWithData, 0);
  assert.match(r.notEnoughData!, /Not enough data for a weekly report: you logged on 0 of 7 days \(at least 3 needed\)/);
  assert.equal(r.calories, null);
  assert.equal(r.workouts, null);
  assert.equal(r.protein, null);
  assert.equal(r.water, null);
  assert.equal(r.sleep, null);
  assert.equal(r.weight, null);
  assert.equal(r.days.length, 7);
  assert.ok(r.days.every((d) => d.calories === null && d.waterMl === null)); // chart rows are null, not 0
});

test('a thin week stays "not enough data" even if some numbers exist', () => {
  const r = report('weekly', { meals: [{ date: '2026-03-07', calories: 2500, protein: 100 }, { date: '2026-03-08', calories: 1500, protein: 100 }] });
  assert.equal(r.daysWithData, 2);
  assert.equal(r.sufficient, false);
  assert.equal(r.calories, null);
  assert.equal(r.workouts, null); // even a logged workout is not summarised from a thin sample
});

test('weekly report: averages over logged days only and adherence vs targets', () => {
  const r = report('weekly', {
    meals: [
      { date: '2026-03-05', calories: 1800, protein: 120 },
      { date: '2026-03-06', calories: 2200, protein: 150 },
      { date: '2026-03-07', calories: 2000, protein: 90 },
    ],
    water: [{ date: '2026-03-06', amount: 2000 }, { date: '2026-03-07', amount: 3000 }],
    sleep: [{ date: '2026-03-06', durationMinutes: 450 }, { date: '2026-03-07', durationMinutes: 390 }],
  });
  assert.equal(r.sufficient, true);
  assert.equal(r.notEnoughData, null);
  assert.deepEqual(r.calories, { average: 2000, target: 2000, adherencePct: 100, loggedDays: 3 });
  assert.deepEqual(r.protein, { average: 120, target: 150, adherencePct: 80, loggedDays: 3 });
  assert.deepEqual(r.water, { average: 2500, target: 2500, adherencePct: 100, loggedDays: 2 });
  assert.deepEqual(r.sleep, { averageHours: 7, loggedNights: 2 });
  assert.ok(r.missing.includes('workouts'));
});

test('workouts count performed sessions only; weight change needs two weigh-ins', () => {
  const planned = [{ sets: [{ completed: false }] }];
  const r = report('weekly', {
    meals: [{ date: '2026-03-05', calories: 2000 }, { date: '2026-03-06', calories: 2000 }, { date: '2026-03-07', calories: 2000 }],
    workouts: [
      { date: '2026-03-05', totalVolumeKg: 3000, exercises: done },
      { date: '2026-03-06', totalVolumeKg: 0, exercises: planned }, // planned, not performed
    ],
    weights: [{ date: '2026-03-02', weight: 81 }],
  });
  assert.deepEqual(r.workouts, { count: 1, daysWithWorkout: 1, totalVolumeKg: 3000 });
  assert.equal(r.weight, null); // single weigh-in
  const two = report('weekly', {
    meals: [{ date: '2026-03-05', calories: 2000 }, { date: '2026-03-06', calories: 2000 }, { date: '2026-03-07', calories: 2000 }],
    weights: [{ date: '2026-03-02', weight: 81 }, { date: '2026-03-08', weight: 80.2 }],
  });
  assert.deepEqual(two.weight, { firstKg: 81, lastKg: 80.2, changeKg: -0.8 });
});

test('daily report needs one logged day; monthly needs 7', () => {
  const d = report('daily', { meals: [{ date: '2026-03-08', calories: 1900, protein: 140 }] });
  assert.equal(d.sufficient, true);
  assert.equal(d.daysInPeriod, 1);
  assert.equal(d.calories!.average, 1900);
  assert.equal(d.weight, null);

  const sixDays = Array.from({ length: 6 }, (_, i) => ({ date: `2026-03-0${i + 1}`, calories: 2000 }));
  assert.equal(report('monthly', { meals: sixDays }).sufficient, false);
  const m = report('monthly', { meals: [...sixDays, { date: '2026-03-07', calories: 2000 }] });
  assert.equal(m.sufficient, true);
  assert.equal(m.daysInPeriod, 30);
  assert.equal(m.startDate, '2026-02-07');
  assert.equal(m.calories!.loggedDays, 7);
});

test('report query validation', () => {
  const ok = (query: unknown) => reportsSchema.safeParse({ query }).success;
  assert.equal(ok({ period: 'weekly' }), true);
  assert.equal(ok({ period: 'monthly', date: '2026-03-08' }), true);
  assert.equal(ok({ period: 'yearly' }), false);
  assert.equal(ok({}), false);
  assert.equal(ok({ period: 'daily', date: '2026-02-30' }), false);
  assert.equal(ok({ period: 'daily', date: '08-03-2026' }), false);
  assert.equal(ok({ period: ['daily', 'weekly'] }), false);
  assert.equal(isRealDate('2028-02-29'), true);
  assert.equal(isRealDate('2026-02-29'), false);
});
