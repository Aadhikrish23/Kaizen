import {
  PlanQualityScore,
  WeeklyBalanceMetrics,
  CriticalConstraintResult,
  GoalBalanceTargets,
  MuscleVolumeBreakdown,
  DurationPolicy,
  TargetFocus,
} from './movementModel';
import { IPlannedDay } from '../../models/UserWorkoutPlan';
import { UserEquipmentProfile } from './inventoryEvaluator';
import { COMPREHENSIVE_EXERCISE_CATALOG } from './exerciseCatalog';
import { evaluateTimeCompliance } from './timeBudgetEngine';

/**
 * Goal-specific balance target profiles
 */
export const GOAL_BALANCE_TARGETS: Record<TargetFocus, GoalBalanceTargets> = {
  strength: {
    idealPushPullMin: 0.90,
    idealPushPullMax: 1.10,
    acceptablePushPullMin: 0.75,
    acceptablePushPullMax: 1.25,
    idealSquatHingeMin: 0.75,
    idealSquatHingeMax: 1.40,
    minWeeklyMajorMuscleSets: 8,
  },
  hypertrophy: {
    idealPushPullMin: 0.80,
    idealPushPullMax: 1.25, // Favors back/lat volume
    acceptablePushPullMin: 0.70,
    acceptablePushPullMax: 1.35,
    idealSquatHingeMin: 0.60,
    idealSquatHingeMax: 1.60,
    minWeeklyMajorMuscleSets: 10,
  },
  general_fitness: {
    idealPushPullMin: 0.85,
    idealPushPullMax: 1.15,
    acceptablePushPullMin: 0.70,
    acceptablePushPullMax: 1.30,
    idealSquatHingeMin: 0.60,
    idealSquatHingeMax: 1.80,
    minWeeklyMajorMuscleSets: 6,
  },
  fat_loss: {
    idealPushPullMin: 0.80,
    idealPushPullMax: 1.20,
    acceptablePushPullMin: 0.65,
    acceptablePushPullMax: 1.35,
    idealSquatHingeMin: 0.60,
    idealSquatHingeMax: 1.80,
    minWeeklyMajorMuscleSets: 6,
  },
};

/**
 * Score the holistic quality of a generated 7-day workout plan with hard critical gates
 */
