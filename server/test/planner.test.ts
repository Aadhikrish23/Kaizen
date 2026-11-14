import test from 'node:test';
import assert from 'node:assert/strict';
import { inventoryNeedsSetup } from '../src/features/inventory/inventory.service';
import { generateBalancedWeeklyPlan } from '../src/features/planner/engine/weeklyBalanceEngine';
import { buildEquipmentProfile } from '../src/features/planner/engine/inventoryEvaluator';
import { resolveSwapLoad, applyCalibratedWeight } from '../src/features/planner/engine/swapCalibration';
import { pickLogForDate, averageLoggedRpe, evaluateSessionAdaptations } from '../src/features/planner/engine/adaptationEvaluator';

const prefs: any = {
  daysPerWeek: 3,
  sessionDurationMinutes: 45,
  splitStyle: 'full_body',
  experienceLevel: 'beginner',
  targetFocus: 'general_fitness',
  preferredDays: ['Monday', 'Wednesday', 'Friday'],
};

const dumbbells = [{ id: 'db', type: 'dumbbell', name: 'Dumbbells', availableWeightsKg: [5, 10, 15, 20] }];

test('inventoryNeedsSetup: only an explicit confirmed=false needs setup; legacy rows count as confirmed', () => {
  assert.equal(inventoryNeedsSetup({ confirmed: false }), true);
  assert.equal(inventoryNeedsSetup({ confirmed: true }), false);
  assert.equal(inventoryNeedsSetup({}), false); // legacy inventory created before the flag
  assert.equal(inventoryNeedsSetup(null), false);
});

test('an empty inventory yields a bodyweight-only plan with no invented loads', () => {
  const { schedule } = generateBalancedWeeklyPlan(prefs, [], 70, []);
  const exercises = schedule.flatMap((d: any) => d.exercises);
  assert.ok(exercises.length > 0);
  for (const ex of exercises) {
    assert.equal(ex.equipment, 'bodyweight', `${ex.exerciseName} needs equipment`);
    assert.ok(!ex.suggestedWeightKg, `${ex.exerciseName} has a load`);
  }
});

test('resolveSwapLoad never invents a load', () => {
  assert.deepEqual(resolveSwapLoad('dumbbell'), { suggestedWeightKg: undefined, needsCalibration: true });
  assert.deepEqual(resolveSwapLoad('barbell', 0), { suggestedWeightKg: undefined, needsCalibration: true });
  assert.deepEqual(resolveSwapLoad('machine'), { suggestedWeightKg: undefined, needsCalibration: true });
  assert.deepEqual(resolveSwapLoad('dumbbell', 12.5), { suggestedWeightKg: 12.5, needsCalibration: false });
  assert.deepEqual(resolveSwapLoad('bodyweight'), { suggestedWeightKg: 0, needsCalibration: false });
});

test('applyCalibratedWeight sets the load only on exercises awaiting calibration', () => {
  const schedule: any[] = [
    { exercises: [
      { exerciseName: 'Cable Row', needsCalibration: true },
      { exerciseName: 'cable row ', needsCalibration: true },
      { exerciseName: 'Cable Row', needsCalibration: false, suggestedWeightKg: 30 },
      { exerciseName: 'Squat', needsCalibration: true },
    ] },
  ];
  assert.equal(applyCalibratedWeight(schedule, 'Cable Row', 0), false);
  assert.equal(applyCalibratedWeight(schedule, 'Cable Row', 25), true);
  const ex = schedule[0].exercises;
  assert.deepEqual([ex[0].suggestedWeightKg, ex[0].needsCalibration], [25, false]);
  assert.deepEqual([ex[1].suggestedWeightKg, ex[1].needsCalibration], [25, false]);
  assert.equal(ex[2].suggestedWeightKg, 30); // already calibrated: untouched
  assert.equal(ex[3].suggestedWeightKg, undefined);
  assert.equal(applyCalibratedWeight(schedule, 'Cable Row', 40), false); // nothing left to calibrate
});

test('averageLoggedRpe uses only completed sets with a logged RPE', () => {
  assert.equal(averageLoggedRpe([{ reps: 10, weightKg: 10, completed: true }]), undefined);
  assert.equal(averageLoggedRpe([{ reps: 10, weightKg: 10, completed: false, rpe: 9 }]), undefined);
  assert.equal(
    averageLoggedRpe([
      { reps: 10, weightKg: 10, completed: true, rpe: 7 },
      { reps: 10, weightKg: 10, completed: true, rpe: 8 },
      { reps: 10, weightKg: 10, completed: true },
    ]),
    7.5
  );
});

test('adaptation for an older date ignores newer logs and reports the real RPE', () => {
  const { schedule } = generateBalancedWeeklyPlan(prefs, dumbbells, 70, []);
  const target = (schedule as any[]).flatMap((d) => d.exercises).find((e) => e.equipment === 'dumbbell');
  assert.ok(target, 'plan should contain a dumbbell exercise');
  const profile = buildEquipmentProfile(dumbbells);
  const setsOf = (reps: number, rpe: number | undefined) =>
    Array.from({ length: 3 }, (_, i) => ({ setNumber: i + 1, reps, weightKg: target.suggestedWeightKg || 10, rpe, completed: true }));

  const logs = [
    { date: '2026-03-10', exercises: [{ exerciseName: target.exerciseName, sets: setsOf(4, 10) }] }, // newer, struggling
    { date: '2026-03-05', exercises: [{ exerciseName: target.exerciseName, sets: setsOf(30, 7) }] }, // older, easy
  ];

  const older = pickLogForDate(logs, '2026-03-05');
  assert.equal(older?.date, '2026-03-05');
  assert.equal(pickLogForDate(logs, '2026-03-07'), undefined);

  const fromOlder = evaluateSessionAdaptations(schedule as any, older!.exercises, profile);
  assert.equal(fromOlder.length, 1);
  assert.equal(fromOlder[0].avgLoggedRpe, 7); // actual logged RPE, not a hardcoded 8
  assert.notEqual(fromOlder[0].recommendation.type, 'deload'); // would be a deload if the newer log leaked in

  const fromNewer = evaluateSessionAdaptations(schedule as any, pickLogForDate(logs, '2026-03-10')!.exercises, profile);
  assert.equal(fromNewer[0].recommendation.type, 'deload');
  assert.equal(fromNewer[0].avgLoggedRpe, 10);
});

test('exercises without a logged RPE yield no RPE (nothing is defaulted when recording)', () => {
  const { schedule } = generateBalancedWeeklyPlan(prefs, dumbbells, 70, []);
  const target = (schedule as any[]).flatMap((d) => d.exercises)[0];
  const res = evaluateSessionAdaptations(
    schedule as any,
    [{ exerciseName: target.exerciseName, sets: [{ reps: 10, weightKg: 10, completed: true }] }],
    buildEquipmentProfile(dumbbells)
  );
  assert.equal(res[0].avgLoggedRpe, undefined);
});
