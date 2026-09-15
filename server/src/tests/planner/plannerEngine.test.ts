import assert from 'assert';
import { generateBalancedWeeklyPlan } from '../../services/planner/weeklyBalanceEngine';
import { IPlannerPreferences } from '../../models/UserWorkoutPlan';
import { evaluateDoubleProgression } from '../../services/planner/progressiveOverloadEngine';
import { buildEquipmentProfile } from '../../services/planner/inventoryEvaluator';
import { calculateSessionDuration } from '../../services/planner/timeBudgetEngine';

console.log('====================================================');
console.log('RUNNING COMPREHENSIVE WORKOUT PLANNER ENGINE TESTS');
console.log('====================================================\n');

let totalPass = 0;
let totalTests = 0;

function runTest(name: string, testFn: () => void) {
  totalTests++;
  try {
    testFn();
    totalPass++;
    console.log(`[PASS] ${name}`);
  } catch (err: any) {
    console.error(`[FAIL] ${name}`);
    console.error(err.message || err);
  }
}

// --------------------------------------------------
// TEST 1: ORIGINAL FAILURE CASE
// Beginner + 5 days + 45 min + dumbbells (4,6,8,10kg) + pullup bar + pushup bars (NO BENCH)
// --------------------------------------------------
runTest('TEST 1: Original Failure Case (5d beginner home dumbbells + pullup/pushup bars, NO bench)', () => {
  const equipment = [
    { type: 'dumbbell', name: 'Adjustable Dumbbells', availableWeightsKg: [4, 6, 8, 10] },
    { type: 'pullup_bar', name: 'Doorway Pull-up Bar' },
    { type: 'other', name: 'Pushup Bars', notes: 'ergonomic pushup handles' }
  ];

  const preferences: IPlannerPreferences = {
    daysPerWeek: 5,
    sessionDurationMinutes: 45,
    splitStyle: 'home_dumbbell',
    experienceLevel: 'beginner',
    targetFocus: 'general_fitness',
  };

  const { schedule, qualityScore, balanceMetrics } = generateBalancedWeeklyPlan(preferences, equipment, 75);

  // 1. Exactly 5 active training days and 2 rest days
  const activeDays = schedule.filter(d => !d.isRestDay);
  const restDays = schedule.filter(d => d.isRestDay);
  assert.strictEqual(activeDays.length, 5, 'Must have exactly 5 workout days');
  assert.strictEqual(restDays.length, 2, 'Must have exactly 2 rest days');

  // 2. Zero bench exercises anywhere in the entire week!
  for (const day of activeDays) {
    for (const ex of day.exercises) {
      assert.ok(
        !ex.exerciseName.toLowerCase().includes('bench press'),
        `Forbidden bench exercise found: ${ex.exerciseName}`
      );
      assert.ok(
        !ex.exerciseName.toLowerCase().includes('incline dumbbell press'),
        `Forbidden incline bench exercise found: ${ex.exerciseName}`
      );
      assert.ok(
        !ex.exerciseName.toLowerCase().includes('(bench-supported)'),
        `Forbidden bench-supported exercise found: ${ex.exerciseName}`
      );
      // Verify coaching cues do not instruct user to place knee on a non-existent bench
      const formTipsText = (ex.formTips || []).join(' ').toLowerCase();
      assert.ok(!formTipsText.includes('on flat bench'), `Form cues must not instruct bench when user has no bench`);
    }
  }

  // 3. Day 3: "Delts, Arms & Hypertrophy" must have balanced shoulder + biceps + triceps
  // (NOT 5 shoulder exercises!)
  const day3 = activeDays.find(d => d.title.includes('Delts, Arms') || d.title.includes('Delts'));
  assert.ok(day3, 'Day 3 Delts & Arms must exist');
  
  const day3Muscles = day3!.exercises.map(e => e.targetMuscle.toLowerCase());
  const hasBiceps = day3Muscles.includes('biceps');
  const hasTriceps = day3Muscles.includes('triceps');
  const hasShoulders = day3Muscles.includes('shoulders');
  assert.ok(hasBiceps, 'Day 3 MUST contain direct bicep exercise (e.g. Bicep Curl / Hammer Curl)');
  assert.ok(hasTriceps, 'Day 3 MUST contain direct tricep exercise (e.g. Tricep Extension / Kickbacks)');
  assert.ok(hasShoulders, 'Day 3 MUST contain shoulder exercise');
  
  // Count anterior pressing exercises on Day 3 (must not stack Shoulder Press + Arnold Press + Front Raise)
  const day3Names = day3!.exercises.map(e => e.exerciseName.toLowerCase());
  const overheadPresses = day3Names.filter(n => n.includes('shoulder press') || n.includes('arnold'));
  assert.ok(overheadPresses.length <= 1, 'Day 3 must not stack redundant overhead presses');

  // 4. Bulgarian Split Squat and Lunges must NOT repeat on Day 2, Day 5, and Day 6
  let bssCount = 0;
  let lungeCount = 0;
  for (const day of activeDays) {
    for (const ex of day.exercises) {
      if (ex.exerciseName.includes('Bulgarian Split Squat')) bssCount++;
      if (ex.exerciseName.includes('Walking Dumbbell Lunges')) lungeCount++;
    }
  }
  assert.ok(bssCount <= 1, `Bulgarian Split Squats must not appear more than once (actual: ${bssCount})`);
  assert.ok(lungeCount <= 1, `Walking Lunges must not appear more than once (actual: ${lungeCount})`);

  // 5. Day 2: Lower Body Resilience must include Dumbbell Goblet Squat and Romanian Deadlift (Hinge)
  const day2 = activeDays.find(d => d.title.includes('Lower Body'));
  assert.ok(day2, 'Day 2 Lower Body must exist');
  const day2Names = day2!.exercises.map(e => e.exerciseName.toLowerCase());
  assert.ok(
    day2Names.some(n => n.includes('goblet squat') || n.includes('squat')),
    'Day 2 must include bilateral squat (e.g. Goblet Squat)'
  );
  assert.ok(
    day2Names.some(n => n.includes('deadlift') || n.includes('rdl')),
    'Day 2 must include hip-hinge / Romanian deadlift'
  );

  // 6. Day 5: Compound Conditioning & Core must have actual conditioning structure
  const day5 = activeDays.find(d => d.title.includes('Conditioning'));
  assert.ok(day5, 'Day 5 Conditioning session must exist');
  assert.ok(
    day5!.focus.includes('Circuit Protocol') || day5!.focus.includes('Interval') || day5!.focus.includes('conditioning'),
    'Day 5 focus must declare conditioning structure'
  );

  // 7. Pull-Up Prescription for Beginner must be calibrated (e.g. 5 reps with guidance, NOT blind 3x10)
  for (const day of activeDays) {
    for (const ex of day.exercises) {
      if (ex.exerciseName.toLowerCase().includes('pull-up')) {
        assert.ok(ex.targetReps <= 6, `Beginner pull-ups must be capped to realistic capacity (actual: ${ex.targetReps})`);
        assert.ok(ex.notes && ex.notes.includes('Guidance'), `Beginner pull-ups must include coaching guidance/regression notes`);
      }
    }
  }

  // 8. Planks must be time-based (e.g. 35s), not 3x10 reps
  for (const day of activeDays) {
    for (const ex of day.exercises) {
      if (ex.exerciseName.toLowerCase().includes('plank')) {
        assert.ok(
          ex.notes?.includes('Time-based') || ex.notes?.includes('seconds'),
          'Plank must be explicitly designated as time-based hold'
        );
        assert.ok(ex.targetReps >= 20, `Plank duration should be timed (actual: ${ex.targetReps}s)`);
      }
    }
  }

  // 9. Plan Quality Score must be >= 90/100
  assert.ok(
    qualityScore.overallScore >= 90,
    `Overall Plan Quality Score must be high (actual: ${qualityScore.overallScore}/100)`
  );
  assert.strictEqual(qualityScore.equipmentComplianceScore, 100, 'Equipment compliance must be 100%');
});

