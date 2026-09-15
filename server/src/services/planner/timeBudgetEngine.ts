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
 * Adjust volume, sets, and rest to ensure session strictly respects duration target and policy
 * while strictly preserving:
 * 1. Session intent
 * 2. Primary compound movements (never dropped)
 * 3. Minimum productive volume (>= 2 sets per primary movement)
 * 4. Recovery requirements
 *
 * Duration reduction hierarchy:
 * Step 1: Optimize rest on accessory/isolation/core movements
 * Step 2: Reduce accessory sets (3 -> 2)
 * Step 3: Trim optional/accessory exercises only as a last resort, preserving all primaries
 */
export const calibrateSetsToTimeBudget = (
  exercises: ExerciseCatalogItem[],
  targetDurationMinutes: number = 45,
  isBeginner: boolean = true,
  policy: DurationPolicy = 'approximate_target'
): PlannedExerciseWithSets[] => {
  if (exercises.length === 0) return [];

  // Separate primary compound movements (which fulfill blueprint intent) from accessories
  // An exercise is primary if it is a compound lift or the first 2-3 movements
  const isPrimary = (ex: ExerciseCatalogItem, index: number) => {
    return ex.mechanic === 'compound' || index < 2;
  };

  // Base set allocations
  let defaultSetsPerExercise = 3;
  if (targetDurationMinutes <= 25 || policy === 'compact_efficient') {
    defaultSetsPerExercise = 2;
  } else if (targetDurationMinutes <= 35) {
    defaultSetsPerExercise = 2;
  } else if (targetDurationMinutes >= 60) {
    defaultSetsPerExercise = 4;
  }

  // Build initial planned list with all exercises
  let planned: PlannedExerciseWithSets[] = exercises.map((ex, idx) => {
    const primary = isPrimary(ex, idx);
    let sets = primary ? Math.max(2, defaultSetsPerExercise) : (targetDurationMinutes <= 35 ? 2 : defaultSetsPerExercise);
    if (idx === 0 && targetDurationMinutes >= 45) {
      sets = Math.min(defaultSetsPerExercise + 1, 4); // Anchor compound lift gets an extra set
    }

    // Reps calibrated to mechanic and beginner status
    let reps = ex.defaultRepRange.min;
    if (ex.mechanic === 'compound') {
      reps = isBeginner ? ex.defaultRepRange.min : Math.round((ex.defaultRepRange.min + ex.defaultRepRange.max) / 2);
    } else {
      reps = ex.defaultRepRange.max;
    }

    // Rest calibrated to target duration and mechanic
    let rest = ex.defaultRestSeconds;
    if (primary) {
      if (isBeginner) rest = Math.max(rest, 75);
      if (targetDurationMinutes >= 55) rest = Math.max(rest, 90);
      if (targetDurationMinutes <= 30) rest = Math.min(rest, 60);
    } else {
      // Accessory/isolation/core rest optimization
      if (targetDurationMinutes <= 35) rest = Math.min(rest, 45);
      if (targetDurationMinutes <= 25) rest = Math.min(rest, 30);
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

  // Calculate current duration
  let budget = calculateSessionDuration(planned, targetDurationMinutes, policy);

  // If time exceeds budget (e.g. hard_ceiling or short target duration), iteratively optimize:
  if (budget.totalEstimatedMinutes > targetDurationMinutes || (policy === 'compact_efficient' && budget.totalEstimatedMinutes > 30)) {
    // Step 1: Optimize rest on accessories
    for (const p of planned) {
      if (p.exercise.mechanic === 'isolation' || p.isTimeBased) {
        p.restSeconds = Math.min(p.restSeconds, 45);
      }
    }
    budget = calculateSessionDuration(planned, targetDurationMinutes, policy);

    // Step 2: Reduce accessory sets to minimum productive volume (2 sets)
    if (budget.totalEstimatedMinutes > targetDurationMinutes) {
      for (let i = planned.length - 1; i >= 0; i--) {
        if (!isPrimary(planned[i].exercise, i) && planned[i].sets > 2) {
          planned[i].sets = 2;
        }
      }
      budget = calculateSessionDuration(planned, targetDurationMinutes, policy);
    }

    // Step 3: If still exceeding hard ceiling or compact target, drop accessories from the END,
    // NEVER dropping primary compound exercises!
    let attempts = 0;
    while (
      attempts < 5 &&
      ((policy === 'hard_ceiling' && budget.totalEstimatedMinutes > targetDurationMinutes) ||
       (policy === 'compact_efficient' && budget.totalEstimatedMinutes > 30) ||
       (targetDurationMinutes <= 25 && planned.length > 3))
    ) {
      attempts++;
      // Find the last non-primary accessory exercise to drop
      let droppedIndex = -1;
      for (let i = planned.length - 1; i >= 0; i--) {
        if (!isPrimary(planned[i].exercise, i)) {
          droppedIndex = i;
          break;
        }
      }

      if (droppedIndex !== -1 && planned.length > 2) {
        planned.splice(droppedIndex, 1);
        budget = calculateSessionDuration(planned, targetDurationMinutes, policy);
      } else {
        // If only primary exercises remain, reduce their sets to 2 (minimum productive volume)
        for (const p of planned) {
          if (p.sets > 2) {
            p.sets = 2;
          }
        }
        budget = calculateSessionDuration(planned, targetDurationMinutes, policy);
        break;
      }
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
