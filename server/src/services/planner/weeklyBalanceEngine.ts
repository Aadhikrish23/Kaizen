import {
  IPlannedDay,
  IPlannedExercise,
  IPlannerPreferences
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
  SplitStyle
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
import { calibrateSetsToTimeBudget } from './timeBudgetEngine';
import { buildConditioningStructure } from './conditioningEngine';
import { scorePlanQuality } from './plannerQualityScorer';

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
}

/**
 * Generate a complete, biomechanically balanced 7-day workout schedule
 */
export const generateBalancedWeeklyPlan = (
  preferences: IPlannerPreferences,
  userEquipmentList: any[] = [],
  userWeightKg: number = 70,
  knownWorkingWeights: Array<{ exerciseName: string; currentWeightKg: number }> = []
): PlanGenerationResult => {
  const isBeginner = preferences.experienceLevel === 'beginner';
  const profile = buildEquipmentProfile(userEquipmentList);

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
  let blueprintIndex = 0;

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
      continue;
    }

    // Select blueprint for this session
    const blueprint = blueprints[blueprintIndex % blueprints.length];
    blueprintIndex++;

    const sessionSelectedItems: ExerciseCatalogItem[] = [];

    // Exercises from the immediately preceding training day (to prevent back-to-back redundancy)
    const recentExercises = weeklyScheduledExercises.slice(-8);

    // Fill each slot defined in the blueprint
    for (const slot of blueprint.slots) {
      // Find candidate exercises compatible with slot requirements
      const candidates = exercisePool.filter(ex => {
        const allowedPatterns = Array.isArray(slot.pattern) ? slot.pattern : [slot.pattern];
        return allowedPatterns.includes(ex.movementPattern);
      });

      // Score each candidate
      const scoredCandidates = (candidates.length > 0 ? candidates : exercisePool).map(candidate => ({
        candidate,
        score: scoreExerciseCandidate({
          candidate,
          slot,
          selectedSessionExercises: sessionSelectedItems,
          recentSessionExercises: recentExercises,
          targetFocus: preferences.targetFocus as TargetFocus,
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
      }
    }

    // Calibrate sets, reps, and rest to the time budget (e.g. 45 min)
    const calibratedExercises = calibrateSetsToTimeBudget(
      sessionSelectedItems,
      preferences.sessionDurationMinutes || 45,
      isBeginner
    );

    // Build planned exercises with proper weights and notes
    const plannedExercises: IPlannedExercise[] = calibratedExercises.map(item => {
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
          // Select safe starting dumbbell from user's inventory
          if (['legs', 'chest', 'back'].includes(ex.targetMuscle)) {
            suggestedWeight = isBeginner ? (availableWeights[1] || availableWeights[0]) : (availableWeights[2] || availableWeights[0]);
          } else {
            suggestedWeight = availableWeights[0]; // lightest available for isolation/arms/shoulders
          }
        } else {
          suggestedWeight = isBeginner ? 6 : 10;
        }
      } else if (ex.equipment === 'barbell') {
        suggestedWeight = isBeginner ? 20 : 30;
      }

      // Beginner adaptation for Pull-Ups / Chin-Ups
      let targetReps = item.reps;
      let notes = `${preferences.experienceLevel.toUpperCase()} recommendation calibrated for ${preferences.targetFocus.replace('_', ' ')}.`;
      
      if (ex.name.toLowerCase().includes('pull-up') || ex.name.toLowerCase().includes('chin-up')) {
        if (isBeginner) {
          targetReps = 5; // Safe beginner range: 4-6 reps (or negatives)
          notes = 'Beginner Pull-Up Guidance: Perform controlled reps. If unable to complete 5 strict reps, execute slow 4-second eccentric negatives or use foot assistance.';
        }
      }

      // Time-based exercises (like Plank)
      if (ex.isTimeBased) {
        targetReps = ex.defaultTimeSeconds || 35;
        notes = `Time-based hold: maintain solid abdominal bracing for ${targetReps} seconds per set.`;
      }

      return {
        exerciseName: ex.name,
        targetMuscle: ex.targetMuscle,
        equipment: ex.equipment,
        targetSets: item.sets,
        targetReps,
        suggestedWeightKg: suggestedWeight,
        restSeconds: item.restSeconds,
        videoUrl: ex.videoUrl || 'https://www.youtube.com/embed/rT7DgCr-3pg',
        formTips: ex.formTips,
        notes,
      };
    });

    // Check if session is conditioning
    let sessionEstimatedMinutes = preferences.sessionDurationMinutes || 45;
    let sessionFocus = blueprint.focus;

    if (blueprint.isConditioningSession) {
      const condPlan = buildConditioningStructure(sessionSelectedItems, sessionEstimatedMinutes);
      sessionEstimatedMinutes = condPlan.estimatedMinutes;
      sessionFocus = `${blueprint.focus} • ${condPlan.sessionNotes}`;
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
    });
  }

  // Evaluate holistic quality score and balance metrics
  const { score: qualityScore, metrics: balanceMetrics } = scorePlanQuality(
    schedule,
    profile,
    preferences.sessionDurationMinutes || 45
  );

  return { schedule, qualityScore, balanceMetrics };
};