// --------------------------------------------------
// TEST 2: BEGINNER + 3 DAYS/WEEK (FULL BODY)
// --------------------------------------------------
runTest('TEST 2: Beginner + 3 days/week Full Body', () => {
  const preferences: IPlannerPreferences = {
    daysPerWeek: 3,
    sessionDurationMinutes: 45,
    splitStyle: 'full_body',
    experienceLevel: 'beginner',
    targetFocus: 'general_fitness',
  };

  const { schedule, qualityScore, balanceMetrics } = generateBalancedWeeklyPlan(preferences, [{ type: 'dumbbell', availableWeightsKg: [5, 10, 15] }]);
  const activeDays = schedule.filter(d => !d.isRestDay);

  assert.strictEqual(activeDays.length, 3, 'Must have exactly 3 training days');
  assert.ok(balanceMetrics.pushPullRatio >= 0.75 && balanceMetrics.pushPullRatio <= 1.35, 'Push/Pull ratio must be balanced');
  assert.ok(qualityScore.overallScore >= 85, 'Plan quality score must be >= 85');
});

// --------------------------------------------------
// TEST 3: INTERMEDIATE + 5 DAYS/WEEK (UPPER/LOWER)
// --------------------------------------------------
runTest('TEST 3: Intermediate + 5 days/week Upper/Lower', () => {
  const equipment = [
    { type: 'barbell', barbellWeightKg: 20 },
    { type: 'bench', name: 'Flat Bench' },
    { type: 'dumbbell', availableWeightsKg: [10, 15, 20, 25] },
    { type: 'pullup_bar', name: 'Pull-up Bar' }
  ];

  const preferences: IPlannerPreferences = {
    daysPerWeek: 5,
    sessionDurationMinutes: 50,
    splitStyle: 'upper_lower',
    experienceLevel: 'intermediate',
    targetFocus: 'hypertrophy',
  };

  const { schedule, qualityScore } = generateBalancedWeeklyPlan(preferences, equipment, 80);
  const activeDays = schedule.filter(d => !d.isRestDay);

  assert.strictEqual(activeDays.length, 5, 'Must have exactly 5 workout days');
  assert.strictEqual(qualityScore.equipmentComplianceScore, 100, 'All equipment must be fully compliant');
});

