// Kaizen Readiness: an adherence index built only from inputs the user actually logged.
// Missing inputs are never replaced by reassuring defaults.

export interface ReadinessInput {
  nutrition?: { totalCalories: number; calorieGoal: number; meals?: unknown[] } | null;
  hydration?: { totalWater: number; waterGoal: number } | null;
  strength?: { workoutCompleted: boolean } | null;
  sleep?: { logged: boolean; recoveryScore: number } | null;
}

export type ReadinessComponent = 'nutrition' | 'hydration' | 'workout' | 'sleep';

export const MIN_READINESS_INPUTS = 3;

export type ReadinessResult =
  | { status: 'insufficient'; missing: ReadinessComponent[]; used: ReadinessComponent[] }
  | { status: 'ok'; score: number; tier: number; label: string; missing: ReadinessComponent[]; used: ReadinessComponent[] };

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

export const readinessTier = (score: number): { tier: number; label: string } => {
  if (score >= 85) return { tier: 1, label: 'Prime Condition' };
  if (score >= 70) return { tier: 2, label: 'Strong' };
  if (score >= 50) return { tier: 3, label: 'Building' };
  return { tier: 4, label: 'Needs Attention' };
};

export const computeReadiness = (input: ReadinessInput): ReadinessResult => {
  const parts: Partial<Record<ReadinessComponent, number>> = {};

  const n = input.nutrition;
  if (n && n.calorieGoal > 0 && (n.meals ? n.meals.length > 0 : n.totalCalories > 0)) {
    parts.nutrition = clampPct((n.totalCalories / n.calorieGoal) * 100);
  }
  const h = input.hydration;
  if (h && h.waterGoal > 0 && h.totalWater > 0) {
    parts.hydration = clampPct((h.totalWater / h.waterGoal) * 100);
  }
  // A workout counts as an input only once it is completed; an unlogged workout is "missing", not a score.
  if (input.strength?.workoutCompleted) {
    parts.workout = 100;
  }
  if (input.sleep?.logged && typeof input.sleep.recoveryScore === 'number') {
    parts.sleep = clampPct(input.sleep.recoveryScore);
  }

  const all: ReadinessComponent[] = ['nutrition', 'hydration', 'workout', 'sleep'];
  const used = all.filter((c) => parts[c] !== undefined);
  const missing = all.filter((c) => parts[c] === undefined);

  if (used.length < MIN_READINESS_INPUTS) return { status: 'insufficient', missing, used };

  const score = Math.round(used.reduce((sum, c) => sum + (parts[c] as number), 0) / used.length);
  return { status: 'ok', score, ...readinessTier(score), missing, used };
};

export const READINESS_LABELS: Record<ReadinessComponent, string> = {
  nutrition: 'meals',
  hydration: 'water',
  workout: 'workout',
  sleep: 'sleep',
};
