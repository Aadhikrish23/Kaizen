import { UserEquipmentProfile } from './inventoryEvaluator';
import { COMPREHENSIVE_EXERCISE_CATALOG } from './exerciseCatalog';

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
  tempoCues?: string;
}

/**
 * Progression variation ladder mappings when equipment limits are reached
 */
const BIOMECHANICAL_VARIATION_LADDER: Record<string, string> = {
  'Push-Ups (Standard / Deficit)': 'Deficit Push-Ups',
  'Standard Floor Push-Up': 'Push-Up (with Handles / Push-up Bars)',
  'Push-Up (with Handles / Push-up Bars)': 'Deficit Push-Up (with Handles)',
  'Dumbbell Floor Press (No Bench Required)': '1.5-Rep Dumbbell Floor Press (Pause Accentuated)',
  'Dumbbell Goblet Squat': '1.5-Rep Dumbbell Goblet Squat (Pause at Bottom)',
  'Dumbbell Romanian Deadlift (RDL)': 'Single-Leg Romanian Deadlift (Unilateral Balance)',
  'Pull-Up (Bodyweight)': 'Pull-Up (3s Eccentric Negative Hold)',
};

/**
 * Evaluate single exercise performance under the double progression rule with ceiling safeguards
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
        // Step up load to next available dumbbell increment
        return {
          type: 'weight_increase',
          newWeightKg: nextWeight,
          newTargetReps: minReps, // Reset to bottom of rep range
          reason: `Target rep ceiling (${maxReps} reps) achieved across all sets at comfortable RPE (${Math.round(avgRpe * 10) / 10}). Progressive overload step: increased load to ${nextWeight}kg (available in inventory) and reset target to ${minReps} reps.`,
        };
      } else {
        // Max available dumbbell reached in user's inventory!
        // Check if rep ceiling (15 reps) has been reached
        if (currentPrescribedReps >= 14 || maxReps >= 15) {
          // Check for harder biomechanical variation ladder
          const harderVariation = BIOMECHANICAL_VARIATION_LADDER[exerciseName];
          if (harderVariation) {
            return {
              type: 'progression_advance',
              newWeightKg: currentPrescribedWeightKg,
              newTargetReps: minReps,
              swappedExerciseName: harderVariation,
              reason: `Max dumbbell weight (${currentPrescribedWeightKg}kg) and rep ceiling reached for "${exerciseName}". Advanced to harder biomechanical movement: "${harderVariation}" at reset ${minReps} reps.`,
            };
          }

          // Apply Tempo Pause Progression rather than infinite rep inflation
          return {
            type: 'progression_advance',
            newWeightKg: currentPrescribedWeightKg,
            newTargetReps: minReps,
            tempoCues: '4-1-1-0 (4s eccentric descent, 1s isometric stretch pause)',
            reason: `Max dumbbell weight (${currentPrescribedWeightKg}kg) and rep ceiling (15 reps) reached on "${exerciseName}". Shifted progression axis to 4-1-1-0 tempo control to maximize hypertrophy without requiring heavier dumbbells.`,
          };
        }

        // Density / rep progression step (up to ceiling of 15)
        const nextRepTarget = Math.min(maxReps + 2, 15);
        return {
          type: 'volume_adjustment',
          newWeightKg: currentPrescribedWeightKg,
          newTargetReps: nextRepTarget,
          reason: `Target rep ceiling achieved, but user has reached maximum dumbbell weight in inventory (${currentPrescribedWeightKg}kg). Applied density progression: increased rep target to ${nextRepTarget} reps with controlled tempo.`,
        };
      }
    } else if (equipment === 'bodyweight') {
      // Bodyweight progression: check if ready to advance to harder variation
      const harderVariation = BIOMECHANICAL_VARIATION_LADDER[exerciseName];
      if (harderVariation && (currentPrescribedReps >= 14 || maxReps >= 15)) {
        return {
          type: 'progression_advance',
          newWeightKg: 0,
          newTargetReps: minReps,
          swappedExerciseName: harderVariation,
          reason: `Bodyweight rep ceiling achieved on "${exerciseName}". Advanced to harder movement variation: "${harderVariation}".`,
        };
      }

      return {
        type: 'progression_advance',
        newWeightKg: 0,
        newTargetReps: Math.min(maxReps + 2, 16),
        reason: `Bodyweight competency achieved across all sets (${maxReps}+ reps). Advanced volume target to ${Math.min(maxReps + 2, 16)} reps.`,
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