// --------------------------------------------------
// TEST 4: HYPERTROPHY GOAL (VOLUME & REP CALIBRATION)
// --------------------------------------------------
runTest('TEST 4: Hypertrophy Goal Calibration', () => {
  const equipment = [{ type: 'dumbbell', availableWeightsKg: [6, 8, 10, 12, 14] }, { type: 'bench' }];
  const preferences: IPlannerPreferences = {
    daysPerWeek: 4,
    sessionDurationMinutes: 60,
    splitStyle: 'upper_lower',
    experienceLevel: 'intermediate',
    targetFocus: 'hypertrophy',
  };

  const { schedule, balanceMetrics } = generateBalancedWeeklyPlan(preferences, equipment, 72);
  const activeDays = schedule.filter(d => !d.isRestDay);

  // In 60-min hypertrophy, sets per exercise should be 3-4
  for (const day of activeDays) {
    for (const ex of day.exercises) {
      assert.ok(ex.targetSets >= 3, 'Hypertrophy session should prescribe 3-4 sets');
    }
  }
  assert.ok(balanceMetrics.totalSets >= 45, 'Hypertrophy weekly sets should be substantial');
});

// --------------------------------------------------
// TEST 5: GENERAL FITNESS GOAL
// --------------------------------------------------
runTest('TEST 5: General Fitness Goal Balance', () => {
  const equipment = [{ type: 'dumbbell', availableWeightsKg: [4, 8, 12] }];
  const preferences: IPlannerPreferences = {
    daysPerWeek: 3,
    sessionDurationMinutes: 45,
    splitStyle: 'full_body',
    experienceLevel: 'beginner',
    targetFocus: 'general_fitness',
  };

  const { schedule, qualityScore } = generateBalancedWeeklyPlan(preferences, equipment, 70);
  assert.ok(qualityScore.overallScore >= 85, 'General fitness score should be balanced');
});

// --------------------------------------------------
// TEST 6: LIMITED EQUIPMENT (ONLY DUMBBELLS, NO PULLUP BAR, NO BENCH)
// --------------------------------------------------
runTest('TEST 6: Limited Equipment (Dumbbells Only, NO pullup bar, NO bench)', () => {
  const equipment = [{ type: 'dumbbell', availableWeightsKg: [5, 10] }];
  const preferences: IPlannerPreferences = {
    daysPerWeek: 3,
    sessionDurationMinutes: 45,
    splitStyle: 'home_dumbbell',
    experienceLevel: 'beginner',
    targetFocus: 'general_fitness',
  };

  const { schedule } = generateBalancedWeeklyPlan(preferences, equipment, 68);
  const activeDays = schedule.filter(d => !d.isRestDay);

  for (const day of activeDays) {
    for (const ex of day.exercises) {
      assert.ok(!ex.exerciseName.toLowerCase().includes('pull-up'), 'Must not prescribe pull-ups without pull-up bar');
      assert.ok(!ex.exerciseName.toLowerCase().includes('bench'), 'Must not prescribe bench without bench');
    }
  }
});

