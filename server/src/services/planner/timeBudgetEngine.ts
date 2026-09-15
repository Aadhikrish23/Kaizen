import { ExerciseCatalogItem, DurationPolicy } from './movementModel';

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
  policy: DurationPolicy;
}

/**
 * Estimate total duration for a session given exercises, sets, and rest intervals
 */
export const calculateSessionDuration = (
  exercises: PlannedExerciseWithSets[],
  targetDurationMinutes: number = 45,
  policy: DurationPolicy = 'approximate_target',
  warmupMinutes?: number
): SessionTimeBudget => {
  const defaultWarmup = targetDurationMinutes <= 25 ? 3 : targetDurationMinutes >= 55 ? 7 : 5;
  const warmup = warmupMinutes !== undefined ? warmupMinutes : defaultWarmup;
  const cooldown = targetDurationMinutes >= 55 ? 4 : 0;
  let totalSeconds = (warmup + cooldown) * 60;

  for (let i = 0; i < exercises.length; i++) {
    const item = exercises[i];
    const repTime = item.isTimeBased ? (item.timeSeconds || 30) : (item.reps * 3.5); // ~3.5s per rep
    
    // Total execution for all sets
    totalSeconds += item.sets * repTime;
    
    // Specific ramp-up sets on compound movements for longer sessions
    if (targetDurationMinutes >= 55 && item.exercise.mechanic === 'compound' && i < 3) {
      totalSeconds += 90; // 2 ramp-up warm-up sets (90s total)
    }

    // Rest periods between sets
    const restBetweenSets = Math.max(0, item.sets - 1) * item.restSeconds;
    totalSeconds += restBetweenSets;
    
    // Transition to next exercise
    if (i < exercises.length - 1) {
      totalSeconds += targetDurationMinutes >= 55 ? 60 : 45; // equipment buffer
    }
  }

  const totalEstimatedMinutes = Math.round(totalSeconds / 60);

  let isWithinBudget = false;
  if (policy === 'hard_ceiling') {
    isWithinBudget = totalEstimatedMinutes <= targetDurationMinutes;
  } else if (policy === 'compact_efficient') {
    isWithinBudget = totalEstimatedMinutes <= 30;
  } else {
    // approximate_target: within 15% or 5 minutes
    const tolerance = Math.max(5, Math.round(targetDurationMinutes * 0.15));
    isWithinBudget = Math.abs(totalEstimatedMinutes - targetDurationMinutes) <= tolerance;
  }

  return {
    warmupMinutes: warmup,
    workoutExecutionMinutes: Math.max(0, totalEstimatedMinutes - warmup),
    totalEstimatedMinutes,
    targetDurationMinutes,
    isWithinBudget,
    policy,
  };
};

/**
 * Adjust volume or sets to ensure session strictly respects duration target and policy
 */
export const calibrateSetsToTimeBudget = (
  exercises: ExerciseCatalogItem[],
  targetDurationMinutes: number = 45,
  isBeginner: boolean = true,
  policy: DurationPolicy = 'approximate_target'
): PlannedExerciseWithSets[] => {
  // Base set allocations
  let defaultSetsPerExercise = 3;
  let maxExercisesToKeep = exercises.length;

  if (targetDurationMinutes <= 25 || policy === 'compact_efficient') {
    defaultSetsPerExercise = 2;
    maxExercisesToKeep = Math.min(exercises.length, 3); // 3 focused exercises for 20m express
  } else if (targetDurationMinutes <= 35) {
    defaultSetsPerExercise = 2;
    maxExercisesToKeep = Math.min(exercises.length, 4);
  } else if (targetDurationMinutes >= 60) {
    defaultSetsPerExercise = 4;
  }

  const activeExercises = exercises.slice(0, maxExercisesToKeep);

  let planned: PlannedExerciseWithSets[] = activeExercises.map((ex, idx) => {
    let sets = defaultSetsPerExercise;
    if (idx === 0 && targetDurationMinutes >= 45) {
      sets = Math.min(defaultSetsPerExercise + 1, 4); // Anchor compound lift gets an extra set
    } else if (idx >= 3 && targetDurationMinutes < 50) {
      sets = Math.max(2, defaultSetsPerExercise);
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
      rest = Math.max(rest, 75); // Adequate recovery for beginners
    }
    if (targetDurationMinutes >= 55 && ex.mechanic === 'compound') {
      rest = Math.max(rest, 90); // Adequate recovery on compound lifts for long sessions
    }
    if (targetDurationMinutes <= 25) {
      rest = Math.min(rest, 45); // Shorter rest for express workouts
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

  // If hard_ceiling is requested, dynamically trim accessory sets if calculation exceeds budget
  if (policy === 'hard_ceiling') {
    let budget = calculateSessionDuration(planned, targetDurationMinutes, policy);
    let attempts = 0;
    while (budget.totalEstimatedMinutes > targetDurationMinutes && attempts < 10) {
      attempts++;
      // Find an exercise with sets > 2 to reduce, starting from the back
      let reduced = false;
      for (let i = planned.length - 1; i >= 0; i--) {
        if (planned[i].sets > 2) {
          planned[i].sets -= 1;
          reduced = true;
          break;
        }
      }
      if (!reduced && planned.length > 3) {
        // Drop the last optional accessory exercise
        planned.pop();
        reduced = true;
      }
      if (!reduced) break; // Cannot reduce further
      budget = calculateSessionDuration(planned, targetDurationMinutes, policy);
    }
  }

  return planned;
};

/**
 * Score time compliance (0 - 100)
 */
export const evaluateTimeCompliance = (
  actualMinutes: number,
  targetMinutes: number,
  policy: DurationPolicy = 'approximate_target'
): { score: number; warning?: string } => {
  if (policy === 'hard_ceiling') {
    if (actualMinutes <= targetMinutes) {
      return { score: 100 };
    }
    const overrun = actualMinutes - targetMinutes;
    const score = Math.max(0, 100 - overrun * 15);
    return {
      score,
      warning: `Session duration of ${actualMinutes}m exceeds hard ceiling of ${targetMinutes}m (+${overrun}m).`,
    };
  }

  const diff = Math.abs(actualMinutes - targetMinutes);
  if (diff <= 3) return { score: 100 };
  if (diff <= 7) return { score: 90 };
  if (diff <= 12) return { score: 75, warning: `Session duration (${actualMinutes}m) diverges from target (${targetMinutes}m).` };
  return { score: Math.max(20, 100 - diff * 5), warning: `Significant time variance: ${actualMinutes}m vs ${targetMinutes}m target.` };
};
