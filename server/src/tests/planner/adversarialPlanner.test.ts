import assert from 'assert';
import { generateBalancedWeeklyPlan } from '../../services/planner/weeklyBalanceEngine';
import { IPlannerPreferences } from '../../models/UserWorkoutPlan';
import { evaluateDoubleProgression } from '../../services/planner/progressiveOverloadEngine';
import { buildEquipmentProfile } from '../../services/planner/inventoryEvaluator';
import { scorePlanQuality } from '../../services/planner/plannerQualityScorer';
import { calibrateSetsToTimeBudget, calculateSessionDuration, evaluateTimeCompliance } from '../../services/planner/timeBudgetEngine';
import { calibratePullupPrescription, calibratePushupPrescription } from '../../services/planner/bodyweightProgressionEngine';
import { COMPREHENSIVE_EXERCISE_CATALOG } from '../../services/planner/exerciseCatalog';
import { GOAL_BALANCE_TARGETS, classifyPushPullRatio } from '../../services/planner/movementModel';

console.log('========================================================================');
console.log('RUNNING SECOND-ORDER ADVERSARIAL STRESS TEST SUITE (15 HOSTILE SCENARIOS)');
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
    70,
    [],
    0, // 0 pullups
    5  // 5 pushups
  );

  // 1. Critical Binary Gate
  assert.strictEqual(qualityScore.isValid, true, 'Plan must pass all 7 binary critical constraint gates');
  assert.strictEqual(qualityScore.status, 'VALID', 'Plan status must be VALID');
  assert.ok(qualityScore.overallScore >= 90, `Quality score must be >= 90 (got ${qualityScore.overallScore})`);

  // 2. Day 5 Conditioning Protocol Data Model Integrity
  const day5 = schedule.find(d => d.title.includes('Conditioning'));
  assert.ok(day5, 'Day 5 Conditioning session must be generated');
  assert.ok(day5.conditioningProtocol, 'Conditioning protocol subschema must be populated');
  assert.strictEqual(day5.conditioningProtocol.rounds, 4, 'Must have 4 rounds');
  assert.strictEqual(day5.conditioningProtocol.workSeconds, 40, 'Must have 40s work');
  assert.strictEqual(day5.conditioningProtocol.restSeconds, 20, 'Must have 20s rest');

  for (const ex of day5.exercises) {
    assert.strictEqual(ex.targetSets, 4, `Exercise ${ex.exerciseName} sets must equal circuit rounds (4)`);
    assert.strictEqual(ex.targetReps, 40, `Exercise ${ex.exerciseName} reps must equal work interval (40s)`);
    assert.strictEqual(ex.repUnit, 'seconds', `Exercise ${ex.exerciseName} repUnit must be 'seconds'`);
    assert.strictEqual(ex.restSeconds, 20, `Exercise ${ex.exerciseName} restSeconds must be 20s`);
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
// SCENARIO 2: Capability Tiers: Pull-Up Progression Strictly Respecting Equipment
// -----------------------------------------------------------------------------
hostileTest(2, 'Capability Tiers: Pull-Up Progression strictly respecting user equipment inventory', () => {
  const barProfile = buildEquipmentProfile([{ type: 'pullup_bar' }]);
  const noEquipProfile = buildEquipmentProfile([]);
  const dumbbellProfile = buildEquipmentProfile([{ type: 'dumbbell', availableWeightsKg: [4, 8] }]);

  // 1. 0 pull-ups + Pull-Up Bar -> Negative Pull-Ups (Eccentric)
  const p0_bar = calibratePullupPrescription(0, barProfile, true);
  assert.strictEqual(p0_bar.exerciseName, 'Negative Pull-Ups (Eccentric)', '0 pull-ups + Bar must prescribe Negative Pull-Ups');
  assert.ok(p0_bar.coachingNotes.includes('Tier 0'), 'Notes must indicate Tier 0');

  // 2. 0 pull-ups + No Pulling Equipment -> Safe floor / doorframe isometric, NOT Inverted Row
  const p0_none = calibratePullupPrescription(0, noEquipProfile, true);
  assert.strictEqual(p0_none.exerciseName, 'Doorframe Isometric Row / Towel Pull', '0 pull-ups + No Equipment must prescribe Doorframe Isometric / Towel Pull');
  assert.ok(p0_none.coachingNotes.includes('Zero Pulling Hardware'), 'Notes must indicate zero pulling hardware');

  // 3. 0 pull-ups + Dumbbells Only -> Split-Stance Dumbbell Row
  const p0_db = calibratePullupPrescription(0, dumbbellProfile, true);
  assert.strictEqual(p0_db.exerciseName, 'Split-Stance One-Arm Dumbbell Row', '0 pull-ups + Dumbbells must prescribe Split-Stance Row');

  // 4. 2 pull-ups + Bar -> Negative Pull-Ups
  const p2_bar = calibratePullupPrescription(2, barProfile, true);
  assert.strictEqual(p2_bar.exerciseName, 'Negative Pull-Ups (Eccentric)', '2 pull-ups must prescribe slow negatives');
  assert.strictEqual(p2_bar.targetSets, 3);
  assert.strictEqual(p2_bar.targetReps, 4);

  // 5. 5 pull-ups + Bar -> Submaximal clusters
  const p5_bar = calibratePullupPrescription(5, barProfile, true);
  assert.strictEqual(p5_bar.exerciseName, 'Pull-Ups / Chin-Ups', '5 pull-ups must prescribe Pull-Ups / Chin-Ups');
  assert.strictEqual(p5_bar.targetSets, 3);
  assert.strictEqual(p5_bar.targetReps, 4);

  // 6. 10+ pull-ups + Bar -> Mastery volume
  const p10_bar = calibratePullupPrescription(12, barProfile, false);
  assert.strictEqual(p10_bar.exerciseName, 'Pull-Ups / Chin-Ups', '10+ pull-ups must prescribe Pull-Ups / Chin-Ups');
  assert.strictEqual(p10_bar.targetSets, 4);
  assert.strictEqual(p10_bar.targetReps, 10);
  assert.ok(p10_bar.coachingNotes.includes('Tier 4') || p10_bar.coachingNotes.includes('Mastery'));

  console.log(`  * Verified pull-up capability tiers across all equipment states (0+bar, 0+none, 0+db, 2, 5, 10+).`);
});

// -----------------------------------------------------------------------------
// SCENARIO 3: Capability Tiers: 2-Rep Push-Up Beginner User
// -----------------------------------------------------------------------------
hostileTest(3, 'Capability Tiers: 2-rep push-up beginner must receive elevated incline push-ups', () => {
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
// SCENARIO 4: Max Dumbbell Load Ceiling & Variation Ladder
// -----------------------------------------------------------------------------
hostileTest(4, 'Overload Ceiling: Max dumbbell load reached at 15 reps must trigger tempo or variation ladder', () => {
  const profile = buildEquipmentProfile([
    { type: 'dumbbell', availableWeightsKg: [4, 6, 8, 10] }, // Max weight is 10kg
  ]);

  const overloadDecision = evaluateDoubleProgression({
    exerciseName: 'Dumbbell Floor Press (No Bench Required)',
    equipment: 'dumbbell',
    currentPrescribedWeightKg: 10, // Max load already
    currentPrescribedReps: 15,     // Top of rep bracket
    minReps: 8,
    maxReps: 15,
    completedSets: [
      { reps: 15, weightKg: 10, rpe: 7.5, completed: true },
      { reps: 15, weightKg: 10, rpe: 7.5, completed: true },
      { reps: 15, weightKg: 10, rpe: 7.5, completed: true },
    ],
  }, profile);

  assert.strictEqual(overloadDecision.type, 'progression_advance', 'Must trigger progression advance when max DB load is reached at 15 reps');
  assert.ok(
    (overloadDecision.swappedExerciseName && overloadDecision.swappedExerciseName.includes('1.5-Rep')) ||
    (overloadDecision.tempoCues && overloadDecision.tempoCues.includes('4-1-1-0')) ||
    overloadDecision.reason.toLowerCase().includes('harder') ||
    overloadDecision.reason.toLowerCase().includes('tempo'),
    'Reason, swap or tempoCues must guide harder mechanical variation or tempo'
  );
  assert.strictEqual(overloadDecision.newTargetReps, 8, 'Reps should reset to 8 for the new tempo / variation challenge');

  console.log(`  * Verified: 10kg max dumbbell at 15 reps -> tempo 4-1-1-0 or mechanical variation advance with rep reset to 8.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 5: Explicit Duration Policies: 20-Minute Micro-Session
// -----------------------------------------------------------------------------
hostileTest(5, 'Duration Policy: 20-Minute express session must strictly obey hard ceiling policy', () => {
  const exercises = COMPREHENSIVE_EXERCISE_CATALOG.slice(0, 5);
  const calibrated = calibrateSetsToTimeBudget(exercises, 20, true, 'hard_ceiling');
  const budget = calculateSessionDuration(calibrated, 20, 'hard_ceiling');

  assert.ok(budget.totalEstimatedMinutes <= 20, `Duration (${budget.totalEstimatedMinutes}m) must not exceed hard ceiling of 20m`);
  assert.strictEqual(budget.isWithinBudget, true, 'Must report within budget');
  assert.ok(calibrated.length >= 2, 'Must maintain at least 2 primary exercises');

  console.log(`  * Verified: 20-minute hard ceiling -> ${calibrated.length} exercises totaling ${budget.totalEstimatedMinutes}m.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 6: 30-Minute Constrained Session Preserves Blueprint Intent
// -----------------------------------------------------------------------------
hostileTest(6, 'Duration Optimizer: 30-Minute session preserves primary movements and blueprint intent', () => {
  const fullBodyExercises = COMPREHENSIVE_EXERCISE_CATALOG.filter(e =>
    ['Push-Ups (Standard / Deficit)', 'Dumbbell Goblet Squat', 'Split-Stance One-Arm Dumbbell Row', 'Dumbbell Lateral Raise', 'Standard Forearm Plank'].includes(e.name)
  );

  // Calibrate for 30 minutes
  const calibrated30 = calibrateSetsToTimeBudget(fullBodyExercises, 30, true, 'compact_efficient');
  const duration30 = calculateSessionDuration(calibrated30, 30, 'compact_efficient');

  // Verify primary compound movements (Squat, Push-Up, Row) are PRESERVED!
  const hasSquat = calibrated30.some(c => c.exercise.name === 'Dumbbell Goblet Squat');
  const hasPush = calibrated30.some(c => c.exercise.name === 'Push-Ups (Standard / Deficit)');
  const hasRow = calibrated30.some(c => c.exercise.name === 'Split-Stance One-Arm Dumbbell Row');

  assert.ok(hasSquat, 'Primary Goblet Squat MUST be preserved in 30m session');
  assert.ok(hasPush, 'Primary Push-Up MUST be preserved in 30m session');
  assert.ok(hasRow, 'Primary Row MUST be preserved in 30m session');

  // Verify minimum productive volume (>= 2 sets per primary)
  for (const c of calibrated30) {
    if (c.exercise.mechanic === 'compound') {
      assert.ok(c.sets >= 2, `Primary exercise ${c.exercise.name} must maintain minimum productive volume of >= 2 sets (got ${c.sets})`);
    }
  }

  assert.ok(duration30.totalEstimatedMinutes <= 33, `Estimated duration should be compact (~30m, got ${duration30.totalEstimatedMinutes}m)`);
  console.log(`  * Verified: 30m session preserves all 3 primary compound movements with ${calibrated30.length} exercises totaling ${duration30.totalEstimatedMinutes}m.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 7: Explicit Duration Policies: 60-Minute Hypertrophy Session
// -----------------------------------------------------------------------------
hostileTest(7, 'Duration Policy: 60-Minute session must realistically scale sets, warmup, and cooldown', () => {
  const exercises = COMPREHENSIVE_EXERCISE_CATALOG.filter(e =>
    ['Push-Ups (Standard / Deficit)', 'Split-Stance One-Arm Dumbbell Row', 'Standing Dumbbell Shoulder Press', 'Dumbbell Lateral Raise', 'Standard Forearm Plank'].includes(e.name)
  );
  const calibrated = calibrateSetsToTimeBudget(exercises, 60, false, 'approximate_target');
  const budget = calculateSessionDuration(calibrated, 60, 'approximate_target');

  assert.ok(budget.totalEstimatedMinutes >= 50, `60m session must calculate at least 50m (got ${budget.totalEstimatedMinutes}m)`);
  assert.ok(budget.totalEstimatedMinutes <= 66, `60m session must not exceed 66m (got ${budget.totalEstimatedMinutes}m)`);
  assert.strictEqual(budget.isWithinBudget, true);

  console.log(`  * Verified: 60-minute target -> ${calibrated.length} exercises, ${calibrated[0].sets} sets/ex, duration: ${budget.totalEstimatedMinutes}m.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 8: Zero-Equipment Pure Floor Bodyweight Program
// -----------------------------------------------------------------------------
hostileTest(8, 'Zero Equipment: Pure bodyweight inventory must generate 100% compliant plan with glute bridges for hip hinges', () => {
  const zeroEquipment: any[] = [];
  const preferences: IPlannerPreferences = {
    daysPerWeek: 3,
    sessionDurationMinutes: 45,
    splitStyle: 'full_body',
    experienceLevel: 'beginner',
    targetFocus: 'general_fitness',
  };

  const { schedule, qualityScore } = generateBalancedWeeklyPlan(preferences, zeroEquipment, 70);

  assert.strictEqual(qualityScore.criticalConstraintResult.equipmentCompliance, true, 'Zero equipment plan must be 100% equipment compliant');
  assert.strictEqual(qualityScore.criticalConstraintResult.impossibleExercise, true, 'Zero impossible exercises');

  // Verify glute bridges or single leg bodyweight hinges are used for hip hinges
  let hasBodyweightHinge = false;
  for (const day of schedule) {
    for (const ex of day.exercises) {
      if (ex.exerciseName.includes('Glute Bridge') || ex.exerciseName.includes('Single-Leg Bodyweight Romanian Deadlift')) {
        hasBodyweightHinge = true;
      }
    }
  }
  assert.ok(hasBodyweightHinge, 'Zero equipment plan must include Bodyweight Glute Bridge or Single-Leg RDL for hip hinges');

  console.log(`  * Verified: Pure floor bodyweight generates 100% equipment compliant schedule with glute bridge hinges.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 9: Barbell-Only Garage Gym (No Bench, No Dumbbells)
// -----------------------------------------------------------------------------
hostileTest(9, 'Hardware Isolation: Barbell-only gym with NO bench must not prescribe bench presses', () => {
  const barbellOnlyEquipment = [{ type: 'barbell' }];
  const preferences: IPlannerPreferences = {
    daysPerWeek: 4,
    sessionDurationMinutes: 45,
    splitStyle: 'upper_lower',
    experienceLevel: 'intermediate',
    targetFocus: 'strength',
  };

  const { schedule, qualityScore } = generateBalancedWeeklyPlan(preferences, barbellOnlyEquipment, 80);

  assert.strictEqual(qualityScore.criticalConstraintResult.equipmentCompliance, true);
  for (const day of schedule) {
    for (const ex of day.exercises) {
      assert.ok(!ex.exerciseName.toLowerCase().includes('bench'), `Found illegal bench press: ${ex.exerciseName}`);
    }
  }

  console.log(`  * Verified: Barbell-only gym without bench generated 0 bench presses and 100% equipment compliance.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 10: Multi-Factor Fatigue & Recovery Scheduling
// -----------------------------------------------------------------------------
hostileTest(10, 'Multi-Factor Fatigue: Differentiate adequate recovery from true severe recovery conflicts', () => {
  const profile = buildEquipmentProfile([
    { type: 'barbell' },
    { type: 'dumbbell', availableWeightsKg: [4, 6, 8, 10] },
  ]);

  // Case A: Consecutive lower-body days with ADEQUATE recovery (Moderate Goblet Squats on Day 1, Light Calves/Core on Day 2)
  const validConsecutiveSchedule: any[] = [
    {
      dayNumber: 1,
      dayName: 'Monday',
      isRestDay: false,
      title: 'Lower Body Strength',
      focus: 'Goblet Squats',
      targetMuscles: ['legs'],
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseName: 'Dumbbell Goblet Squat', targetSets: 3, targetReps: 8, repUnit: 'reps', restSeconds: 75, targetMuscle: 'legs', equipment: 'dumbbell' },
      ],
    },
    {
      dayNumber: 2,
      dayName: 'Tuesday',
      isRestDay: false,
      title: 'Lower Accessory & Core',
      focus: 'Calves and Abs',
      targetMuscles: ['legs', 'core'],
      estimatedDurationMinutes: 30,
      exercises: [
        { exerciseName: 'Dumbbell Standing Calf Raise', targetSets: 3, targetReps: 15, repUnit: 'reps', restSeconds: 45, targetMuscle: 'legs', equipment: 'dumbbell' },
        { exerciseName: 'Standard Forearm Plank', targetSets: 2, targetReps: 35, repUnit: 'seconds', restSeconds: 45, targetMuscle: 'core', equipment: 'bodyweight' },
      ],
    },
  ];

  const evalValid = scorePlanQuality(validConsecutiveSchedule, profile, 45);
  assert.strictEqual(
    evalValid.score.criticalConstraintResult.noSevereRecoveryConflict,
    true,
    'Moderate squat followed by light calves/core should NOT be flagged as severe recovery conflict'
  );

  // Case B: Severe Axial Recovery Conflict (Heavy Barbell Deadlift on Day 1, Heavy Barbell Back Squat on Day 2 without rest)
  const severeAxialConflictSchedule: any[] = [
    {
      dayNumber: 1,
      dayName: 'Monday',
      isRestDay: false,
      title: 'Heavy Deadlift Day',
      focus: 'Spinal Loading',
      targetMuscles: ['legs', 'back'],
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseName: 'Conventional Barbell Deadlift', targetSets: 4, targetReps: 5, repUnit: 'reps', restSeconds: 120, targetMuscle: 'legs', equipment: 'barbell' },
      ],
    },
    {
      dayNumber: 2,
      dayName: 'Tuesday',
      isRestDay: false,
      title: 'Heavy Back Squat Day',
      focus: 'Spinal Loading',
      targetMuscles: ['legs'],
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseName: 'Barbell Back Squat', targetSets: 4, targetReps: 6, repUnit: 'reps', restSeconds: 120, targetMuscle: 'legs', equipment: 'barbell' },
      ],
    },
  ];

  const evalConflict = scorePlanQuality(severeAxialConflictSchedule, profile, 45);
  assert.strictEqual(
    evalConflict.score.criticalConstraintResult.noSevereRecoveryConflict,
    false,
    'Heavy deadlift followed immediately by heavy back squat MUST fail severe recovery conflict gate'
  );
  assert.strictEqual(evalConflict.score.isValid, false, 'Severe recovery conflict plan must be invalid');

  console.log(`  * Verified: Moderate squat + calves is VALID (adequate recovery); Heavy deadlift + squat FAILS (severe axial conflict).`);
});

// -----------------------------------------------------------------------------
// SCENARIO 11: Exact Push/Pull Boundary Condition Tests & Goal Profiles
// -----------------------------------------------------------------------------
hostileTest(11, 'Exact Push/Pull Ratio Boundary Testing (0.69, 0.70, 0.84, 0.85, 1.00, 1.15, 1.16, 1.30, 1.31) and Goal Targets', () => {
  // Test general_fitness boundaries using the single authoritative classifier
  assert.strictEqual(classifyPushPullRatio(0.69, 'general_fitness'), 'severe_deficit');
  assert.strictEqual(classifyPushPullRatio(0.70, 'general_fitness'), 'mild_deficit');
  assert.strictEqual(classifyPushPullRatio(0.84, 'general_fitness'), 'mild_deficit');
  assert.strictEqual(classifyPushPullRatio(0.85, 'general_fitness'), 'ideal');
  assert.strictEqual(classifyPushPullRatio(1.00, 'general_fitness'), 'ideal');
  assert.strictEqual(classifyPushPullRatio(1.15, 'general_fitness'), 'ideal');
  assert.strictEqual(classifyPushPullRatio(1.16, 'general_fitness'), 'mild_excess');
  assert.strictEqual(classifyPushPullRatio(1.30, 'general_fitness'), 'mild_excess');
  assert.strictEqual(classifyPushPullRatio(1.31, 'general_fitness'), 'severe_excess');

  // Test strength goal boundaries
  const str = GOAL_BALANCE_TARGETS.strength;
  assert.strictEqual(classifyPushPullRatio(str.acceptablePushPullMin - 0.01, 'strength'), 'severe_deficit');
  assert.strictEqual(classifyPushPullRatio(str.acceptablePushPullMin, 'strength'), 'mild_deficit');
  assert.strictEqual(classifyPushPullRatio(str.idealPushPullMin, 'strength'), 'ideal');
  assert.strictEqual(classifyPushPullRatio(str.idealPushPullMax, 'strength'), 'ideal');
  assert.strictEqual(classifyPushPullRatio(str.acceptablePushPullMax, 'strength'), 'mild_excess');
  assert.strictEqual(classifyPushPullRatio(str.acceptablePushPullMax + 0.01, 'strength'), 'severe_excess');

  // Test hypertrophy goal boundaries
  const hyp = GOAL_BALANCE_TARGETS.hypertrophy;
  assert.strictEqual(classifyPushPullRatio(hyp.acceptablePushPullMin - 0.01, 'hypertrophy'), 'severe_deficit');
  assert.strictEqual(classifyPushPullRatio(hyp.acceptablePushPullMin, 'hypertrophy'), 'mild_deficit');
  assert.strictEqual(classifyPushPullRatio(hyp.idealPushPullMin, 'hypertrophy'), 'ideal');
  assert.strictEqual(classifyPushPullRatio(hyp.idealPushPullMax, 'hypertrophy'), 'ideal');
  assert.strictEqual(classifyPushPullRatio(hyp.acceptablePushPullMax, 'hypertrophy'), 'mild_excess');
  assert.strictEqual(classifyPushPullRatio(hyp.acceptablePushPullMax + 0.01, 'hypertrophy'), 'severe_excess');

  // Test fat_loss goal boundaries
  const fat = GOAL_BALANCE_TARGETS.fat_loss;
  assert.strictEqual(classifyPushPullRatio(fat.acceptablePushPullMin - 0.01, 'fat_loss'), 'severe_deficit');
  assert.strictEqual(classifyPushPullRatio(fat.acceptablePushPullMin, 'fat_loss'), 'mild_deficit');
  assert.strictEqual(classifyPushPullRatio(fat.idealPushPullMin, 'fat_loss'), 'ideal');
  assert.strictEqual(classifyPushPullRatio(fat.idealPushPullMax, 'fat_loss'), 'ideal');
  assert.strictEqual(classifyPushPullRatio(fat.acceptablePushPullMax, 'fat_loss'), 'mild_excess');
  assert.strictEqual(classifyPushPullRatio(fat.acceptablePushPullMax + 0.01, 'fat_loss'), 'severe_excess');

  // Verify within scorePlanQuality directly
  const dummyProfile = buildEquipmentProfile([]);
  const testScheduleWithRatio = (pushSets: number, pullSets: number) => {
    const dummySchedule: any[] = [
      {
        dayNumber: 1, dayName: 'Monday', isRestDay: false, title: 'Push', focus: 'Push', targetMuscles: ['chest'], estimatedDurationMinutes: 45,
        exercises: [{ exerciseName: 'Push-Ups (Standard / Deficit)', targetSets: pushSets, targetReps: 10, repUnit: 'reps', restSeconds: 60, targetMuscle: 'chest', equipment: 'bodyweight' }],
      },
      {
        dayNumber: 2, dayName: 'Tuesday', isRestDay: false, title: 'Pull', focus: 'Pull', targetMuscles: ['back'], estimatedDurationMinutes: 45,
        exercises: [{ exerciseName: 'Doorframe Isometric Row / Towel Pull', targetSets: pullSets, targetReps: 10, repUnit: 'reps', restSeconds: 60, targetMuscle: 'back', equipment: 'bodyweight' }],
      },
    ];
    return scorePlanQuality(dummySchedule, dummyProfile, 45, 'general_fitness');
  };

  const eval69 = testScheduleWithRatio(69, 100);
  assert.ok(eval69.score.warnings.some(w => w.includes('Severe Push/Pull imbalance') && w.includes('pulling')), '0.69 must trigger severe deficit warning');

  const eval70 = testScheduleWithRatio(70, 100);
  assert.ok(eval70.score.warnings.some(w => w.includes('Mild Push/Pull deficit')), '0.70 must trigger mild deficit warning');

  const eval85 = testScheduleWithRatio(85, 100);
  assert.ok(eval85.score.strengths.some(s => s.includes('optimally balanced')), '0.85 must be optimally balanced');

  const eval115 = testScheduleWithRatio(115, 100);
  assert.ok(eval115.score.strengths.some(s => s.includes('optimally balanced')), '1.15 must be optimally balanced');

  const eval116 = testScheduleWithRatio(116, 100);
  assert.ok(eval116.score.warnings.some(w => w.includes('Mild Push/Pull excess')), '1.16 must trigger mild excess warning');

  const eval131 = testScheduleWithRatio(131, 100);
  assert.ok(eval131.score.warnings.some(w => w.includes('Severe Push/Pull imbalance') && w.includes('pushing')), '1.31 must trigger severe excess warning');

  console.log(`  * Verified all exact Push/Pull boundary condition checks (0.69, 0.70, 0.84, 0.85, 1.00, 1.15, 1.16, 1.30, 1.31) across all 4 goals.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 12: Fractional Volume Accounting (Direct 1.0 vs Compound Synergistic 0.5)
// -----------------------------------------------------------------------------
hostileTest(12, 'Fractional Volume: Multi-movement audit verifying zero double-counting across muscle groups', () => {
  const profile = buildEquipmentProfile([
    { type: 'dumbbell', availableWeightsKg: [4, 6, 8, 10] },
    { type: 'pullup_bar' },
  ]);

  const auditSchedule: any[] = [
    {
      dayNumber: 1,
      dayName: 'Monday',
      isRestDay: false,
      title: 'Full Kinetic Chain Test',
      focus: 'Testing all mechanics',
      targetMuscles: ['chest', 'shoulders', 'back', 'legs', 'biceps'],
      estimatedDurationMinutes: 60,
      exercises: [
        // 1. Horizontal Push: Push-Up (4 sets). Primary: chest (4.0). Secondary: triceps (2.0), shoulders (2.0)
        { exerciseName: 'Push-Ups (Standard / Deficit)', targetSets: 4, targetReps: 10, repUnit: 'reps', restSeconds: 60, targetMuscle: 'chest', equipment: 'bodyweight' },
        // 2. Vertical Push: Standing Dumbbell Shoulder Press (3 sets). Primary: shoulders (3.0). Secondary: triceps (1.5)
        { exerciseName: 'Standing Dumbbell Shoulder Press', targetSets: 3, targetReps: 8, repUnit: 'reps', restSeconds: 75, targetMuscle: 'shoulders', equipment: 'dumbbell' },
        // 3. Row: Split-Stance Dumbbell Row (3 sets). Primary: back (3.0). Secondary: biceps (1.5), shoulders (1.5)
        { exerciseName: 'Split-Stance One-Arm Dumbbell Row', targetSets: 3, targetReps: 8, repUnit: 'reps', restSeconds: 75, targetMuscle: 'back', equipment: 'dumbbell' },
        // 4. Squat: Goblet Squat (3 sets). Primary: legs (3.0).
        { exerciseName: 'Dumbbell Goblet Squat', targetSets: 3, targetReps: 8, repUnit: 'reps', restSeconds: 75, targetMuscle: 'legs', equipment: 'dumbbell' },
        // 5. Hinge: Dumbbell Romanian Deadlift (3 sets). Primary: legs (3.0).
        { exerciseName: 'Dumbbell Romanian Deadlift (RDL)', targetSets: 3, targetReps: 8, repUnit: 'reps', restSeconds: 75, targetMuscle: 'legs', equipment: 'dumbbell' },
        // 6. Isolation: Standing Dumbbell Bicep Curl (3 sets). Primary: biceps (3.0). NO SECONDARY!
        { exerciseName: 'Standing Dumbbell Bicep Curl', targetSets: 3, targetReps: 12, repUnit: 'reps', restSeconds: 60, targetMuscle: 'biceps', equipment: 'dumbbell' },
      ],
    },
  ];

  const { metrics } = scorePlanQuality(auditSchedule, profile, 60);
  const v = metrics.muscleVolumeBreakdown!;

  assert.ok(v, 'Volume breakdown must exist');
  // Chest: 4 direct from pushups
  assert.strictEqual(v.chest.directSets, 4);
  assert.strictEqual(v.chest.indirectSets, 0);
  assert.strictEqual(v.chest.effectiveSets, 4);

  // Shoulders: 3 direct from shoulder press + 2 indirect from pushups + 1.5 indirect from row = 6.5 effective
  assert.strictEqual(v.shoulders.directSets, 3);
  assert.strictEqual(v.shoulders.indirectSets, 3.5);
  assert.strictEqual(v.shoulders.effectiveSets, 6.5);

  // Triceps: 0 direct + 2 indirect from pushups + 1.5 indirect from shoulder press = 3.5 effective
  assert.strictEqual(v.triceps.directSets, 0);
  assert.strictEqual(v.triceps.indirectSets, 3.5);
  assert.strictEqual(v.triceps.effectiveSets, 3.5);

  // Biceps: 3 direct from curls + 1.5 indirect from rows = 4.5 effective
  assert.strictEqual(v.biceps.directSets, 3);
  assert.strictEqual(v.biceps.indirectSets, 1.5);
  assert.strictEqual(v.biceps.effectiveSets, 4.5);

  // Legs: 3 direct from squats + 3 direct from RDL = 6.0 direct
  assert.strictEqual(v.legs.directSets, 6);

  console.log(`  * Verified fractional volume: Chest = ${v.chest.effectiveSets}, Shoulders = ${v.shoulders.effectiveSets}, Triceps = ${v.triceps.effectiveSets}, Biceps = ${v.biceps.effectiveSets}, Legs = ${v.legs.effectiveSets}. Zero double-counting.`);
});

// -----------------------------------------------------------------------------
// SCENARIO 13: Regression Test for Impossible Slot (Zero Random Fallback)
// -----------------------------------------------------------------------------
hostileTest(13, 'Impossible Slot Requirement: Zero random fallback, slot marked unresolved, critical gate fails', () => {
  const zeroEquipment: any[] = [];
  const preferences: IPlannerPreferences = {
    daysPerWeek: 3,
    sessionDurationMinutes: 45,
    splitStyle: 'home_dumbbell',
    experienceLevel: 'beginner',
    targetFocus: 'general_fitness',
  };

  const { schedule, qualityScore } = generateBalancedWeeklyPlan(preferences, zeroEquipment, 70);

  const hasUnresolved = schedule.some(d => d.unresolvedSlots && d.unresolvedSlots.length > 0);
  assert.ok(hasUnresolved, 'Plan with impossible slot must mark unresolvedSlots on the day');

  assert.strictEqual(qualityScore.criticalConstraintResult.intentFulfillment, false, 'Unresolved slots must fail intentFulfillment gate');
  assert.strictEqual(qualityScore.isValid, false, 'Plan with unresolved primary slots must be invalid');
  assert.ok(['NEEDS_REPAIR', 'REJECTED'].includes(qualityScore.status), `Status must be NEEDS_REPAIR or REJECTED (got ${qualityScore.status})`);
  assert.ok(qualityScore.overallScore <= 40, 'Overall score must be capped at 40');

  console.log(`  * Verified: Impossible slot flagged as unresolved, 0 random fallback, status: ${qualityScore.status}, score: ${qualityScore.overallScore}.`);
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

// -----------------------------------------------------------------------------
// SCENARIO 15: Authoritative Catalog & Mongoose Schema Synchronization Integrity
// -----------------------------------------------------------------------------
hostileTest(15, 'Authoritative Catalog & Schema Integrity: 100% of movements conform to domain constraints', () => {
  assert.ok(COMPREHENSIVE_EXERCISE_CATALOG.length >= 45, `Catalog must contain at least 45 comprehensive exercises (got ${COMPREHENSIVE_EXERCISE_CATALOG.length})`);

  const validMechanics = ['compound', 'isolation'];
  const validLateralities = ['bilateral', 'unilateral'];
  const validAxial = ['none', 'light', 'moderate', 'heavy'];
  const validDifficulties = ['beginner', 'intermediate', 'advanced'];

  for (const item of COMPREHENSIVE_EXERCISE_CATALOG) {
    assert.ok(item.name && item.name.length > 3, `Exercise missing valid name: ${JSON.stringify(item)}`);
    assert.ok(item.movementPattern, `Exercise ${item.name} missing movementPattern`);
    assert.ok(validMechanics.includes(item.mechanic), `Exercise ${item.name} has invalid mechanic: ${item.mechanic}`);
    assert.ok(validLateralities.includes(item.laterality), `Exercise ${item.name} has invalid laterality: ${item.laterality}`);
    assert.ok(validAxial.includes(item.axialLoading), `Exercise ${item.name} has invalid axialLoading: ${item.axialLoading}`);
    assert.ok(validDifficulties.includes(item.difficulty), `Exercise ${item.name} has invalid difficulty: ${item.difficulty}`);
    assert.ok(item.recoveryDemandHours >= 12, `Exercise ${item.name} must have positive recoveryDemandHours (got ${item.recoveryDemandHours})`);
    assert.ok(item.fatigueCost >= 1, `Exercise ${item.name} must have positive fatigueCost (got ${item.fatigueCost})`);
    assert.ok(item.defaultRepRange.min > 0 && item.defaultRepRange.max >= item.defaultRepRange.min, `Exercise ${item.name} invalid rep range`);
    assert.strictEqual(typeof item.benchRequired, 'boolean', `Exercise ${item.name} missing boolean benchRequired`);
    assert.strictEqual(typeof item.pullupBarRequired, 'boolean', `Exercise ${item.name} missing boolean pullupBarRequired`);
  }

  console.log(`  * Verified: All ${COMPREHENSIVE_EXERCISE_CATALOG.length} exercises conform strictly to schema and domain constraints.`);
});

console.log('========================================================================');
console.log(`ADVERSARIAL SUITE SUMMARY: ${passedCount} / ${totalCount} SCENARIOS PASSED`);
console.log('========================================================================\n');

if (passedCount !== totalCount) {
  process.exit(1);
}