// --------------------------------------------------
// TEST 7: BODYWEIGHT-ONLY (NO EQUIPMENT AT ALL)
// --------------------------------------------------
runTest('TEST 7: Bodyweight-Only (Zero physical equipment)', () => {
  const equipment: any[] = [];
  const preferences: IPlannerPreferences = {
    daysPerWeek: 3,
    sessionDurationMinutes: 30,
    splitStyle: 'full_body',
    experienceLevel: 'beginner',
    targetFocus: 'general_fitness',
  };

  const { schedule, qualityScore } = generateBalancedWeeklyPlan(preferences, equipment, 65);
  const activeDays = schedule.filter(d => !d.isRestDay);

  for (const day of activeDays) {
    for (const ex of day.exercises) {
      assert.strictEqual(ex.equipment, 'bodyweight', 'All exercises must be bodyweight');
      assert.ok(!ex.exerciseName.toLowerCase().includes('pull-up'), 'Must not require pullup bar when none available');
    }
  }
  assert.strictEqual(qualityScore.equipmentComplianceScore, 100, 'Equipment compliance must be 100%');
});

// --------------------------------------------------
// TEST 8: PROGRESSION WITH AVAILABLE DUMBBELL INVENTORY
// User completes 12,12,12 @ RPE 7.5 on 6kg DB -> should increase to 8kg (next in inventory)
// --------------------------------------------------
runTest('TEST 8: Progressive Overload Step-Up to Next Available Dumbbell', () => {
  const profile = buildEquipmentProfile([
    { type: 'dumbbell', availableWeightsKg: [4, 6, 8, 10] }
  ]);

  const evalData = {
    exerciseName: 'Dumbbell Floor Press',
    equipment: 'dumbbell',
    currentPrescribedWeightKg: 6,
    currentPrescribedReps: 12,
    minReps: 8,
    maxReps: 12,
    completedSets: [
      { reps: 12, weightKg: 6, rpe: 7.5, completed: true },
      { reps: 12, weightKg: 6, rpe: 7.5, completed: true },
      { reps: 12, weightKg: 6, rpe: 7.0, completed: true },
    ],
  };

  const rec = evaluateDoubleProgression(evalData, profile);
  assert.strictEqual(rec.type, 'weight_increase', 'Should trigger weight increase');
  assert.strictEqual(rec.newWeightKg, 8, 'Should step up to 8kg (next available in inventory)');
  assert.strictEqual(rec.newTargetReps, 8, 'Should reset reps to bottom of range (8 reps)');
});

// --------------------------------------------------
// TEST 9: PROGRESSION AT MAX DUMBBELL CEILING
// User is already at 10kg (max available in inventory) and hits 12 reps -> density/rep progression!
// --------------------------------------------------
runTest('TEST 9: Density / Rep Progression When Max Dumbbell Weight is Reached', () => {
  const profile = buildEquipmentProfile([
    { type: 'dumbbell', availableWeightsKg: [4, 6, 8, 10] }
  ]);

  const evalData = {
    exerciseName: 'Dumbbell Floor Press',
    equipment: 'dumbbell',
    currentPrescribedWeightKg: 10, // already at max 10kg!
    currentPrescribedReps: 12,
    minReps: 8,
    maxReps: 12,
    completedSets: [
      { reps: 12, weightKg: 10, rpe: 7.5, completed: true },
      { reps: 12, weightKg: 10, rpe: 7.5, completed: true },
      { reps: 12, weightKg: 10, rpe: 8.0, completed: true },
    ],
  };

  const rec = evaluateDoubleProgression(evalData, profile);
  assert.strictEqual(rec.type, 'volume_adjustment', 'Should trigger volume/density adjustment');
  assert.strictEqual(rec.newWeightKg, 10, 'Must NOT demand unavailable 12kg weight');
  assert.ok(rec.newTargetReps > 12, 'Should increase rep target (e.g. 15 reps)');
});

