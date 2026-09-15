import { ExerciseCatalogItem, IConditioningProtocol } from './movementModel';
import { IPlannedExercise } from '../../models/UserWorkoutPlan';

export interface ConditioningSessionPlan {
  structureType: 'circuit' | 'interval' | 'density';
  workIntervalSeconds: number;
  restIntervalSeconds: number;
  roundRestSeconds: number;
  totalRounds: number;
  warmupMinutes: number;
  cooldownMinutes: number;
  estimatedMinutes: number;
  sessionNotes: string;
  protocol: IConditioningProtocol;
}

/**
 * Generate structured conditioning metadata for sessions with a conditioning intent
 */
export const buildConditioningStructure = (
  exercises: ExerciseCatalogItem[],
  targetDurationMinutes: number = 45
): ConditioningSessionPlan => {
  const movementsCount = Math.max(exercises.length, 3);
  const workIntervalSeconds = 40;
  const restIntervalSeconds = 20;
  const roundRestSeconds = 75;
  const warmupMinutes = 4;
  const cooldownMinutes = 2;

  // Calibrate rounds to target duration
  let totalRounds = 4;
  if (targetDurationMinutes <= 25) {
    totalRounds = 2;
  } else if (targetDurationMinutes <= 35) {
    totalRounds = 3;
  } else if (targetDurationMinutes >= 55) {
    totalRounds = 5;
  }

  // Work + Rest cycle per movement = 60s
  // Station cycle = movementsCount * (40s + 20s) = movementsCount * 60s
  // Inter-round rest = 75s
  const roundWorkSeconds = movementsCount * (workIntervalSeconds + restIntervalSeconds);
  const roundTotalSeconds = roundWorkSeconds + roundRestSeconds;
  const totalExecutionSeconds = (roundTotalSeconds * totalRounds) - roundRestSeconds; // no rest after last round
  const totalSeconds = totalExecutionSeconds + (warmupMinutes * 60) + (cooldownMinutes * 60);
  const estimatedMinutes = Math.round(totalSeconds / 60);

  const protocol: IConditioningProtocol = {
    rounds: totalRounds,
    workSeconds: workIntervalSeconds,
    restSeconds: restIntervalSeconds,
    roundRestSeconds,
    structureType: 'circuit',
  };

  return {
    structureType: 'circuit',
    workIntervalSeconds,
    restIntervalSeconds,
    roundRestSeconds,
    totalRounds,
    warmupMinutes,
    cooldownMinutes,
    estimatedMinutes,
    protocol,
    sessionNotes: `High-Density Circuit Protocol: ${totalRounds} rounds of ${movementsCount} stations. Perform each movement continuously for ${workIntervalSeconds}s, transition for ${restIntervalSeconds}s. Take ${roundRestSeconds}s recovery between rounds.`,
  };
};

/**
 * Map an exercise catalog item to a standardized planned exercise under the conditioning protocol
 */
export const formatConditioningExercise = (
  ex: ExerciseCatalogItem,
  condPlan: ConditioningSessionPlan,
  stationIndex: number,
  suggestedWeightKg: number = 0
): IPlannedExercise => {
  return {
    exerciseName: ex.name,
    targetMuscle: ex.targetMuscle,
    equipment: ex.equipment,
    targetSets: condPlan.totalRounds,
    targetReps: condPlan.workIntervalSeconds,
    repUnit: 'seconds',
    suggestedWeightKg,
    restSeconds: condPlan.restIntervalSeconds,
    videoUrl: ex.videoUrl || 'https://www.youtube.com/embed/IODxDxX7oi4',
    formTips: ex.formTips,
    notes: `Station ${stationIndex + 1} (${condPlan.totalRounds} Rounds): ${condPlan.workIntervalSeconds} seconds continuous time-based work / ${condPlan.restIntervalSeconds} seconds transition rest.`,
    movementPattern: ex.movementPattern,
    isConditioning: true,
  };
};
