import { generateBalancedWeeklyPlan } from '../engine/weeklyBalanceEngine';
import { IPlannerPreferences } from '../../workouts/UserWorkoutPlan';
import { evaluateDoubleProgression } from '../engine/progressiveOverloadEngine';
import { buildEquipmentProfile } from '../engine/inventoryEvaluator';
import { scorePlanQuality } from '../engine/plannerQualityScorer';
import { calibrateSetsToTimeBudget, calculateSessionDuration } from '../engine/timeBudgetEngine';
import { calibratePullupPrescription } from '../engine/bodyweightProgressionEngine';
import { COMPREHENSIVE_EXERCISE_CATALOG } from '../engine/exerciseCatalog';
import { classifyPushPullRatio, classifySquatHingeRatio } from '../engine/movementModel';

interface ScenarioConfig {
  id: string;
  name: string;
  run: () => void;
}

const printDivider = (char: string = '=', len: number = 80) => console.log(char.repeat(len));

function printPlanInspection(
  id: string,
  title: string,
  result: ReturnType<typeof generateBalancedWeeklyPlan>
) {
  const { schedule, qualityScore, balanceMetrics, explanations } = result;
  printDivider('=');
  console.log(`SCENARIO ${id}: ${title.toUpperCase()}`);
  printDivider('=');

  // 1. Critical Binary Gates & Overall Quality Score
  console.log(`\n[1. QUALITY SCORE & STATUS]`);
  console.log(`  Overall Score: ${qualityScore.overallScore}/100 | Status: ${qualityScore.status} | IsValid: ${qualityScore.isValid}`);
  console.log(`  Component Scores:`);
  console.log(`    - Equipment Compliance:      ${qualityScore.equipmentComplianceScore}/100`);
  console.log(`    - Movement Balance:           ${qualityScore.movementBalanceScore}/100`);
  console.log(`    - Muscle Coverage:            ${qualityScore.muscleCoverageScore}/100`);
  console.log(`    - Recovery / Fatigue:         ${qualityScore.recoveryScore}/100`);
  console.log(`    - Redundancy Integrity:       ${qualityScore.redundancyScore}/100`);
  console.log(`    - Time Budget Compliance:     ${qualityScore.timeComplianceScore}/100`);
  console.log(`    - Experience Suitability:     ${qualityScore.experienceSuitabilityScore}/100`);

  console.log(`\n[2. CRITICAL CONSTRAINT GATES]`);
  const gates = qualityScore.criticalConstraintResult;
  console.log(`    - Equipment Compliance:         [${gates.equipmentCompliance ? 'PASS' : 'FAIL'}]`);
  console.log(`    - No Impossible Exercises:      [${gates.impossibleExercise ? 'PASS' : 'FAIL'}]`);
  console.log(`    - No Severe Recovery Conflict:  [${gates.noSevereRecoveryConflict ? 'PASS' : 'FAIL'}]`);
  console.log(`    - Prescription Validity:        [${gates.prescriptionValidity ? 'PASS' : 'FAIL'}]`);
  console.log(`    - Duration Compliance:          [${gates.durationCompliance ? 'PASS' : 'FAIL'}]`);
  console.log(`    - Intent Fulfillment:           [${gates.intentFulfillment ? 'PASS' : 'FAIL'}]`);
  console.log(`    - Metadata Validity:            [${gates.metadataValidity ? 'PASS' : 'FAIL'}]`);

  if (gates.violations && gates.violations.length > 0) {
    console.log(`  Critical Violations:`);
    gates.violations.forEach(v => console.log(`    * [CRITICAL] ${v}`));
  }

  if (qualityScore.warnings.length > 0) {
    console.log(`  Warnings:`);
    qualityScore.warnings.forEach(w => console.log(`    ! ${w}`));
  }
  if (qualityScore.strengths.length > 0) {
    console.log(`  Strengths:`);
    qualityScore.strengths.forEach(s => console.log(`    + ${s}`));
  }

  // 2. Weekly Balance & Kinetic Chain Metrics
  const pushPullClass = classifyPushPullRatio(balanceMetrics.pushPullRatio);
  const squatHingeClass = classifySquatHingeRatio(balanceMetrics.squatHingeRatio);

  console.log(`\n[3. WEEKLY BALANCE METRICS]`);
  console.log(`  Total Active Days:    ${schedule.filter(d => !d.isRestDay).length}`);
  console.log(`  Total Weekly Sets:    ${balanceMetrics.totalSets}`);
  console.log(`  Push / Pull Ratio:    ${balanceMetrics.pushPullRatio} (${pushPullClass.toUpperCase()})`);
  console.log(`  Squat / Hinge Ratio:  ${balanceMetrics.squatHingeRatio} (${squatHingeClass.toUpperCase()})`);
  console.log(`  Squat Sets:           ${balanceMetrics.squatSets} | Hinge Sets: ${balanceMetrics.hingeSets}`);
  console.log(`  Push Sets:            ${balanceMetrics.pushSets} | Pull Sets: ${balanceMetrics.pullSets}`);
  console.log(`  Core Sets:            ${balanceMetrics.coreSets} | Direct Arm Sets: ${balanceMetrics.directArmSets}`);

  if (balanceMetrics.muscleVolumeBreakdown) {
    console.log(`  Fractional Muscle Volume Breakdown (Direct / Indirect / Effective):`);
    for (const [muscle, vol] of Object.entries(balanceMetrics.muscleVolumeBreakdown)) {
      if (vol.effectiveSets > 0) {
        console.log(`    - ${muscle.padEnd(12)}: Direct ${vol.directSets}s | Indirect ${vol.indirectSets}s | Effective ${vol.effectiveSets}s`);
      }
    }
  }

  // 3. Full Daily Schedule & Prescriptions
  console.log(`\n[4. FULL GENERATED SCHEDULE]`);
  for (const day of schedule) {
    if (day.isRestDay) {
      console.log(`  Day ${day.dayNumber} (${day.dayName}): REST DAY`);
    } else {
      console.log(`  Day ${day.dayNumber} (${day.dayName}): ${day.title} [Target: ~${day.estimatedDurationMinutes}m]`);
      console.log(`    Focus: ${day.focus}`);
      if (day.unresolvedSlots && day.unresolvedSlots.length > 0) {
        console.log(`    *** UNRESOLVED SLOTS: ${day.unresolvedSlots.join(', ')} ***`);
      }
      if (day.conditioningProtocol) {
        console.log(`    Conditioning Protocol: ${day.conditioningProtocol.rounds} rounds | ${day.conditioningProtocol.workSeconds}s work / ${day.conditioningProtocol.restSeconds}s rest`);
      }
      day.exercises.forEach((ex, idx) => {
        const unit = ex.repUnit === 'seconds' ? 's' : ' reps';
        console.log(`      ${idx + 1}. ${ex.exerciseName.padEnd(38)} | ${ex.targetSets} sets x ${ex.targetReps}${unit} | rest: ${ex.restSeconds}s | eq: ${ex.equipment}`);
        if (ex.notes) {
          console.log(`         Note: ${ex.notes}`);
        }
      });
    }
  }

  // 4. Sample Decision Rationales and Rejected Candidates
  if (explanations && explanations.length > 0) {
    console.log(`\n[5. SAMPLE SELECTION RATIONALES & REJECTED CANDIDATES]`);
    for (const exp of explanations.slice(0, 3)) {
      console.log(`  Slot [${exp.slotName}] -> Selected: "${exp.exerciseName}"`);
      console.log(`    Rationale: ${exp.selectedRationale}`);
      if (exp.rejectedCandidates && exp.rejectedCandidates.length > 0) {
        console.log(`    Top Rejected Candidates:`);
        exp.rejectedCandidates.slice(0, 2).forEach(r => {
          console.log(`      x "${r.exerciseName}": ${r.reason}`);
        });
      }
    }
  }
  console.log('\n');
}

