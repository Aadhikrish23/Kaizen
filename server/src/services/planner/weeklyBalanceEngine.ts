import {
  IPlannedDay,
  IPlannedExercise,
  IPlannerPreferences,
  IConditioningProtocolData
} from '../../models/UserWorkoutPlan';
import {
  COMPREHENSIVE_EXERCISE_CATALOG
} from './exerciseCatalog';
import {
  ExerciseCatalogItem,
  PlanQualityScore,
  WeeklyBalanceMetrics,
  ExperienceLevel,
  TargetFocus,
  SplitStyle,
  DurationPolicy,
  ExerciseDecisionExplanation
} from './movementModel';
import {
  buildEquipmentProfile,
  isExerciseCompatibleWithProfile,
  UserEquipmentProfile
} from './inventoryEvaluator';
import {
  getSessionBlueprintsForSplit,
  validateSessionIntentFulfillment
} from './sessionIntentValidator';
import { scoreExerciseCandidate } from './redundancyDetector';
import { calibrateSetsToTimeBudget, calculateSessionDuration } from './timeBudgetEngine';
import { buildConditioningStructure, formatConditioningExercise } from './conditioningEngine';
import { scorePlanQuality } from './plannerQualityScorer';
import { calibratePullupPrescription, calibratePushupPrescription } from './bodyweightProgressionEngine';
import { explainExerciseDecision } from './plannerExplainability';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const getWorkoutDayIndices = (daysCount: number): number[] => {
  switch (daysCount) {
    case 1:
      return [0]; // Monday
    case 2:
      return [0, 3]; // Monday, Thursday
    case 3:
      return [0, 2, 4]; // Monday, Wednesday, Friday
    case 4:
      return [0, 1, 3, 4]; // Monday, Tuesday, Thursday, Friday
    case 5:
      return [0, 1, 2, 4, 5]; // Monday, Tuesday, Wednesday, Friday, Saturday (Rest: Thu, Sun)
    case 6:
      return [0, 1, 2, 3, 4, 5]; // Monday - Saturday (Rest: Sun)
    case 7:
      return [0, 1, 2, 3, 4, 5, 6]; // All 7 days
    default:
      return [0, 2, 4];
  }
};

export interface PlanGenerationResult {
  schedule: IPlannedDay[];
  qualityScore: PlanQualityScore;
  balanceMetrics: WeeklyBalanceMetrics;
  explanations?: ExerciseDecisionExplanation[];
}

/**
 * Generate a complete, biomechanically balanced 7-day workout schedule
 */
