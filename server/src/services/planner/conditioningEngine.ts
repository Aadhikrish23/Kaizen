import { ExerciseCatalogItem } from './movementModel';

export interface ConditioningSessionPlan {
  structureType: 'circuit' | 'interval' | 'density';
  workIntervalSeconds: number;
  restIntervalSeconds: number;
  roundRestSeconds: number;
  totalRounds: number;
  estimatedMinutes: number;
  sessionNotes: string;
}

/**
 * Generate structured conditioning metadata for sessions with a conditioning intent
 */
export const buildConditioningStructure = (
  exercises: ExerciseCatalogItem[],
  targetDurationMinutes: number = 45
): ConditioningSessionPlan => {
  // 4-5 movements in a dynamic circuit
  const movementsCount = exercises.length || 4;
  const workIntervalSeconds = 40;
  const restIntervalSeconds = 20;
  const roundRestSeconds = 90;
  
  // Time per round = movements * (40 + 20) + 90s = 4 * 60 + 90 = 330s (~5.5 min)
  // 4 rounds = ~22 min work + 5 min warmup + 5 min cooldown = ~32 min
  const totalRounds = targetDurationMinutes >= 45 ? 4 : 3;
  const roundSeconds = movementsCount * (workIntervalSeconds + restIntervalSeconds) + roundRestSeconds;
  const totalSeconds = (roundSeconds * totalRounds) + 300; // +5 min warmup
  const estimatedMinutes = Math.round(totalSeconds / 60);

  return {
    structureType: 'circuit',
    workIntervalSeconds,
    restIntervalSeconds,
    roundRestSeconds,
    totalRounds,
    estimatedMinutes,
    sessionNotes: `Conditioning Circuit Protocol: Perform each movement continuously for ${workIntervalSeconds}s, rest ${restIntervalSeconds}s before moving to the next exercise. Take ${roundRestSeconds}s recovery between rounds. Complete ${totalRounds} total rounds. Focus on sustained pacing and core control.`,
  };
};