// --------------------------------------------------
// TEST 10: DELOAD / HIGH FATIGUE SAFEGUARD
// User completed sets at RPE 9.5+ or missed reps -> maintain/deload
// --------------------------------------------------
runTest('TEST 10: High Fatigue Deload Safeguard', () => {
  const profile = buildEquipmentProfile([{ type: 'dumbbell', availableWeightsKg: [4, 6, 8, 10] }]);

  const evalData = {
    exerciseName: 'Standing Dumbbell Shoulder Press',
    equipment: 'dumbbell',
    currentPrescribedWeightKg: 8,
    currentPrescribedReps: 10,
    minReps: 8,
    maxReps: 12,
    completedSets: [
      { reps: 8, weightKg: 8, rpe: 9.5, completed: true },
      { reps: 7, weightKg: 8, rpe: 10, completed: true },
      { reps: 6, weightKg: 8, rpe: 10, completed: true },
    ],
  };

  const rec = evaluateDoubleProgression(evalData, profile);
  assert.strictEqual(rec.type, 'deload', 'Should trigger deload/recovery recommendation');
  assert.strictEqual(rec.newTargetReps, 8, 'Should reset reps to minimum threshold');
});

// --------------------------------------------------
// TEST 11: MULTI-WEEK PROGRESSION SIMULATION
// Simulate 4 weeks of training: 8 reps -> 10 reps -> 12 reps -> +2kg & reset to 8 reps
// --------------------------------------------------
runTest('TEST 11: Multi-Week Double Progression Simulation', () => {
  const profile = buildEquipmentProfile([{ type: 'dumbbell', availableWeightsKg: [4, 6, 8, 10] }]);
  let currentWeight = 6;
  let currentReps = 8;
  const minReps = 8;
  const maxReps = 12;

  // Week 1: user hits 8, 8, 8 @ RPE 7.5
  let rec = evaluateDoubleProgression({
    exerciseName: 'Dumbbell Romanian Deadlift (RDL)',
    equipment: 'dumbbell',
    currentPrescribedWeightKg: currentWeight,
    currentPrescribedReps: currentReps,
    minReps,
    maxReps,
    completedSets: [
      { reps: 8, weightKg: currentWeight, rpe: 7.5, completed: true },
      { reps: 8, weightKg: currentWeight, rpe: 7.5, completed: true },
      { reps: 8, weightKg: currentWeight, rpe: 7.5, completed: true },
    ],
  }, profile);
  assert.strictEqual(rec.newWeightKg, 6, 'Week 1: should maintain 6kg');
  assert.ok(rec.newTargetReps >= 8, 'Week 1: rep progression');
  currentReps = rec.newTargetReps;

  // Week 2: user hits 10, 10, 10 @ RPE 7.5
  rec = evaluateDoubleProgression({
    exerciseName: 'Dumbbell Romanian Deadlift (RDL)',
    equipment: 'dumbbell',
    currentPrescribedWeightKg: currentWeight,
    currentPrescribedReps: currentReps,
    minReps,
    maxReps,
    completedSets: [
      { reps: 10, weightKg: currentWeight, rpe: 7.5, completed: true },
      { reps: 10, weightKg: currentWeight, rpe: 7.5, completed: true },
      { reps: 10, weightKg: currentWeight, rpe: 7.5, completed: true },
    ],
  }, profile);
  assert.strictEqual(rec.newWeightKg, 6, 'Week 2: should maintain 6kg');
  currentReps = rec.newTargetReps;

  // Week 3: user achieves 12, 12, 12 @ RPE 7.5 (ceiling hit!)
  rec = evaluateDoubleProgression({
    exerciseName: 'Dumbbell Romanian Deadlift (RDL)',
    equipment: 'dumbbell',
    currentPrescribedWeightKg: currentWeight,
    currentPrescribedReps: currentReps,
    minReps,
    maxReps,
    completedSets: [
      { reps: 12, weightKg: currentWeight, rpe: 7.5, completed: true },
      { reps: 12, weightKg: currentWeight, rpe: 7.5, completed: true },
      { reps: 12, weightKg: currentWeight, rpe: 7.5, completed: true },
    ],
  }, profile);
  assert.strictEqual(rec.type, 'weight_increase', 'Week 3: ceiling hit -> weight increase');
  assert.strictEqual(rec.newWeightKg, 8, 'Week 3: load advances from 6kg to 8kg');
  assert.strictEqual(rec.newTargetReps, 8, 'Week 3: reps reset to 8');
});

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${totalPass} / ${totalTests} TESTS PASSED`);
console.log('====================================================\n');

if (totalPass !== totalTests) {
  process.exit(1);
}
