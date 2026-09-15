import { UserEquipmentProfile } from './inventoryEvaluator';

export interface PerformanceSetData {
  reps: number;
  weightKg: number;
  rpe?: number;
  completed: boolean;
}

export interface ExercisePerformanceEvaluation {
  exerciseName: string;
  equipment: string;
  currentPrescribedWeightKg: number;
  currentPrescribedReps: number;
  minReps: number;
  maxReps: number;
  completedSets: PerformanceSetData[];
}

export interface AdaptationRecommendation {
  type: 'weight_increase' | 'volume_adjustment' | 'progression_advance' | 'maintain' | 'deload';
  newWeightKg: number;
  newTargetReps: number;
  reason: string;
  swappedExerciseName?: string;
}

/**
 * Evaluate single exercise performance under the double progression rule
 */
export const evaluateDoubleProgression = (
  evalData: ExercisePerformanceEvaluation,
  profile: UserEquipmentProfile
): AdaptationRecommendation => {
  const { exerciseName, equipment, currentPrescribedWeightKg, currentPrescribedReps, minReps, maxReps, completedSets } = evalData;

  const validSets = completedSets.filter(s => s.completed);
  if (validSets.length === 0) {
    return {
      type: 'maintain',
      newWeightKg: currentPrescribedWeightKg,
      newTargetReps: currentPrescribedReps,
      reason: `No completed sets recorded for "${exerciseName}". Maintained current target.`,
    };
  }

  const avgRpe = validSets.reduce((sum, s) => sum + (s.rpe || 7.5), 0) / validSets.length;
  const allHitMaxReps = validSets.every(s => s.reps >= maxReps);
  const avgReps = validSets.reduce((sum, s) => sum + s.reps, 0) / validSets.length;

  // 1. HIGH FATIGUE / STRUGGLE CHECK (RPE >= 9.5 or reps well below minReps)
  if (avgRpe >= 9.5 || avgReps < minReps * 0.8) {
    return {
      type: 'deload',
      newWeightKg: currentPrescribedWeightKg,
      newTargetReps: minReps,
      reason: `High exertion detected (RPE ${Math.round(avgRpe * 10) / 10}/10) on "${exerciseName}". Preserved load and reset target to bottom of rep range (${minReps} reps) for recovery.`,
    };
  }

  // 2. DOUBLE PROGRESSION THRESHOLD REACHED: All sets completed at or above maxReps with manageable RPE (<= 8.0)
  if (allHitMaxReps && avgRpe <= 8.0) {
    if (equipment === 'dumbbell' && profile.hasDumbbells) {
      // Look for next available weight in inventory
      const sortedWeights = profile.availableDumbbellWeightsKg;
      const nextWeight = sortedWeights.find(w => w > currentPrescribedWeightKg);

      if (nextWeight !== undefined) {
        // Step up load to next available dumbbell increment!
        return {
          type: 'weight_increase',
          newWeightKg: nextWeight,
          newTargetReps: minReps, // Reset to bottom of rep range
          reason: `Target rep ceiling (${maxReps} reps) achieved across all sets at comfortable RPE (${Math.round(avgRpe * 10) / 10}). Progressive overload step: increased load to ${nextWeight}kg (available in inventory) and reset target to ${minReps} reps.`,
        };
      } else {
        // Max available dumbbell reached in user's inventory!
        // Progress via reps or tempo/volume instead of demanding an unavailable dumbbell
        return {
          type: 'volume_adjustment',
          newWeightKg: currentPrescribedWeightKg,
          newTargetReps: Math.min(maxReps + 3, 20),
          reason: `Target rep ceiling achieved, but user has reached maximum dumbbell weight in inventory (${currentPrescribedWeightKg}kg). Applied density progression: increased rep target to ${maxReps + 3} reps and encouraged slower eccentric tempo.`,
        };
      }
    } else if (equipment === 'bodyweight') {
      // Bodyweight progression: increase rep target or suggest progression variation
      return {
        type: 'progression_advance',
        newWeightKg: 0,
        newTargetReps: maxReps + 2,
        reason: `Bodyweight competency achieved across all sets (${maxReps}+ reps). Advanced volume target and prepared for harder movement variation.`,
      };
    } else if (equipment === 'barbell') {
      const increment = 2.5;
      const newWeight = currentPrescribedWeightKg + increment;
      return {
        type: 'weight_increase',
        newWeightKg: newWeight,
        newTargetReps: minReps,
        reason: `Barbell progression: achieved ${maxReps} reps. Increased load by +${increment}kg to ${newWeight}kg and reset to ${minReps} reps.`,
      };
    }
  }

  // 3. MID-RANGE PROGRESSION: Keep working through rep range
  return {
    type: 'maintain',
    newWeightKg: currentPrescribedWeightKg,
    newTargetReps: Math.min(Math.max(Math.round(avgReps + 1), minReps), maxReps),
    reason: `Steady progression on "${exerciseName}" (${Math.round(avgReps)} avg reps @ RPE ${Math.round(avgRpe * 10) / 10}). Continue double-progression toward ${maxReps} reps.`,
  };
};
