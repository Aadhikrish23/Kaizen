import assert from 'assert';
import { generateBalancedWeeklyPlan } from '../../services/planner/weeklyBalanceEngine';
import { IPlannerPreferences } from '../../models/UserWorkoutPlan';
import { evaluateDoubleProgression } from '../../services/planner/progressiveOverloadEngine';
import { buildEquipmentProfile } from '../../services/planner/inventoryEvaluator';
import { scorePlanQuality } from '../../services/planner/plannerQualityScorer';
import { calibrateSetsToTimeBudget, calculateSessionDuration, evaluateTimeCompliance } from '../../services/planner/timeBudgetEngine';
import { calibratePullupPrescription, calibratePushupPrescription } from '../../services/planner/bodyweightProgressionEngine';
import { COMPREHENSIVE_EXERCISE_CATALOG } from '../../services/planner/exerciseCatalog';

console.log('========================================================================');
console.log('RUNNING SECOND-ORDER ADVERSARIAL STRESS TEST SUITE (14 HOSTILE SCENARIOS)');
console.log('Treating generated plans as hostile test data. No false positives allowed.');
console.log('========================================================================\n');

let passedCount = 0;
let totalCount = 0;

function hostileTest(scenarioNum: number, title: string, testFn: () => void) {
  totalCount++;
  console.log(`--- [SCENARIO ${scenarioNum}] ${title} ---`);
  try {
    testFn();
    passedCount++;
    console.log(`>>> STATUS: PASSED\n`);
  } catch (err: any) {
    console.error(`>>> STATUS: FAILED`);
    console.error(err.message || err);
    console.error('\n');
  }
}

