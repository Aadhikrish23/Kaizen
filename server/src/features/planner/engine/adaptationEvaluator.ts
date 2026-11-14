import type { IPlannedDay, IPlannedExercise } from '../../workouts/UserWorkoutPlan';
import { COMPREHENSIVE_EXERCISE_CATALOG } from './exerciseCatalog';
import { UserEquipmentProfile } from './inventoryEvaluator';
import { evaluateDoubleProgression, AdaptationRecommendation, PerformanceSetData } from './progressiveOverloadEngine';

export interface LoggedExerciseLike {
  exerciseName: string;
  sets: PerformanceSetData[];
}

export interface SessionAdaptation {
  exerciseName: string;
  matchedPlanEx: IPlannedExercise;
  recommendation: AdaptationRecommendation;
  /** Mean of the RPE values the user actually logged on completed sets; undefined if none were logged. */
  avgLoggedRpe?: number;
}

/** The log for exactly the requested date (never "the newest log"). */
export const pickLogForDate = <T extends { date: string }>(logs: T[], date: string): T | undefined =>
  logs.find((l) => l.date === date);

/** Actual mean RPE of completed sets that carry an RPE; never a default. */
export const averageLoggedRpe = (sets: PerformanceSetData[]): number | undefined => {
  const rpes = sets.filter((s) => s.completed && typeof s.rpe === 'number').map((s) => s.rpe as number);
  if (rpes.length === 0) return undefined;
  return Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10;
};

/**
 * Evaluate one logged session against the plan. Pure: no I/O, so it can be unit-tested.
 * Exercises that are not part of the plan are skipped.
 */
export const evaluateSessionAdaptations = (
  schedule: IPlannedDay[],
  loggedExercises: LoggedExerciseLike[],
  profile: UserEquipmentProfile
): SessionAdaptation[] => {
  const out: SessionAdaptation[] = [];
  for (const loggedEx of loggedExercises) {
    const key = loggedEx.exerciseName.trim().toLowerCase();
    let matchedPlanEx: IPlannedExercise | undefined;
    for (const day of schedule) {
      const found = day.exercises.find((e) => e.exerciseName.trim().toLowerCase() === key);
      if (found) {
        matchedPlanEx = found;
        break;
      }
    }
    if (!matchedPlanEx) continue;
    // No known working weight (awaiting calibration): there is no prescription to evaluate, so do not invent one.
    if (matchedPlanEx.needsCalibration) continue;
    if (matchedPlanEx.suggestedWeightKg === undefined && matchedPlanEx.equipment !== 'bodyweight') continue;

    const catalogItem = COMPREHENSIVE_EXERCISE_CATALOG.find((c) => c.name.toLowerCase() === key);
    const minReps = catalogItem?.defaultRepRange.min || Math.max(matchedPlanEx.targetReps - 2, 6);
    const maxReps = catalogItem?.defaultRepRange.max || Math.min(matchedPlanEx.targetReps + 2, 12);

    const recommendation = evaluateDoubleProgression(
      {
        exerciseName: loggedEx.exerciseName,
        equipment: matchedPlanEx.equipment,
        currentPrescribedWeightKg: matchedPlanEx.suggestedWeightKg ?? 0,
        currentPrescribedReps: matchedPlanEx.targetReps || 10,
        minReps,
        maxReps,
        completedSets: loggedEx.sets.map((s) => ({ reps: s.reps, weightKg: s.weightKg, rpe: s.rpe, completed: s.completed })),
      },
      profile
    );
    out.push({ exerciseName: loggedEx.exerciseName, matchedPlanEx, recommendation, avgLoggedRpe: averageLoggedRpe(loggedEx.sets) });
  }
  return out;
};
