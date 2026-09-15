import { PlanQualityScore, WeeklyBalanceMetrics } from './movementModel';
import { IPlannedDay } from '../../models/UserWorkoutPlan';
import { UserEquipmentProfile } from './inventoryEvaluator';
import { COMPREHENSIVE_EXERCISE_CATALOG } from './exerciseCatalog';

/**
 * Score the holistic quality of a generated 7-day workout plan
 */
export const scorePlanQuality = (
  schedule: IPlannedDay[],
  profile: UserEquipmentProfile,
  targetDurationMinutes: number = 45
): { score: PlanQualityScore; metrics: WeeklyBalanceMetrics } => {
  const warnings: string[] = [];
  const strengths: string[] = [];

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
  const movementPatternCounts: Record<string, number> = {};
  const repeatedExerciseCounts: Record<string, number> = {};

  let equipmentViolationCount = 0;
  let redundancyViolationCount = 0;
  let consecutiveFatigueViolations = 0;

  let lastDayPrimaryPatterns: string[] = [];

  for (const day of schedule) {
    if (day.isRestDay || day.exercises.length === 0) {
      lastDayPrimaryPatterns = [];
      continue;
    }

    if (day.title.toLowerCase().includes('conditioning') || day.focus.toLowerCase().includes('conditioning')) {
      conditioningSessions++;
    }

    const currentDayPatterns: string[] = [];
    const intraDaySubtypes = new Set<string>();

    for (const ex of day.exercises) {
      const sets = ex.targetSets || 3;
      totalSets += sets;

      // Track exercise frequency
      repeatedExerciseCounts[ex.exerciseName] = (repeatedExerciseCounts[ex.exerciseName] || 0) + 1;

      // Find catalog item
      const catItem = COMPREHENSIVE_EXERCISE_CATALOG.find(
        c => c.name.toLowerCase() === ex.exerciseName.toLowerCase()
      );

      const pattern = catItem?.movementPattern || (ex.targetMuscle === 'chest' ? 'horizontal_push' : 'horizontal_pull');
      const subtype = catItem?.movementSubtype || pattern;
      movementPatternCounts[pattern] = (movementPatternCounts[pattern] || 0) + sets;

      const muscle = ex.targetMuscle.toLowerCase();
      muscleSetCounts[muscle] = (muscleSetCounts[muscle] || 0) + sets;

      currentDayPatterns.push(pattern);

      // Check intra-day redundancy
      if (catItem) {
        if (intraDaySubtypes.has(subtype)) {
          redundancyViolationCount++;
          warnings.push(`Intra-session redundancy on ${day.dayName}: duplicate movement subtype "${subtype}".`);
        }
        intraDaySubtypes.add(subtype);

        // Check equipment compatibility
        if (catItem.benchRequired && !profile.hasBench) {
          equipmentViolationCount++;
          warnings.push(`Equipment violation on ${day.dayName}: "${ex.exerciseName}" requires a bench, but user lacks one.`);
        }
        if (catItem.pullupBarRequired && !profile.hasPullupBar) {
          equipmentViolationCount++;
          warnings.push(`Equipment violation on ${day.dayName}: "${ex.exerciseName}" requires a pull-up bar, but user lacks one.`);
        }
      }

      // Pattern metrics
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
      if (['elbow_flexion', 'elbow_extension'].includes(pattern) || ['biceps', 'triceps'].includes(muscle)) {
        directArmSets += sets;
      }
      if (pattern.startsWith('anti_') || pattern.includes('rotation') || muscle === 'core') {
        coreSets += sets;
      }
    }

    // Check consecutive high-fatigue conflicts (e.g. heavy leg work on back-to-back days)
    const hadLegsYesterday = lastDayPrimaryPatterns.some(p => ['squat', 'hinge', 'lunge_single_leg'].includes(p));
    const hasLegsToday = currentDayPatterns.some(p => ['squat', 'hinge', 'lunge_single_leg'].includes(p));
    if (hadLegsYesterday && hasLegsToday) {
      consecutiveFatigueViolations++;
      warnings.push(`Consecutive lower body loading detected without an intervening rest or upper day.`);
    }

    lastDayPrimaryPatterns = currentDayPatterns;
  }

  // Calculate Ratios
  const pushPullRatio = pullSets > 0 ? Math.round((pushSets / pullSets) * 100) / 100 : 1.0;
  const squatHingeRatio = hingeSets > 0 ? Math.round((squatSets / hingeSets) * 100) / 100 : 1.0;

  // 1. Movement Balance Score (0 - 100)
  let movementBalanceScore = 100;
  if (pushPullRatio < 0.75 || pushPullRatio > 1.35) {
    movementBalanceScore -= 20;
    warnings.push(`Push/Pull volume is imbalanced (ratio: ${pushPullRatio}; ideal: 0.85 - 1.15).`);
  } else {
    strengths.push(`Push and pull volume is well balanced (ratio: ${pushPullRatio}).`);
  }

  if (hingeSets === 0 && squatSets > 0) {
    movementBalanceScore -= 30;
    warnings.push(`Zero hip hinge / posterior chain movements scheduled.`);
  } else if (squatHingeRatio < 0.6 || squatHingeRatio > 1.8) {
    movementBalanceScore -= 15;
  } else {
    strengths.push(`Knee-dominant and hip-dominant lower body work are balanced (ratio: ${squatHingeRatio}).`);
  }

  // 2. Redundancy Score (0 - 100)
  let redundancyScore = 100 - (redundancyViolationCount * 25);
  // Check if any unilateral leg exercise appears more than 2x
  for (const [exName, count] of Object.entries(repeatedExerciseCounts)) {
    if (exName.toLowerCase().includes('split squat') || exName.toLowerCase().includes('lunge')) {
      if (count > 2) {
        redundancyScore -= 30;
        warnings.push(`Unilateral leg movement "${exName}" repeated ${count} times in the same week.`);
      }
    }
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
  let recoveryScore = 100 - (consecutiveFatigueViolations * 35);
  recoveryScore = Math.max(0, Math.min(100, recoveryScore));
  if (recoveryScore >= 90) {
    strengths.push('Recovery between muscle groups and movement patterns is well spaced.');
  }

  // 5. Muscle Coverage Score (0 - 100)
  let muscleCoverageScore = 100;
  const majorMuscles = ['chest', 'back', 'legs'];
  for (const m of majorMuscles) {
    if (!muscleSetCounts[m] || muscleSetCounts[m] < 6) {
      muscleCoverageScore -= 20;
      warnings.push(`Major muscle group "${m}" has insufficient weekly volume (${muscleSetCounts[m] || 0} sets).`);
    }
  }
  if (directArmSets >= 4) {
    strengths.push(`Direct arm volume (biceps and triceps) is properly programmed (${directArmSets} sets).`);
  }

  // 6. Time Compliance Score
  const timeComplianceScore = 95;

  // Composite Overall Score
  const overallScore = Math.round(
    movementBalanceScore * 0.25 +
    redundancyScore * 0.20 +
    equipmentComplianceScore * 0.25 +
    recoveryScore * 0.15 +
    muscleCoverageScore * 0.15
  );

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
    movementPatternCounts,
    repeatedExerciseCounts,
  };

  const score: PlanQualityScore = {
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