const scenarios: ScenarioConfig[] = [
  // ---------------------------------------------------------------------------
  // SCENARIO A: Beginner / 3d / 30m / Bodyweight Only
  // ---------------------------------------------------------------------------
  {
    id: 'A',
    name: 'Beginner / 3d / 30m / Bodyweight Only',
    run: () => {
      const preferences: IPlannerPreferences = {
        daysPerWeek: 3,
        sessionDurationMinutes: 30,
        splitStyle: 'full_body',
        experienceLevel: 'beginner',
        targetFocus: 'general_fitness',
      };
      const equipment: any[] = [];
      const result = generateBalancedWeeklyPlan(preferences, equipment, 70, [], 0, 5);
      printPlanInspection('A', 'Beginner / 3d / 30m / Bodyweight Only', result);
    },
  },

  // ---------------------------------------------------------------------------
  // SCENARIO B: Beginner / 5d / 45m / Dumbbells (4-10kg) + Pull-up Bar / No Bench
  // ---------------------------------------------------------------------------
  {
    id: 'B',
    name: 'Beginner / 5d / 45m / Dumbbells + Pull-up Bar / No Bench',
    run: () => {
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
        { type: 'other', name: 'Pushup Bars' },
      ];
      const result = generateBalancedWeeklyPlan(preferences, equipment, 70, [], 0, 8);
      printPlanInspection('B', 'Beginner / 5d / 45m / Dumbbells + Pull-up Bar / No Bench', result);
    },
  },

  // ---------------------------------------------------------------------------
  // SCENARIO C: Intermediate / 5d / Hypertrophy / Full Gym Equipment
  // ---------------------------------------------------------------------------
  {
    id: 'C',
    name: 'Intermediate / 5d / Hypertrophy / Full Gym (Barbell, Dumbbells, Bench)',
    run: () => {
      const preferences: IPlannerPreferences = {
        daysPerWeek: 5,
        sessionDurationMinutes: 55,
        splitStyle: 'upper_lower',
        experienceLevel: 'intermediate',
        targetFocus: 'hypertrophy',
      };
      const equipment = [
        { type: 'dumbbell', availableWeightsKg: [6, 8, 10, 12, 14, 16, 20] },
        { type: 'barbell' },
        { type: 'bench' },
        { type: 'pullup_bar' },
      ];
      const result = generateBalancedWeeklyPlan(preferences, equipment, 75, [], 8, 25);
      printPlanInspection('C', 'Intermediate / 5d / Hypertrophy / Full Gym', result);
    },
  },

  // ---------------------------------------------------------------------------
  // SCENARIO D: Advanced / 6d / Strength / Full Gym
  // ---------------------------------------------------------------------------
  {
    id: 'D',
    name: 'Advanced / 6d / Strength / Full Gym (Barbell, Dumbbells, Bench, Pull-Up Bar)',
    run: () => {
      const preferences: IPlannerPreferences = {
        daysPerWeek: 6,
        sessionDurationMinutes: 60,
        splitStyle: 'ppl',
        experienceLevel: 'advanced',
        targetFocus: 'strength',
      };
      const equipment = [
        { type: 'dumbbell', availableWeightsKg: [10, 14, 18, 24, 30] },
        { type: 'barbell' },
        { type: 'bench' },
        { type: 'pullup_bar' },
      ];
      const result = generateBalancedWeeklyPlan(preferences, equipment, 82, [], 15, 40);
      printPlanInspection('D', 'Advanced / 6d / Strength / Full Gym', result);
    },
  },

  // ---------------------------------------------------------------------------
  // SCENARIO E: 0 Strict Pull-Ups (Capability Progression Check)
  // ---------------------------------------------------------------------------
  {
    id: 'E',
    name: 'Capability: 0 Strict Pull-Ups with Pull-Up Bar',
    run: () => {
      printDivider('=');
      console.log('SCENARIO E: CAPABILITY - 0 STRICT PULL-UPS');
      printDivider('=');
      const profileWithBar = buildEquipmentProfile([{ type: 'pullup_bar' }]);
      const prescWithBar = calibratePullupPrescription(0, profileWithBar, true);
      console.log(`  * Case 1: 0 Pull-ups WITH Pull-up Bar:`);
      console.log(`    Prescribed Movement: "${prescWithBar.exerciseName}" (${prescWithBar.targetSets} sets x ${prescWithBar.targetReps} ${prescWithBar.repUnit})`);
      console.log(`    Coaching Notes: ${prescWithBar.coachingNotes}`);
      console.log(`    Form Tips: ${prescWithBar.formTips.join(' | ')}`);

      const profileZero = buildEquipmentProfile([]);
      const prescZero = calibratePullupPrescription(0, profileZero, true);
      console.log(`\n  * Case 2: 0 Pull-ups with NO Pull-up Bar (Zero Equipment):`);
      console.log(`    Prescribed Movement: "${prescZero.exerciseName}" (${prescZero.targetSets} sets x ${prescZero.targetReps} ${prescZero.repUnit})`);
      console.log(`    Coaching Notes: ${prescZero.coachingNotes}`);
      console.log('\n');
    },
  },

  // ---------------------------------------------------------------------------
  // SCENARIO F: 2 Strict Pull-Ups (Eccentric Overload Tier)
  // ---------------------------------------------------------------------------
  {
    id: 'F',
    name: 'Capability: 2 Strict Pull-Ups (Tier 1 Eccentric Overload)',
    run: () => {
      printDivider('=');
      console.log('SCENARIO F: CAPABILITY - 2 STRICT PULL-UPS');
      printDivider('=');
      const profile = buildEquipmentProfile([{ type: 'pullup_bar' }]);
      const presc = calibratePullupPrescription(2, profile, true);
      console.log(`  Prescribed Movement: "${presc.exerciseName}" (${presc.targetSets} sets x ${presc.targetReps} ${presc.repUnit})`);
      console.log(`  Coaching Notes: ${presc.coachingNotes}`);
      console.log(`  Form Tips: ${presc.formTips.join(' | ')}\n`);
    },
  },

  // ---------------------------------------------------------------------------
  // SCENARIO G: 5 Strict Pull-Ups (Submaximal Clusters Tier)
  // ---------------------------------------------------------------------------
  {
    id: 'G',
    name: 'Capability: 5 Strict Pull-Ups (Tier 2 Sub-Maximal Clusters)',
    run: () => {
      printDivider('=');
      console.log('SCENARIO G: CAPABILITY - 5 STRICT PULL-UPS');
      printDivider('=');
      const profile = buildEquipmentProfile([{ type: 'pullup_bar' }]);
      const presc = calibratePullupPrescription(5, profile, true);
      console.log(`  Prescribed Movement: "${presc.exerciseName}" (${presc.targetSets} sets x ${presc.targetReps} ${presc.repUnit})`);
      console.log(`  Coaching Notes: ${presc.coachingNotes}`);
      console.log(`  Form Tips: ${presc.formTips.join(' | ')}\n`);
    },
  },

  // ---------------------------------------------------------------------------
  // SCENARIO H: 10+ Strict Pull-Ups (Mastery & External Load Tier)
  // ---------------------------------------------------------------------------
  {
    id: 'H',
    name: 'Capability: 10+ Strict Pull-Ups (Tier 4 Mastery / External Load)',
    run: () => {
      printDivider('=');
      console.log('SCENARIO H: CAPABILITY - 10+ STRICT PULL-UPS');
      printDivider('=');
      const profile = buildEquipmentProfile([{ type: 'pullup_bar' }]);
      const presc = calibratePullupPrescription(12, profile, false);
      console.log(`  Prescribed Movement: "${presc.exerciseName}" (${presc.targetSets} sets x ${presc.targetReps} ${presc.repUnit})`);
      console.log(`  Coaching Notes: ${presc.coachingNotes}`);
      console.log(`  Form Tips: ${presc.formTips.join(' | ')}\n`);
    },
  },

  // ---------------------------------------------------------------------------
  // SCENARIO I: No Equipment Program (Pure Floor)
  // ---------------------------------------------------------------------------
  {
    id: 'I',
    name: 'Hardware Isolation: Pure Floor Bodyweight Program',
    run: () => {
      const preferences: IPlannerPreferences = {
        daysPerWeek: 4,
        sessionDurationMinutes: 40,
        splitStyle: 'full_body',
        experienceLevel: 'beginner',
        targetFocus: 'general_fitness',
      };
      const result = generateBalancedWeeklyPlan(preferences, [], 68, [], 0, 5);
      printPlanInspection('I', 'Pure Floor Bodyweight (0 Equipment)', result);
    },
  },

  // ---------------------------------------------------------------------------
  // SCENARIO J: Dumbbells Only (No Bench, No Pull-Up Bar)
  // ---------------------------------------------------------------------------
  {
    id: 'J',
    name: 'Hardware Isolation: Dumbbells Only (No Bench, No Pull-Up Bar)',
    run: () => {
      const preferences: IPlannerPreferences = {
        daysPerWeek: 4,
        sessionDurationMinutes: 45,
        splitStyle: 'home_dumbbell',
        experienceLevel: 'beginner',
        targetFocus: 'general_fitness',
      };
      const equipment = [{ type: 'dumbbell', availableWeightsKg: [5, 7.5, 10] }];
      const result = generateBalancedWeeklyPlan(preferences, equipment, 72, [], 0, 10);
      printPlanInspection('J', 'Dumbbells Only (No Bench, No Bar)', result);
    },
  },

  // ---------------------------------------------------------------------------
  // SCENARIO K: Max Dumbbell Load Reached (Progressive Overload Variation Ladder)
  // ---------------------------------------------------------------------------
  {
    id: 'K',
    name: 'Overload Engine: Max Dumbbell Weight Ceiling & Biomechanical Ladder',
    run: () => {
      printDivider('=');
      console.log('SCENARIO K: PROGRESSION CEILING AT MAX DUMBBELL LOAD');
      printDivider('=');
      const profile = buildEquipmentProfile([{ type: 'dumbbell', availableWeightsKg: [4, 6, 8, 10] }]);
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
          { reps: 15, weightKg: 10, rpe: 7.5, completed: true },
        ],
      };
      const recommendation = evaluateDoubleProgression(evalData, profile);
      console.log(`  Exercise: ${evalData.exerciseName}`);
      console.log(`  State: Prescribed 10kg (Inventory Max) for 15 reps (Top of Bracket). Completed all sets cleanly.`);
      console.log(`  Adaptation Action: ${recommendation.type}`);
      console.log(`  New Target: ${recommendation.newWeightKg}kg x ${recommendation.newTargetReps} reps`);
      if (recommendation.swappedExerciseName) {
        console.log(`  Biomechanical Variation Advance: "${recommendation.swappedExerciseName}"`);
      }
      if (recommendation.tempoCues) {
        console.log(`  Tempo Modulation: ${recommendation.tempoCues}`);
      }
      console.log(`  Reason: ${recommendation.reason}\n`);
    },
  },

  // ---------------------------------------------------------------------------
  // SCENARIO L: Impossible Movement Requirement (Zero Fallback Regression)
  // ---------------------------------------------------------------------------
  {
    id: 'L',
    name: 'Engine Robustness: Impossible Movement Requirement (Zero Fallback)',
    run: () => {
      // User specifies home_dumbbell split with ZERO equipment (dumbbell movements required, 0 dumbbells available)
      const preferences: IPlannerPreferences = {
        daysPerWeek: 3,
        sessionDurationMinutes: 45,
        splitStyle: 'home_dumbbell',
        experienceLevel: 'beginner',
        targetFocus: 'general_fitness',
      };
      const result = generateBalancedWeeklyPlan(preferences, [], 70);
      printPlanInspection('L', 'Impossible Movement Requirement (Zero Dumbbells in Home Dumbbell Split)', result);
    },
  },

  // ---------------------------------------------------------------------------
  // SCENARIO M: Consecutive Lower-Body Days (Fatigue Differentiation)
  // ---------------------------------------------------------------------------
  {
    id: 'M',
    name: 'Recovery Scheduling: Consecutive Lower-Body Days Fatigue Differentiation',
    run: () => {
      printDivider('=');
      console.log('SCENARIO M: CONSECUTIVE LOWER-BODY FATIGUE DIFFERENTIATION');
      printDivider('=');
      const profile = buildEquipmentProfile([
        { type: 'barbell' },
        { type: 'dumbbell', availableWeightsKg: [4, 6, 8, 10] },
      ]);

      // Case 1: Adequate recovery (Squats Day 1 -> Calves/Core Day 2)
      const validSchedule: any[] = [
        {
          dayNumber: 1, dayName: 'Monday', isRestDay: false, title: 'Lower Body Strength', focus: 'Squats', targetMuscles: ['legs'], estimatedDurationMinutes: 45,
          exercises: [{ exerciseName: 'Dumbbell Goblet Squat', targetSets: 3, targetReps: 8, repUnit: 'reps', restSeconds: 75, targetMuscle: 'legs', equipment: 'dumbbell' }],
        },
        {
          dayNumber: 2, dayName: 'Tuesday', isRestDay: false, title: 'Lower Accessory & Core', focus: 'Calves and Abs', targetMuscles: ['legs', 'core'], estimatedDurationMinutes: 30,
          exercises: [
            { exerciseName: 'Dumbbell Standing Calf Raise', targetSets: 3, targetReps: 15, repUnit: 'reps', restSeconds: 45, targetMuscle: 'legs', equipment: 'dumbbell' },
            { exerciseName: 'Standard Forearm Plank', targetSets: 2, targetReps: 35, repUnit: 'seconds', restSeconds: 45, targetMuscle: 'core', equipment: 'bodyweight' },
          ],
        },
      ];
      const evalValid = scorePlanQuality(validSchedule, profile, 45);
      console.log(`  * Case 1 (Moderate Squat Day 1 -> Light Calves/Core Day 2):`);
      console.log(`    Critical Gate (noSevereRecoveryConflict): [${evalValid.score.criticalConstraintResult.noSevereRecoveryConflict ? 'PASS' : 'FAIL'}]`);
      console.log(`    Status: ${evalValid.score.status} | Score: ${evalValid.score.overallScore}/100`);

      // Case 2: Severe recovery conflict (Heavy Deadlift Day 1 -> Heavy Back Squat Day 2)
      const conflictSchedule: any[] = [
        {
          dayNumber: 1, dayName: 'Monday', isRestDay: false, title: 'Heavy Deadlift Day', focus: 'Spinal Loading', targetMuscles: ['legs', 'back'], estimatedDurationMinutes: 45,
          exercises: [{ exerciseName: 'Conventional Barbell Deadlift', targetSets: 4, targetReps: 5, repUnit: 'reps', restSeconds: 120, targetMuscle: 'legs', equipment: 'barbell' }],
        },
        {
          dayNumber: 2, dayName: 'Tuesday', isRestDay: false, title: 'Heavy Back Squat Day', focus: 'Spinal Loading', targetMuscles: ['legs'], estimatedDurationMinutes: 45,
          exercises: [{ exerciseName: 'Barbell Back Squat', targetSets: 4, targetReps: 6, repUnit: 'reps', restSeconds: 120, targetMuscle: 'legs', equipment: 'barbell' }],
        },
      ];
      const evalConflict = scorePlanQuality(conflictSchedule, profile, 45);
      console.log(`\n  * Case 2 (Heavy Barbell Deadlift Day 1 -> Heavy Barbell Squat Day 2):`);
      console.log(`    Critical Gate (noSevereRecoveryConflict): [${evalConflict.score.criticalConstraintResult.noSevereRecoveryConflict ? 'PASS' : 'FAIL'}]`);
      console.log(`    Status: ${evalConflict.score.status} | Score: ${evalConflict.score.overallScore}/100`);
      console.log(`    Violations Flagged: ${evalConflict.score.criticalConstraintResult.violations.join(' | ')}\n`);
    },
  },

  // ---------------------------------------------------------------------------
  // SCENARIO N: 30-Minute Constrained Session
  // ---------------------------------------------------------------------------
  {
    id: 'N',
    name: 'Time Optimization: 30-Minute Constrained Full-Body Session',
    run: () => {
      printDivider('=');
      console.log('SCENARIO N: 30-MINUTE CONSTRAINED SESSION INTENT PRESERVATION');
      printDivider('=');
      const candidateList = COMPREHENSIVE_EXERCISE_CATALOG.filter(e =>
        ['Push-Ups (Standard / Deficit)', 'Dumbbell Goblet Squat', 'Split-Stance One-Arm Dumbbell Row', 'Dumbbell Lateral Raise', 'Standard Forearm Plank'].includes(e.name)
      );

      const calibrated = calibrateSetsToTimeBudget(candidateList, 30, true, 'compact_efficient');
      const duration = calculateSessionDuration(calibrated, 30, 'compact_efficient');

      console.log(`  Time Budget Target: 30 minutes | Mode: compact_efficient`);
      console.log(`  Estimated Total Time: ${duration.totalEstimatedMinutes} minutes (Within budget: ${duration.isWithinBudget})`);
      console.log(`  Warm-up: ${duration.warmupMinutes}m | Active Lifting: ${duration.workoutExecutionMinutes}m`);
      console.log(`  Preserved Movements (${calibrated.length}):`);
      calibrated.forEach((c, idx) => {
        console.log(`    ${idx + 1}. ${c.exercise.name.padEnd(35)} | ${c.sets} sets | rest: ${c.restSeconds}s | mechanic: ${c.exercise.mechanic}`);
      });
      console.log('\n');
    },
  },
];

console.log('########################################################################');
console.log('STARTING MANUAL INSPECTION OF ALL 14 AUDIT SCENARIOS (A THROUGH N)');
console.log('########################################################################\n');

for (const s of scenarios) {
  s.run();
}

console.log('########################################################################');
console.log('INSPECTION COMPLETED FOR ALL 14 AUDIT SCENARIOS');
console.log('########################################################################');