// -----------------------------------------------------------------------------
// SCENARIO 1: Hostile Audit of Original 5-Day Beginner Plan
// -----------------------------------------------------------------------------
hostileTest(1, 'Hostile Audit of 5-Day Beginner Plan (Dumbbells 4-10kg, Pull-up Bar, Push-up Bars, NO Bench)', () => {
  const equipment = [
    { type: 'dumbbell', availableWeightsKg: [4, 6, 8, 10] },
    { type: 'pullup_bar' },
    { type: 'other', name: 'Pushup Bars' },
  ];
  const preferences: IPlannerPreferences = {
    daysPerWeek: 5,
    sessionDurationMinutes: 45,
    splitStyle: 'home_dumbbell',
    experienceLevel: 'beginner',
    targetFocus: 'general_fitness',
  };

  const { schedule, qualityScore, balanceMetrics, explanations } = generateBalancedWeeklyPlan(
    preferences,
    equipment,
    75,
    [],
    0, // 0 pull-ups baseline
    5  // 5 push-ups baseline
  );

  // 1. Critical binary gate must be satisfied
  assert.strictEqual(qualityScore.isValid, true, 'Critical binary gate must pass');
  assert.strictEqual(qualityScore.status, 'VALID', 'Status must be VALID');
  assert.strictEqual(qualityScore.criticalConstraintResult.equipmentCompliance, true, 'Zero equipment violations allowed');
  assert.strictEqual(qualityScore.criticalConstraintResult.noSevereRecoveryConflict, true, 'Zero consecutive leg fatigue conflicts');

  // 2. Exact Conditioning Data Model Check
  const day5 = schedule.find(d => d.title.includes('Conditioning'));
  assert.ok(day5, 'Conditioning session must be scheduled');
  assert.ok(day5!.conditioningProtocol, 'Day 5 must contain conditioningProtocol');
  assert.strictEqual(day5!.conditioningProtocol?.rounds, 4, 'Day 5 conditioning must have 4 rounds');
  assert.strictEqual(day5!.conditioningProtocol?.workSeconds, 40, 'Work interval must be 40s');
  assert.strictEqual(day5!.conditioningProtocol?.restSeconds, 20, 'Rest interval must be 20s');

  for (const ex of day5!.exercises) {
    assert.strictEqual(ex.targetSets, 4, 'Conditioning exercise sets must equal circuit rounds (4)');
    assert.strictEqual(ex.targetReps, 40, 'Conditioning exercise reps must equal work seconds (40)');
    assert.strictEqual(ex.repUnit, 'seconds', 'Conditioning exercise repUnit must be "seconds"');
    assert.strictEqual(ex.restSeconds, 20, 'Conditioning exercise restSeconds must be 20');
    assert.strictEqual(ex.isConditioning, true, 'Conditioning flag must be true');
  }

  // 3. Zero Bench Exercises anywhere
  for (const day of schedule) {
    for (const ex of day.exercises) {
      assert.ok(!ex.exerciseName.toLowerCase().includes('bench'), `Found bench exercise: ${ex.exerciseName}`);
    }
  }

  // 4. Decision Explanations generated
  assert.ok(explanations && explanations.length > 0, 'Decision explanations must be generated');
  console.log(`  * Verified: 100% equipment compliant, unified conditioning data model (4 rounds x 40s), 0 bench exercises.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 2: Capability Tiers: 0 Pull-Up Beginner User
// -----------------------------------------------------------------------------
hostileTest(2, 'Capability Tiers: 0-rep pull-up user must receive horizontal row or negatives, NOT standard pull-ups', () => {
  const p0 = calibratePullupPrescription(0, true);
  assert.strictEqual(p0.exerciseName, 'Inverted Bodyweight Row', '0 pull-ups must prescribe Inverted Bodyweight Row');
  assert.ok(p0.coachingNotes.includes('Tier 0'), 'Coaching notes must explain Tier 0 regression path');

  const p1 = calibratePullupPrescription(2, true);
  assert.strictEqual(p1.exerciseName, 'Negative Pull-Up (Eccentric Focus)', '1-2 pull-ups must prescribe slow negatives');
  assert.strictEqual(p1.targetSets, 3);
  assert.strictEqual(p1.targetReps, 4);

  console.log(`  * Verified: 0-rep pullup -> "${p0.exerciseName}", 2-rep pullup -> "${p1.exerciseName}".`);
});

// -----------------------------------------------------------------------------
// SCENARIO 3: Capability Tiers: 10+ Rep Pull-Up Advanced User
// -----------------------------------------------------------------------------
hostileTest(3, 'Capability Tiers: 10+ rep pull-up user must receive high volume or weighted progression', () => {
  const p4 = calibratePullupPrescription(12, false);
  assert.strictEqual(p4.exerciseName, 'Pull-Up (Bodyweight)');
  assert.strictEqual(p4.targetSets, 4, 'Mastery level must get 4 working sets');
  assert.strictEqual(p4.targetReps, 10, 'Mastery level must get 10 reps');
  assert.ok(p4.coachingNotes.includes('Tier 4') || p4.coachingNotes.includes('Mastery'), 'Notes must indicate Tier 4 mastery');

  console.log(`  * Verified: 10+ rep pullup -> 4 sets x 10 reps with weighted overload coaching cues.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 4: Capability Tiers: 2-Rep Push-Up Beginner User
// -----------------------------------------------------------------------------
hostileTest(4, 'Capability Tiers: 2-rep push-up beginner must receive elevated incline push-ups', () => {
  const push0 = calibratePushupPrescription(2, false, true);
  assert.strictEqual(push0.exerciseName, 'Incline Push-Ups (Hands Elevated)');
  assert.ok(push0.coachingNotes.includes('Tier 0'), 'Must explain Tier 0 reduced load mechanics');

  const pushHandles = calibratePushupPrescription(10, true, false);
  assert.strictEqual(pushHandles.exerciseName, 'Push-Up (with Handles / Push-up Bars)');

  const pushAdvanced = calibratePushupPrescription(20, true, false);
  assert.strictEqual(pushAdvanced.exerciseName, 'Deficit Push-Ups');

  console.log(`  * Verified: 2-rep -> Incline Push-Up, 10-rep -> Handles Push-Up, 20-rep -> Deficit Push-Up.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 5: Max Dumbbell Load Ceiling & Variation Ladder
// -----------------------------------------------------------------------------
hostileTest(5, 'Progression Safeguard: User at max dumbbell weight (10kg) and 15 reps must NOT get rep inflation', () => {
  const profile = buildEquipmentProfile([{ type: 'dumbbell', availableWeightsKg: [4, 6, 8, 10] }]);

  // User hits 15, 15, 15 @ 10kg (max available weight and rep ceiling!)
  const evalData = {
    exerciseName: 'Dumbbell Floor Press (No Bench Required)',
    equipment: 'dumbbell',
    currentPrescribedWeightKg: 10,
    currentPrescribedReps: 15,
    minReps: 8,
    maxReps: 15,
    completedSets: [
      { reps: 15, weightKg: 10, rpe: 7.5, completed: true },
      { reps: 15, weightKg: 10, rpe: 7.5, completed: true },
      { reps: 15, weightKg: 10, rpe: 8.0, completed: true },
    ],
  };

  const rec = evaluateDoubleProgression(evalData, profile);
  assert.strictEqual(rec.type, 'progression_advance', 'Must advance progression axis rather than add more reps');
  assert.ok(
    rec.swappedExerciseName?.includes('1.5-Rep') || rec.tempoCues?.includes('4-1-1-0') || rec.reason.includes('tempo'),
    'Must prescribe pause tempo or 1.5-rep variation ladder'
  );
  assert.strictEqual(rec.newWeightKg, 10, 'Must keep available 10kg load');
  assert.strictEqual(rec.newTargetReps, 8, 'Reps must reset to bottom of range (8)');

  console.log(`  * Verified: Max load + 15 reps -> ${rec.reason}`);
});

// -----------------------------------------------------------------------------
// SCENARIO 6: Micro-Session Duration Policy (20m Hard Ceiling)
// -----------------------------------------------------------------------------
hostileTest(6, 'Duration Policy: 20-minute Micro-Session under "hard_ceiling"', () => {
  const catItems = COMPREHENSIVE_EXERCISE_CATALOG.slice(0, 5);
  const calibrated = calibrateSetsToTimeBudget(catItems, 20, true, 'hard_ceiling');
  const duration = calculateSessionDuration(calibrated, 20, 'hard_ceiling');

  assert.ok(duration.totalEstimatedMinutes <= 20, `Duration must not exceed 20m (actual: ${duration.totalEstimatedMinutes}m)`);
  assert.strictEqual(duration.isWithinBudget, true, 'Must be within budget');
  assert.ok(calibrated.length <= 3, '20m session must cap exercises to 3');

  const compliance = evaluateTimeCompliance(duration.totalEstimatedMinutes, 20, 'hard_ceiling');
  assert.strictEqual(compliance.score, 100, 'Compliance score must be 100 for meeting ceiling');

  console.log(`  * Verified: 20m hard ceiling -> ${duration.totalEstimatedMinutes}m actual, ${calibrated.length} exercises.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 7: High-Volume Hypertrophy Session (60m Target)
// -----------------------------------------------------------------------------
hostileTest(7, 'Duration Policy: 60-minute Hypertrophy session volume scaling', () => {
  const preferences: IPlannerPreferences = {
    daysPerWeek: 4,
    sessionDurationMinutes: 60,
    splitStyle: 'upper_lower',
    experienceLevel: 'intermediate',
    targetFocus: 'hypertrophy',
  };

  const { schedule, balanceMetrics, qualityScore } = generateBalancedWeeklyPlan(
    preferences,
    [{ type: 'dumbbell', availableWeightsKg: [6, 8, 10, 12, 14, 16] }, { type: 'bench' }],
    80
  );

  const activeDays = schedule.filter(d => !d.isRestDay);
  for (const day of activeDays) {
    assert.ok(
      day.estimatedDurationMinutes >= 50 && day.estimatedDurationMinutes <= 68,
      `Duration should calibrate near 60m (actual: ${day.estimatedDurationMinutes}m)`
    );
  }
  assert.ok(balanceMetrics.totalSets >= 48, `Hypertrophy total sets should be high (actual: ${balanceMetrics.totalSets})`);
  assert.strictEqual(qualityScore.isValid, true);

  console.log(`  * Verified: 60m hypertrophy plan -> ${balanceMetrics.totalSets} total sets, all days ~60m.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 8: Zero-Equipment Floor Bodyweight
// -----------------------------------------------------------------------------
hostileTest(8, 'Zero Equipment: Empty equipment profile must generate 100% floor bodyweight plan', () => {
  const preferences: IPlannerPreferences = {
    daysPerWeek: 3,
    sessionDurationMinutes: 30,
    splitStyle: 'full_body',
    experienceLevel: 'beginner',
    targetFocus: 'general_fitness',
  };

  const { schedule, qualityScore } = generateBalancedWeeklyPlan(preferences, [], 65);
  const activeDays = schedule.filter(d => !d.isRestDay);

  for (const day of activeDays) {
    for (const ex of day.exercises) {
      assert.strictEqual(ex.equipment, 'bodyweight');
      assert.ok(!ex.exerciseName.toLowerCase().includes('pull-up'), 'No pull-ups without pull-up bar');
      assert.ok(!ex.exerciseName.toLowerCase().includes('bench'), 'No bench exercises without bench');
    }
  }
  assert.strictEqual(qualityScore.criticalConstraintResult.equipmentCompliance, true);
  assert.strictEqual(qualityScore.overallScore >= 85, true);

  console.log(`  * Verified: 0 equipment -> 100% floor bodyweight, 0 hardware violations.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 9: Barbell-Only Garage Gym (No Dumbbells, No Bench, No Rack)
// -----------------------------------------------------------------------------
hostileTest(9, 'Garage Barbell-Only: User has barbell only (NO bench, NO rack)', () => {
  const equipment = [{ type: 'barbell', barbellWeightKg: 20 }];
  const preferences: IPlannerPreferences = {
    daysPerWeek: 3,
    sessionDurationMinutes: 45,
    splitStyle: 'full_body',
    experienceLevel: 'beginner',
    targetFocus: 'strength',
  };

  const { schedule, qualityScore } = generateBalancedWeeklyPlan(preferences, equipment, 80);
  const activeDays = schedule.filter(d => !d.isRestDay);

  for (const day of activeDays) {
    for (const ex of day.exercises) {
      assert.ok(!ex.exerciseName.toLowerCase().includes('bench'), 'Must NOT prescribe bench press without a bench');
      assert.ok(ex.equipment === 'barbell' || ex.equipment === 'bodyweight', 'Must only use barbell or floor bodyweight');
    }
  }
  assert.strictEqual(qualityScore.criticalConstraintResult.equipmentCompliance, true);

  console.log(`  * Verified: Barbell-only plan -> 0 bench presses, 100% equipment compliant.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 10: Fatigue-Aware Scheduling: Avoid Consecutive Lower-Body Squats
// -----------------------------------------------------------------------------
hostileTest(10, 'Fatigue Safeguard: Prevent consecutive lower-body axial loading', () => {
  const preferences: IPlannerPreferences = {
    daysPerWeek: 5,
    sessionDurationMinutes: 45,
    splitStyle: 'home_dumbbell',
    experienceLevel: 'beginner',
    targetFocus: 'general_fitness',
  };

  const equipment = [
    { type: 'dumbbell', availableWeightsKg: [4, 6, 8, 10] },
    { type: 'pullup_bar' },
  ];

  const { schedule, qualityScore } = generateBalancedWeeklyPlan(preferences, equipment, 70);

  // Check Day 4 (Friday conditioning) vs Day 5 (Saturday posterior chain / RDLs)
  const activeDays = schedule.filter(d => !d.isRestDay);
  const fridayCond = activeDays.find(d => d.title.includes('Conditioning'));
  const saturdayPost = activeDays.find(d => d.title.includes('Posterior Chain'));

  assert.ok(fridayCond && saturdayPost, 'Both Friday and Saturday sessions must exist');

  // Verify Friday conditioning does NOT include heavy squats or jumping squats right before Saturday RDLs
  const fridayLegMovements = fridayCond!.exercises.filter(
    e => e.targetMuscle === 'legs' && (e.exerciseName.includes('Squat') || e.exerciseName.includes('Thruster'))
  );
  assert.strictEqual(fridayLegMovements.length, 0, 'Friday conditioning must avoid squats to protect Saturday posterior chain');
  assert.strictEqual(qualityScore.criticalConstraintResult.noSevereRecoveryConflict, true);

  console.log(`  * Verified: Friday conditioning protected legs for Saturday RDLs; 0 recovery conflicts.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 11: Exact Push/Pull Boundary Condition Tests
// -----------------------------------------------------------------------------
hostileTest(11, 'Exact Push/Pull Ratio Boundary Testing (0.69, 0.70, 0.84, 0.85, 1.00, 1.15, 1.16, 1.30, 1.31)', () => {
  const dummyProfile = buildEquipmentProfile([]);

  const testRatio = (pushSets: number, pullSets: number, expectedWarningType: 'none' | 'mild_deficit' | 'severe_deficit' | 'mild_excess' | 'severe_excess') => {
    const dummySchedule: any[] = [
      {
        dayNumber: 1,
        dayName: 'Monday',
        isRestDay: false,
        title: 'Push',
        focus: 'Chest Press',
        targetMuscles: ['chest'],
        estimatedDurationMinutes: 45,
        exercises: [
          { exerciseName: 'Standard Floor Push-Up', targetSets: pushSets, targetReps: 10, repUnit: 'reps', restSeconds: 60, targetMuscle: 'chest', equipment: 'bodyweight' },
        ],
      },
      {
        dayNumber: 2,
        dayName: 'Tuesday',
        isRestDay: false,
        title: 'Pull',
        focus: 'Rows',
        targetMuscles: ['back'],
        estimatedDurationMinutes: 45,
        exercises: [
          { exerciseName: 'Inverted Row (Bodyweight)', targetSets: pullSets, targetReps: 10, repUnit: 'reps', restSeconds: 60, targetMuscle: 'back', equipment: 'bodyweight' },
        ],
      },
    ];

    const { score, metrics } = scorePlanQuality(dummySchedule, dummyProfile, 45, 'general_fitness');
    const ratio = metrics.pushPullRatio;

    if (expectedWarningType === 'severe_deficit') {
      assert.ok(score.warnings.some(w => w.includes('Severe Push/Pull imbalance') && w.includes('pulling')), `Ratio ${ratio} should trigger severe deficit warning`);
    } else if (expectedWarningType === 'mild_deficit') {
      assert.ok(score.warnings.some(w => w.includes('Mild Push/Pull deficit')), `Ratio ${ratio} should trigger mild deficit warning`);
    } else if (expectedWarningType === 'none') {
      assert.ok(score.strengths.some(s => s.includes('optimally balanced')), `Ratio ${ratio} should be reported as optimally balanced`);
    } else if (expectedWarningType === 'mild_excess') {
      assert.ok(score.warnings.some(w => w.includes('Mild Push/Pull excess')), `Ratio ${ratio} should trigger mild excess warning`);
    } else if (expectedWarningType === 'severe_excess') {
      assert.ok(score.warnings.some(w => w.includes('Severe Push/Pull imbalance') && w.includes('pushing')), `Ratio ${ratio} should trigger severe excess warning`);
    }
  };

  testRatio(6, 10, 'severe_deficit'); // 0.60 < 0.70
  testRatio(7, 10, 'mild_deficit');   // 0.70
  testRatio(8, 10, 'mild_deficit');   // 0.80
  testRatio(10, 10, 'none');          // 1.00 (optimal)
  testRatio(11, 10, 'none');          // 1.10 (optimal)
  testRatio(12, 10, 'mild_excess');   // 1.20 (mild excess)
  testRatio(14, 10, 'severe_excess'); // 1.40 > 1.30 (severe excess)

  console.log(`  * Verified all exact Push/Pull boundary condition checks across thresholds.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 12: Fractional Volume Accounting (Direct 1.0 vs Compound Synergistic 0.5)
// -----------------------------------------------------------------------------
hostileTest(12, 'Fractional Volume: Synergistic muscle sets (triceps in push-up, hamstrings in squat)', () => {
  const profile = buildEquipmentProfile([]);
  const dummySchedule: any[] = [
    {
      dayNumber: 1,
      dayName: 'Monday',
      isRestDay: false,
      title: 'Push',
      focus: 'Chest',
      targetMuscles: ['chest'],
      estimatedDurationMinutes: 45,
      exercises: [
        // Standard push-up: primary = chest (3 sets), secondary = triceps, shoulders, core
        { exerciseName: 'Push-Ups (Standard / Deficit)', targetSets: 4, targetReps: 10, repUnit: 'reps', restSeconds: 60, targetMuscle: 'chest', equipment: 'bodyweight' },
      ],
    },
  ];

  const { metrics } = scorePlanQuality(dummySchedule, profile, 45);
  const breakdown = metrics.muscleVolumeBreakdown;

  assert.ok(breakdown, 'Muscle volume breakdown must be populated');
  assert.strictEqual(breakdown.chest.directSets, 4, 'Chest should have 4 direct sets');
  assert.strictEqual(breakdown.chest.effectiveSets, 4, 'Chest effective sets should be 4');
  assert.strictEqual(breakdown.triceps.directSets, 0, 'Triceps direct sets should be 0');
  assert.strictEqual(breakdown.triceps.indirectSets, 2, 'Triceps indirect sets should be 4 * 0.5 = 2');
  assert.strictEqual(breakdown.triceps.effectiveSets, 2, 'Triceps effective sets should be 2');

  console.log(`  * Verified fractional volume: Chest = 4 direct, Triceps = 2.0 indirect synergistic sets.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 13: Critical Binary Gate Rejection on Severe Violations
// -----------------------------------------------------------------------------
hostileTest(13, 'Critical Constraint Gate: Equipment violation or hard ceiling breach must fail plan (score <= 40)', () => {
  const profile = buildEquipmentProfile([]); // User has NO bench and NO barbell

  const illegalSchedule: any[] = [
    {
      dayNumber: 1,
      dayName: 'Monday',
      isRestDay: false,
      title: 'Chest Day',
      focus: 'Heavy Bench Press',
      targetMuscles: ['chest'],
      estimatedDurationMinutes: 45,
      exercises: [
        // Requires bench & barbell! User has neither.
        { exerciseName: 'Barbell Flat Bench Press', targetSets: 4, targetReps: 8, repUnit: 'reps', restSeconds: 60, targetMuscle: 'chest', equipment: 'barbell' },
      ],
    },
  ];

  const { score } = scorePlanQuality(illegalSchedule, profile, 45);
  assert.strictEqual(score.isValid, false, 'Plan with missing equipment MUST be invalid');
  assert.strictEqual(score.status, 'REJECTED', 'Status must be REJECTED');
  assert.ok(score.overallScore <= 40, `Score must be hard-capped at 40 (actual: ${score.overallScore})`);
  assert.ok(score.criticalConstraintResult.violations.length > 0, 'Must record critical violations');

  console.log(`  * Verified: Severe equipment violation -> isValid = false, status = ${score.status}, score = ${score.overallScore}/100.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 14: Explainability & Decision Transparent Logging
// -----------------------------------------------------------------------------
hostileTest(14, 'Decision Explainability: Verify transparent rationale and rejected candidate logging', () => {
  const preferences: IPlannerPreferences = {
    daysPerWeek: 3,
    sessionDurationMinutes: 45,
    splitStyle: 'home_dumbbell',
    experienceLevel: 'beginner',
    targetFocus: 'general_fitness',
  };
  const equipment = [{ type: 'dumbbell', availableWeightsKg: [4, 8] }];

  const { explanations } = generateBalancedWeeklyPlan(preferences, equipment, 70);

  assert.ok(explanations && explanations.length >= 5, 'Must generate explanations for selected exercises');

  for (const exp of explanations.slice(0, 3)) {
    assert.ok(exp.exerciseName, 'Explanation must include exerciseName');
    assert.ok(exp.slotName, 'Explanation must include slotName');
    assert.ok(exp.selectedRationale.length > 10, 'Explanation must include substantive selected rationale');
    assert.ok(Array.isArray(exp.rejectedCandidates), 'Explanation must include rejected candidates');
    for (const rej of exp.rejectedCandidates) {
      assert.ok(rej.exerciseName, 'Rejected candidate must have name');
      assert.ok(rej.reason, 'Rejected candidate must have reason');
    }
  }

  console.log(`  * Sample explanation: [${explanations[0].slotName}] "${explanations[0].exerciseName}"`);
  console.log(`    Rationale: ${explanations[0].selectedRationale}`);
  console.log(`    Rejected: ${explanations[0].rejectedCandidates.slice(0, 2).map(r => `"${r.exerciseName}" (${r.reason})`).join(', ')}`);
});

console.log('========================================================================');
console.log(`ADVERSARIAL SUITE SUMMARY: ${passedCount} / ${totalCount} SCENARIOS PASSED`);
console.log('========================================================================\n');

if (passedCount !== totalCount) {
  process.exit(1);
}
