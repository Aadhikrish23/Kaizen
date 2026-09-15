import { ExerciseCatalogItem } from './movementModel';

export interface PlannedExerciseWithSets {
  exercise: ExerciseCatalogItem;
  sets: number;
  reps: number;
  restSeconds: number;
  isTimeBased: boolean;
  timeSeconds?: number;
}

export interface SessionTimeBudget {
  warmupMinutes: number;
  workoutExecutionMinutes: number;
  totalEstimatedMinutes: number;
  targetDurationMinutes: number;
  isWithinBudget: boolean;
}

/**
 * Estimate total duration for a session given exercises, sets, and rest intervals
 */
export const calculateSessionDuration = (
  exercises: PlannedExerciseWithSets[],
  warmupMinutes: number = 5
): SessionTimeBudget => {
  let totalSeconds = warmupMinutes * 60;

  for (let i = 0; i < exercises.length; i++) {
    const item = exercises[i];
    const setTime = item.isTimeBased ? (item.timeSeconds || 30) : (item.reps * 3.5); // ~3.5s per rep eccentric/concentric
    
    // Total execution for all sets
    totalSeconds += item.sets * setTime;
    
    // Rest periods between sets
    const restBetweenSets = (item.sets - 1) * item.restSeconds;
    totalSeconds += restBetweenSets;
    
    // Transition to next exercise (except after last)
    if (i < exercises.length - 1) {
      totalSeconds += 60; // 60s transition buffer
    }
  }

  const totalEstimatedMinutes = Math.round(totalSeconds / 60);

  return {
    warmupMinutes,
    workoutExecutionMinutes: totalEstimatedMinutes - warmupMinutes,
    totalEstimatedMinutes,
    targetDurationMinutes: 45,
    isWithinBudget: Math.abs(totalEstimatedMinutes - 45) <= 10,
  };
};

/**
 * Adjust volume or sets to ensure session stays close to user target duration (e.g. 45 mins)
 */
export const calibrateSetsToTimeBudget = (
  exercises: ExerciseCatalogItem[],
  targetDurationMinutes: number = 45,
  isBeginner: boolean = true
): PlannedExerciseWithSets[] => {
  // Target total working sets for 45 min workout is typically 12-16 sets
  let defaultSetsPerExercise = 3;
  if (targetDurationMinutes <= 30) {
    defaultSetsPerExercise = 2;
  } else if (targetDurationMinutes >= 60) {
    defaultSetsPerExercise = 4;
  }

  const result: PlannedExerciseWithSets[] = exercises.map((ex, idx) => {
    // Primary compound lifts get 3-4 sets, secondary/accessory get 2-3 sets
    let sets = defaultSetsPerExercise;
    if (idx === 0 && targetDurationMinutes >= 45) {
      sets = Math.min(defaultSetsPerExercise, 4);
    } else if (idx >= 4) {
      sets = Math.max(2, defaultSetsPerExercise - 1);
    }

    // Reps & Rest calibrated to mechanic and beginner status
    let reps = ex.defaultRepRange.min;
    if (ex.mechanic === 'compound') {
      reps = isBeginner ? ex.defaultRepRange.min : Math.round((ex.defaultRepRange.min + ex.defaultRepRange.max) / 2);
    } else {
      reps = ex.defaultRepRange.max;
    }

    let rest = ex.defaultRestSeconds;
    if (isBeginner && ex.mechanic === 'compound') {
      rest = Math.max(rest, 75); // Ensure beginners get adequate recovery on compounds
    }

    return {
      exercise: ex,
      sets,
      reps,
      restSeconds: rest,
      isTimeBased: ex.isTimeBased,
      timeSeconds: ex.defaultTimeSeconds || 30,
    };
  });

  return result;
};