export const scorePlanQuality = (
  schedule: IPlannedDay[],
  profile: UserEquipmentProfile,
  targetDurationMinutes: number = 45,
  targetFocus: TargetFocus = 'general_fitness',
  durationPolicy: DurationPolicy = 'approximate_target'
): { score: PlanQualityScore; metrics: WeeklyBalanceMetrics } => {
  const warnings: string[] = [];
  const strengths: string[] = [];
  const criticalViolations: string[] = [];

  let totalSets = 0;
  let pushSets = 0;
  let pullSets = 0;
  let squatSets = 0;
  let hingeSets = 0;
  let unilateralLegSets = 0;
  let bilateralLegSets = 0;
  let directArmSets = 0;
  let coreSets = 0;
  let conditioningSessions = 0;

  const muscleSetCounts: Record<string, number> = {};
  const muscleVolumeBreakdown: Record<string, MuscleVolumeBreakdown> = {};
  const movementPatternCounts: Record<string, number> = {};
  const repeatedExerciseCounts: Record<string, number> = {};

  let equipmentViolationCount = 0;
  let impossibleExerciseCount = 0;
  let prescriptionViolationCount = 0;
  let redundancyViolationCount = 0;
  let consecutiveFatigueViolations = 0;
  let durationViolations = 0;
  let timeComplianceTotalScore = 0;
  let activeDaysCount = 0;

  let lastDayPatterns: string[] = [];
  let lastDayHadHeavyLegs = false;

  const goalTargets = GOAL_BALANCE_TARGETS[targetFocus] || GOAL_BALANCE_TARGETS.general_fitness;

  for (const day of schedule) {
    if (day.isRestDay || day.exercises.length === 0) {
      lastDayPatterns = [];
      lastDayHadHeavyLegs = false;
      continue;
    }

    activeDaysCount++;

    // Evaluate time compliance for this session
    const timeEval = evaluateTimeCompliance(
      day.estimatedDurationMinutes || 45,
      targetDurationMinutes,
      durationPolicy
    );
    timeComplianceTotalScore += timeEval.score;
    if (timeEval.warning) {
      warnings.push(`${day.dayName}: ${timeEval.warning}`);
      if (durationPolicy === 'hard_ceiling' && (day.estimatedDurationMinutes || 0) > targetDurationMinutes) {
        durationViolations++;
        criticalViolations.push(
          `Duration ceiling violated on ${day.dayName}: ${day.estimatedDurationMinutes}m exceeds hard limit of ${targetDurationMinutes}m.`
        );
      }
    }

    if (day.title.toLowerCase().includes('conditioning') || day.focus.toLowerCase().includes('conditioning')) {
      conditioningSessions++;
    }

    const currentDayPatterns: string[] = [];
    const intraDaySubtypes = new Set<string>();
    let currentDayHasHeavyLegs = false;

    for (const ex of day.exercises) {
      const sets = ex.targetSets || 3;
      totalSets += sets;

      // Track prescription validity
      if (sets <= 0 || ex.targetReps <= 0) {
        prescriptionViolationCount++;
        criticalViolations.push(
          `Invalid prescription on ${day.dayName}: "${ex.exerciseName}" has invalid sets (${sets}) or reps (${ex.targetReps}).`
        );
      }

      // Track exercise frequency
      repeatedExerciseCounts[ex.exerciseName] = (repeatedExerciseCounts[ex.exerciseName] || 0) + 1;

      // Find catalog item
      const catItem = COMPREHENSIVE_EXERCISE_CATALOG.find(
        c => c.name.toLowerCase() === ex.exerciseName.toLowerCase()
      );

      if (!catItem) {
        // Unknown exercise in catalog
        warnings.push(`Exercise "${ex.exerciseName}" on ${day.dayName} not found in authoritative catalog.`);
      }

      const pattern = catItem?.movementPattern || (ex.targetMuscle === 'chest' ? 'horizontal_push' : 'horizontal_pull');
      const subtype = catItem?.movementSubtype || pattern;
      movementPatternCounts[pattern] = (movementPatternCounts[pattern] || 0) + sets;

      const primaryMuscle = (catItem?.targetMuscle || ex.targetMuscle).toLowerCase();
      muscleSetCounts[primaryMuscle] = (muscleSetCounts[primaryMuscle] || 0) + sets;

      // Fractional Volume Accounting
      if (!muscleVolumeBreakdown[primaryMuscle]) {
        muscleVolumeBreakdown[primaryMuscle] = { directSets: 0, indirectSets: 0, effectiveSets: 0 };
      }
      muscleVolumeBreakdown[primaryMuscle].directSets += sets;
      muscleVolumeBreakdown[primaryMuscle].effectiveSets += sets;

      // Secondary muscle synergistic credit
      if (catItem && catItem.mechanic === 'compound' && catItem.secondaryMuscles) {
        for (const sec of catItem.secondaryMuscles) {
          const secMuscle = sec.toLowerCase();
          if (!muscleVolumeBreakdown[secMuscle]) {
            muscleVolumeBreakdown[secMuscle] = { directSets: 0, indirectSets: 0, effectiveSets: 0 };
          }
          const indirectContribution = Math.round(sets * 0.5 * 10) / 10;
          muscleVolumeBreakdown[secMuscle].indirectSets += indirectContribution;
          muscleVolumeBreakdown[secMuscle].effectiveSets += indirectContribution;
        }
      }

      currentDayPatterns.push(pattern);

      // Check for heavy leg fatigue
      if (['squat', 'hinge'].includes(pattern) || (catItem && catItem.axialLoading === 'heavy')) {
        currentDayHasHeavyLegs = true;
      }

      // Check intra-day redundancy
      if (catItem) {
        if (intraDaySubtypes.has(subtype)) {
          redundancyViolationCount++;
          warnings.push(`Intra-session redundancy on ${day.dayName}: duplicate movement subtype "${subtype}".`);
        }
        intraDaySubtypes.add(subtype);

        // Hardware / Equipment Compliance Checks
        if (catItem.benchRequired && !profile.hasBench) {
          equipmentViolationCount++;
          criticalViolations.push(
            `Equipment violation on ${day.dayName}: "${ex.exerciseName}" requires a bench, but user profile has no bench.`
          );
        }
        if (catItem.pullupBarRequired && !profile.hasPullupBar) {
          equipmentViolationCount++;
          criticalViolations.push(
            `Equipment violation on ${day.dayName}: "${ex.exerciseName}" requires a pull-up bar, but user profile has no pull-up bar.`
          );
        }
        if (catItem.equipment === 'barbell' && !profile.hasBarbell) {
          equipmentViolationCount++;
          criticalViolations.push(
            `Equipment violation on ${day.dayName}: "${ex.exerciseName}" requires a barbell, but user profile has no barbell.`
          );
        }
        if (catItem.equipment === 'dumbbell' && !profile.hasDumbbells) {
          equipmentViolationCount++;
          criticalViolations.push(
            `Equipment violation on ${day.dayName}: "${ex.exerciseName}" requires dumbbells, but user profile has no dumbbells.`
          );
        }
      } else {
        // Fallback equipment checks if exercise is not in authoritative catalog
        impossibleExerciseCount++;
        criticalViolations.push(
          `Impossible / Unrecognized exercise on ${day.dayName}: "${ex.exerciseName}" is not registered in the exercise catalog.`
        );
        if (ex.equipment === 'dumbbell' && !profile.hasDumbbells) {
          equipmentViolationCount++;
          criticalViolations.push(
            `Equipment violation on ${day.dayName}: "${ex.exerciseName}" requires dumbbells, but user profile has no dumbbells.`
          );
        }
        if (ex.equipment === 'barbell' && !profile.hasBarbell) {
          equipmentViolationCount++;
          criticalViolations.push(
            `Equipment violation on ${day.dayName}: "${ex.exerciseName}" requires a barbell, but user profile has no barbell.`
          );
        }
        if (ex.exerciseName.toLowerCase().includes('bench') && !profile.hasBench) {
          equipmentViolationCount++;
          criticalViolations.push(
            `Equipment violation on ${day.dayName}: "${ex.exerciseName}" requires a bench, but user profile has no bench.`
          );
        }
      }

      // Pattern metrics aggregation
      if (['horizontal_push', 'vertical_push'].includes(pattern)) pushSets += sets;
      if (['horizontal_pull', 'vertical_pull'].includes(pattern)) pullSets += sets;
      if (pattern === 'squat') {
        squatSets += sets;
        bilateralLegSets += sets;
      }
      if (pattern === 'hinge') {
        hingeSets += sets;
        bilateralLegSets += sets;
      }
      if (pattern === 'lunge_single_leg') {
        unilateralLegSets += sets;
      }
      if (['elbow_flexion', 'elbow_extension'].includes(pattern) || ['biceps', 'triceps'].includes(primaryMuscle)) {
        directArmSets += sets;
      }
      if (pattern.startsWith('anti_') || pattern.includes('rotation') || primaryMuscle === 'core') {
        coreSets += sets;
      }
    }

    // Check consecutive heavy leg loading conflict
    if (lastDayHadHeavyLegs && currentDayHasHeavyLegs) {
      consecutiveFatigueViolations++;
      criticalViolations.push(
        `Severe recovery conflict: Consecutive heavy lower-body / axial loading days scheduled (${day.dayName}) without recovery.`
      );
    }

    lastDayPatterns = currentDayPatterns;
    lastDayHadHeavyLegs = currentDayHasHeavyLegs;
  }

  // Calculate Ratios with exact rounding
  const pushPullRatio = pullSets > 0 ? Math.round((pushSets / pullSets) * 100) / 100 : 1.0;
  const squatHingeRatio = hingeSets > 0 ? Math.round((squatSets / hingeSets) * 100) / 100 : 1.0;

  // 1. Movement Balance Score (0 - 100)
  let movementBalanceScore = 100;
  if (pushPullRatio < goalTargets.acceptablePushPullMin) {
    movementBalanceScore -= 30;
    warnings.push(`Severe Push/Pull imbalance: ratio is ${pushPullRatio} (minimum acceptable: ${goalTargets.acceptablePushPullMin}). Excessive pulling.`);
  } else if (pushPullRatio < goalTargets.idealPushPullMin) {
    movementBalanceScore -= 15;
    warnings.push(`Mild Push/Pull deficit: ratio is ${pushPullRatio} (ideal: ${goalTargets.idealPushPullMin} - ${goalTargets.idealPushPullMax}).`);
  } else if (pushPullRatio > goalTargets.acceptablePushPullMax) {
    movementBalanceScore -= 30;
    warnings.push(`Severe Push/Pull imbalance: ratio is ${pushPullRatio} (maximum acceptable: ${goalTargets.acceptablePushPullMax}). Excessive pushing.`);
  } else if (pushPullRatio > goalTargets.idealPushPullMax) {
    movementBalanceScore -= 15;
    warnings.push(`Mild Push/Pull excess: ratio is ${pushPullRatio} (ideal: ${goalTargets.idealPushPullMin} - ${goalTargets.idealPushPullMax}).`);
  } else {
    strengths.push(`Push and pull volume is optimally balanced for ${targetFocus} (ratio: ${pushPullRatio}).`);
  }

  if (hingeSets === 0 && squatSets > 0) {
    movementBalanceScore -= 40;
    warnings.push(`Zero hip hinge / posterior chain movements scheduled.`);
  } else if (squatHingeRatio < goalTargets.idealSquatHingeMin || squatHingeRatio > goalTargets.idealSquatHingeMax) {
    movementBalanceScore -= 20;
    warnings.push(`Squat to Hinge ratio (${squatHingeRatio}) falls outside ideal target (${goalTargets.idealSquatHingeMin} - ${goalTargets.idealSquatHingeMax}).`);
  } else {
    strengths.push(`Knee-dominant and hip-dominant lower body work are balanced (ratio: ${squatHingeRatio}).`);
  }
  movementBalanceScore = Math.max(0, Math.min(100, movementBalanceScore));

  // 2. Redundancy Score (0 - 100)
  let redundancyScore = 100 - (redundancyViolationCount * 25);
  // Cross-session unilateral leg frequency safeguard: max 2 unilateral leg movements in the week
  let totalUnilateralExercises = 0;
  for (const [exName, count] of Object.entries(repeatedExerciseCounts)) {
    const isUnilateral = exName.toLowerCase().includes('split squat') || exName.toLowerCase().includes('lunge');
    if (isUnilateral) {
      totalUnilateralExercises += count;
      if (count > 2) {
        redundancyScore -= 30;
        warnings.push(`Unilateral leg movement "${exName}" repeated ${count} times in the same week.`);
      }
    }
  }
  if (totalUnilateralExercises > 3) {
    redundancyScore -= 20;
    warnings.push(`Excessive weekly unilateral leg volume (${totalUnilateralExercises} unilateral sessions).`);
  }
  redundancyScore = Math.max(0, Math.min(100, redundancyScore));
  if (redundancyScore >= 90) {
    strengths.push('Low movement redundancy; exercises are functionally complementary.');
  }

  // 3. Equipment Compliance Score (0 - 100)
  let equipmentComplianceScore = 100 - (equipmentViolationCount * 50);
  equipmentComplianceScore = Math.max(0, Math.min(100, equipmentComplianceScore));
  if (equipmentComplianceScore === 100) {
    strengths.push('100% physically compliant with user hardware inventory (no bench assumptions).');
  }

  // 4. Recovery Score (0 - 100)
  let recoveryScore = 100 - (consecutiveFatigueViolations * 40);
  recoveryScore = Math.max(0, Math.min(100, recoveryScore));
  if (recoveryScore >= 90) {
    strengths.push('Recovery between muscle groups and movement patterns is well spaced.');
  }

  // 5. Muscle Coverage Score (0 - 100)
  let muscleCoverageScore = 100;
  const majorMuscles = ['chest', 'back', 'legs'];
  for (const m of majorMuscles) {
    const effective = muscleVolumeBreakdown[m]?.effectiveSets || muscleSetCounts[m] || 0;
    if (effective < goalTargets.minWeeklyMajorMuscleSets) {
      muscleCoverageScore -= 20;
      warnings.push(`Major muscle group "${m}" has insufficient weekly effective volume (${effective} sets vs min ${goalTargets.minWeeklyMajorMuscleSets}).`);
    }
  }
  if (directArmSets >= 4) {
    strengths.push(`Direct arm volume (biceps and triceps) is properly programmed (${directArmSets} sets).`);
  }
  muscleCoverageScore = Math.max(0, Math.min(100, muscleCoverageScore));

  // 6. Time Compliance Score (calculated dynamically)
  const timeComplianceScore = activeDaysCount > 0
    ? Math.round(timeComplianceTotalScore / activeDaysCount)
    : 100;

  // Evaluate Critical Constraints
  const criticalConstraintResult: CriticalConstraintResult = {
    isValid: criticalViolations.length === 0,
    equipmentCompliance: equipmentViolationCount === 0,
    impossibleExercise: impossibleExerciseCount === 0,
    intentFulfillment: true, // evaluated per session blueprint
    prescriptionValidity: prescriptionViolationCount === 0,
    durationCompliance: durationViolations === 0,
    noSevereRecoveryConflict: consecutiveFatigueViolations === 0,
    metadataValidity: true,
    violations: criticalViolations,
  };

  const isPlanValid = criticalConstraintResult.isValid;

  // Composite Score
  let compositeScore = Math.round(
    movementBalanceScore * 0.25 +
    redundancyScore * 0.20 +
    equipmentComplianceScore * 0.25 +
    recoveryScore * 0.15 +
    muscleCoverageScore * 0.15
  );

  // CRITICAL CONSTRAINT GATE: If any critical constraint fails, plan overall score cannot exceed 40!
  const overallScore = isPlanValid ? compositeScore : Math.min(compositeScore, 40);
  const status: 'VALID' | 'NEEDS_REPAIR' | 'REJECTED' = isPlanValid
    ? 'VALID'
    : equipmentViolationCount > 0 || impossibleExerciseCount > 0 || overallScore <= 35
      ? 'REJECTED'
      : 'NEEDS_REPAIR';

  const metrics: WeeklyBalanceMetrics = {
    totalSets,
    pushSets,
    pullSets,
    pushPullRatio,
    squatSets,
    hingeSets,
    squatHingeRatio,
    unilateralLegSets,
    bilateralLegSets,
    directArmSets,
    coreSets,
    conditioningSessions,
    muscleSetCounts,
    muscleVolumeBreakdown,
    movementPatternCounts,
    repeatedExerciseCounts,
  };

  const score: PlanQualityScore = {
    isValid: isPlanValid,
    status,
    criticalConstraintResult,
    overallScore,
    movementBalanceScore,
    muscleCoverageScore,
    recoveryScore,
    redundancyScore,
    equipmentComplianceScore,
    timeComplianceScore,
    experienceSuitabilityScore: 95,
    warnings,
    strengths,
  };

  return { score, metrics };
};