export const generateBalancedWeeklyPlan = (
  preferences: IPlannerPreferences,
  userEquipmentList: any[] = [],
  userWeightKg: number = 70,
  knownWorkingWeights: Array<{ exerciseName: string; currentWeightKg: number }> = [],
  userBaselinePullups: number = 0,
  userBaselinePushups: number = 5
): PlanGenerationResult => {
  const isBeginner = preferences.experienceLevel === 'beginner';
  const profile = buildEquipmentProfile(userEquipmentList);
  const durationPolicy: DurationPolicy = (preferences as any).durationPolicy || 'approximate_target';
  const targetFocus: TargetFocus = preferences.targetFocus as TargetFocus || 'general_fitness';

  // 1. Filter database catalog down to physical hardware compatible pool
  const compatiblePool = COMPREHENSIVE_EXERCISE_CATALOG.filter(ex =>
    isExerciseCompatibleWithProfile(ex, profile)
  );

  // Fallback to pure floor bodyweight if hardware is completely empty
  const exercisePool = compatiblePool.length > 0
    ? compatiblePool
    : COMPREHENSIVE_EXERCISE_CATALOG.filter(ex =>
        ex.equipment === 'bodyweight' && !ex.pullupBarRequired && !ex.benchRequired
      );

  // 2. Obtain session blueprints for the chosen split
  const blueprints = getSessionBlueprintsForSplit(preferences.splitStyle as SplitStyle);
  const daysCount = Math.min(Math.max(Number(preferences.daysPerWeek) || 3, 1), 7);
  const workoutIndices = getWorkoutDayIndices(daysCount);

  const schedule: IPlannedDay[] = [];
  const weeklyScheduledExercises: ExerciseCatalogItem[] = [];
  const allExplanations: ExerciseDecisionExplanation[] = [];
  let blueprintIndex = 0;

  // Fatigue tracking across days
  let lastWorkoutDayHadHeavyLegs = false;

  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const dayName = preferences.preferredDays && preferences.preferredDays[dayIdx]
      ? preferences.preferredDays[dayIdx]
      : DAY_NAMES[dayIdx];

    const isWorkoutDay = workoutIndices.includes(dayIdx);

    if (!isWorkoutDay) {
      schedule.push({
        dayNumber: dayIdx + 1,
        dayName,
        isRestDay: true,
        title: 'Rest & Neuromuscular Recovery',
        focus: 'Active recovery, soft tissue restoration, and hydration',
        targetMuscles: [],
        estimatedDurationMinutes: 0,
        exercises: [],
      });
      lastWorkoutDayHadHeavyLegs = false;
      continue;
    }

    // Select blueprint for this session
    const blueprint = blueprints[blueprintIndex % blueprints.length];
    blueprintIndex++;

    const sessionSelectedItems: ExerciseCatalogItem[] = [];
    const recentExercises = weeklyScheduledExercises.slice(-8);

    // Check if subsequent day (tomorrow) is a heavy lower body / posterior chain day
    const nextDayIdx = dayIdx + 1;
    const isTomorrowWorkoutDay = workoutIndices.includes(nextDayIdx);
    const nextBlueprint = isTomorrowWorkoutDay ? blueprints[blueprintIndex % blueprints.length] : null;
    const tomorrowHasHeavyLegs = nextBlueprint
      ? (nextBlueprint.intent.includes('Lower') || nextBlueprint.intent.includes('Posterior') || nextBlueprint.primaryMuscles.includes('legs'))
      : false;

    // Fill each slot defined in the blueprint
    for (const slot of blueprint.slots) {
      const allowedPatterns = Array.isArray(slot.pattern) ? slot.pattern : [slot.pattern];

      // Filter candidates compatible with slot requirements
      let candidates = exercisePool.filter(ex => allowedPatterns.includes(ex.movementPattern));

      // FATIGUE / RECOVERY SAFEGUARD:
      // If yesterday had heavy legs OR tomorrow has heavy legs/deadlifts, do not prescribe squats or leg fatigue in this slot
      if (lastWorkoutDayHadHeavyLegs || tomorrowHasHeavyLegs) {
        if (blueprint.isConditioningSession) {
          // Keep conditioning to upper body and core, non-leg movements
          const nonLegCandidates = candidates.filter(
            c => c.movementPattern !== 'squat' && c.targetMuscle !== 'legs' && c.movementSubtype !== 'plyometric_squat'
          );
          if (nonLegCandidates.length > 0) {
            candidates = nonLegCandidates;
          }
        }
      }

      const availableCandidates = candidates.length > 0 ? candidates : exercisePool;

      // Score each candidate
      const scoredCandidates = availableCandidates.map(candidate => ({
        candidate,
        score: scoreExerciseCandidate({
          candidate,
          slot,
          selectedSessionExercises: sessionSelectedItems,
          recentSessionExercises: recentExercises,
          targetFocus,
          experienceLevel: preferences.experienceLevel as ExperienceLevel,
        }),
      }));

      // Sort by highest score
      scoredCandidates.sort((a, b) => b.score - a.score);

      // Pick the best non-duplicate exercise for this slot
      const best = scoredCandidates.find(sc => !sessionSelectedItems.some(s => s.name === sc.candidate.name));
      if (best) {
        sessionSelectedItems.push(best.candidate);
        weeklyScheduledExercises.push(best.candidate);

        // Generate explainability log
        const explanation = explainExerciseDecision(
          best.candidate,
          slot,
          availableCandidates,
          profile,
          sessionSelectedItems,
          recentExercises,
          lastWorkoutDayHadHeavyLegs
        );
        allExplanations.push(explanation);
      }
    }

    // Determine if today had heavy legs
    const todayHasHeavyLegs = sessionSelectedItems.some(
      ex => ['squat', 'hinge'].includes(ex.movementPattern) || (ex.targetMuscle === 'legs' && ex.axialLoading === 'heavy')
    );
    lastWorkoutDayHadHeavyLegs = todayHasHeavyLegs;

    let plannedExercises: IPlannedExercise[] = [];
    let sessionEstimatedMinutes = preferences.sessionDurationMinutes || 45;
    let sessionFocus = blueprint.focus;
    let conditioningProtocolData: IConditioningProtocolData | undefined;

    // Handle Conditioning vs Lifting sessions
    if (blueprint.isConditioningSession) {
      const condPlan = buildConditioningStructure(sessionSelectedItems, sessionEstimatedMinutes);
      sessionEstimatedMinutes = condPlan.estimatedMinutes;
      sessionFocus = `${blueprint.focus} • ${condPlan.sessionNotes}`;
      conditioningProtocolData = condPlan.protocol;

      plannedExercises = sessionSelectedItems.map((ex, idx) => {
        let suggestedWeight = 0;
        if (ex.equipment === 'dumbbell') {
          suggestedWeight = profile.availableDumbbellWeightsKg.length > 0
            ? (profile.availableDumbbellWeightsKg[0] || 4)
            : 6;
        }
        return formatConditioningExercise(ex, condPlan, idx, suggestedWeight);
      });
    } else {
      // Standard lifting session: calibrate sets to duration policy
      const calibrated = calibrateSetsToTimeBudget(
        sessionSelectedItems,
        sessionEstimatedMinutes,
        isBeginner,
        durationPolicy
      );

      const budget = calculateSessionDuration(calibrated, sessionEstimatedMinutes, durationPolicy);
      sessionEstimatedMinutes = budget.totalEstimatedMinutes;

      plannedExercises = calibrated.map(item => {
        const ex = item.exercise;

        // Determine starting weight
        const loggedWw = knownWorkingWeights.find(
          ww => ww.exerciseName.trim().toLowerCase() === ex.name.trim().toLowerCase()
        );

        let suggestedWeight = 0;
        if (loggedWw && loggedWw.currentWeightKg > 0) {
          suggestedWeight = loggedWw.currentWeightKg;
        } else if (ex.equipment === 'dumbbell') {
          const availableWeights = profile.availableDumbbellWeightsKg;
          if (availableWeights.length > 0) {
            if (['legs', 'chest', 'back'].includes(ex.targetMuscle)) {
              suggestedWeight = isBeginner ? (availableWeights[1] || availableWeights[0]) : (availableWeights[2] || availableWeights[0]);
            } else {
              suggestedWeight = availableWeights[0];
            }
          } else {
            suggestedWeight = isBeginner ? 6 : 10;
          }
        } else if (ex.equipment === 'barbell') {
          suggestedWeight = isBeginner ? 20 : 30;
        }

        let exerciseName = ex.name;
        let targetSets = item.sets;
        let targetReps = item.reps;
        let repUnit: 'reps' | 'seconds' = ex.isTimeBased ? 'seconds' : 'reps';
        let restSeconds = item.restSeconds;
        let notes = `${preferences.experienceLevel.toUpperCase()} prescription calibrated for ${targetFocus.replace('_', ' ')}.`;
        let formTips = ex.formTips;

        // Capability-based pull-up calibration
        if (ex.name.toLowerCase().includes('pull-up') || ex.name.toLowerCase().includes('chin-up')) {
          const calibratedPullup = calibratePullupPrescription(userBaselinePullups, isBeginner);
          exerciseName = calibratedPullup.exerciseName;
          targetSets = calibratedPullup.targetSets;
          targetReps = calibratedPullup.targetReps;
          repUnit = calibratedPullup.repUnit;
          restSeconds = calibratedPullup.restSeconds;
          notes = calibratedPullup.coachingNotes;
          formTips = calibratedPullup.formTips;
        }

        // Capability-based push-up calibration
        if (ex.name.toLowerCase().includes('push-up') && !ex.name.toLowerCase().includes('renegade')) {
          const calibratedPushup = calibratePushupPrescription(userBaselinePushups, profile.hasPushupBars, isBeginner);
          exerciseName = calibratedPushup.exerciseName;
          targetSets = calibratedPushup.targetSets;
          targetReps = calibratedPushup.targetReps;
          repUnit = calibratedPushup.repUnit;
          restSeconds = calibratedPushup.restSeconds;
          notes = calibratedPushup.coachingNotes;
          formTips = calibratedPushup.formTips;
        }

        // Time-based exercises (like Plank)
        if (ex.isTimeBased) {
          targetReps = ex.defaultTimeSeconds || 35;
          repUnit = 'seconds';
          notes = `Time-based hold: maintain solid abdominal bracing for ${targetReps} seconds per set.`;
        }

        return {
          exerciseName,
          targetMuscle: ex.targetMuscle,
          equipment: ex.equipment,
          targetSets,
          targetReps,
          repUnit,
          suggestedWeightKg: suggestedWeight,
          restSeconds,
          videoUrl: ex.videoUrl || 'https://www.youtube.com/embed/rT7DgCr-3pg',
          formTips,
          notes,
          movementPattern: ex.movementPattern,
        };
      });
    }

    schedule.push({
      dayNumber: dayIdx + 1,
      dayName,
      isRestDay: false,
      title: blueprint.title,
      focus: sessionFocus,
      targetMuscles: blueprint.primaryMuscles,
      estimatedDurationMinutes: sessionEstimatedMinutes,
      exercises: plannedExercises,
      conditioningProtocol: conditioningProtocolData,
    });
  }

  // Holistic quality scoring with hard critical constraint gates
  const { score: qualityScore, metrics: balanceMetrics } = scorePlanQuality(
    schedule,
    profile,
    preferences.sessionDurationMinutes || 45,
    targetFocus,
    durationPolicy
  );

  return { schedule, qualityScore, balanceMetrics, explanations: allExplanations };
};
