import type { IPlannedDay } from '../../workouts/UserWorkoutPlan';

export interface SwapLoad {
  suggestedWeightKg?: number;
  needsCalibration: boolean;
}

/**
 * Starting load for a swapped-in exercise. We never invent a load: only a previously logged working
 * weight is used. Bodyweight movements have no load. Anything else needs the user to calibrate.
 */
export const resolveSwapLoad = (equipment: string, loggedWeightKg?: number): SwapLoad => {
  if (typeof loggedWeightKg === 'number' && loggedWeightKg > 0) {
    return { suggestedWeightKg: loggedWeightKg, needsCalibration: false };
  }
  if (equipment === 'bodyweight') return { suggestedWeightKg: 0, needsCalibration: false };
  return { suggestedWeightKg: undefined, needsCalibration: true };
};

/**
 * Apply a user-recorded working weight to every matching planned exercise that is awaiting calibration.
 * Returns true if anything changed.
 */
export const applyCalibratedWeight = (schedule: IPlannedDay[], exerciseName: string, weightKg: number): boolean => {
  if (!(weightKg > 0)) return false;
  const key = exerciseName.trim().toLowerCase();
  let changed = false;
  for (const day of schedule) {
    for (const ex of day.exercises) {
      if (ex.needsCalibration && ex.exerciseName.trim().toLowerCase() === key) {
        ex.suggestedWeightKg = weightKg;
        ex.needsCalibration = false;
        changed = true;
      }
    }
  }
  return changed;
};
