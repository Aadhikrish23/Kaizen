import { ExerciseCatalogItem, MovementSlotRequirement, TargetFocus, ExperienceLevel } from './movementModel';

export interface ExerciseScoreContext {
  candidate: ExerciseCatalogItem;
  slot: MovementSlotRequirement;
  selectedSessionExercises: ExerciseCatalogItem[];
  recentSessionExercises: ExerciseCatalogItem[]; // exercises from previous day or weekly schedule
  targetFocus: TargetFocus;
  experienceLevel: ExperienceLevel;
}

/**
 * Calculate redundancy / similarity coefficient between two exercises (0 = completely complementary, 1 = identical function)
 */
export const calculateExerciseSimilarity = (a: ExerciseCatalogItem, b: ExerciseCatalogItem): number => {
  if (a.name.toLowerCase() === b.name.toLowerCase()) return 1.0;

  let similarity = 0.0;

  // Exact same movement pattern
  if (a.movementPattern === b.movementPattern) {
    similarity += 0.45;
  }

  // Same movement subtype (e.g. both are overhead presses or both are unilateral lunges)
  if (a.movementSubtype && b.movementSubtype && a.movementSubtype === b.movementSubtype) {
    similarity += 0.40;
  }

  // Same primary muscle group
  if (a.targetMuscle === b.targetMuscle) {
    similarity += 0.15;
  }

  // Unilateral knee-dominant overlap check (e.g. Bulgarian Split Squat vs Walking Lunges)
  if (a.movementPattern === 'lunge_single_leg' && b.movementPattern === 'lunge_single_leg') {
    similarity = Math.max(similarity, 0.85);
  }

  // Anterior deltoid pressing overlap check (e.g. Shoulder Press vs Arnold Press vs Front Raise)
  const isAnteriorShoulder = (ex: ExerciseCatalogItem) =>
    ex.movementPattern === 'vertical_push' || ex.name.toLowerCase().includes('front raise') || ex.name.toLowerCase().includes('arnold');
  if (isAnteriorShoulder(a) && isAnteriorShoulder(b)) {
    similarity = Math.max(similarity, 0.80);
  }

  return Math.min(similarity, 1.0);
};

/**
 * Compute composite suitability score for an exercise candidate in a given session slot
 */
export const scoreExerciseCandidate = (context: ExerciseScoreContext): number => {
  const { candidate, slot, selectedSessionExercises, recentSessionExercises, targetFocus, experienceLevel } = context;

  let score = 100;

  // 1. Movement Pattern Match (Critical)
  const allowedPatterns = Array.isArray(slot.pattern) ? slot.pattern : [slot.pattern];
  if (allowedPatterns.includes(candidate.movementPattern)) {
    score += 50;
  } else {
    // Pattern mismatch penalty
    score -= 60;
  }

  // 2. Target Muscle Alignment
  if (slot.targetMuscles && slot.targetMuscles.length > 0) {
    if (slot.targetMuscles.includes(candidate.targetMuscle)) {
      score += 25;
    } else if (candidate.secondaryMuscles.some(m => slot.targetMuscles!.includes(m))) {
      score += 10;
    } else {
      score -= 20;
    }
  }

  // 3. Mechanic Preference (compound vs isolation)
  if (slot.mechanic && candidate.mechanic === slot.mechanic) {
    score += 15;
  }

  // 4. Laterality Preference
  if (slot.lateralityPreference && slot.lateralityPreference !== 'any') {
    if (candidate.laterality === slot.lateralityPreference) {
      score += 15;
    } else {
      score -= 15;
    }
  }

  // 5. Experience Level Suitability
  if (experienceLevel === 'beginner') {
    if (candidate.difficulty === 'beginner') {
      score += 20;
    } else if (candidate.difficulty === 'advanced') {
      score -= 40; // Avoid advanced technical lifts for beginners
    }
    // Favor movements with low-to-moderate stability/axial demands for beginners
    if (candidate.axialLoading === 'heavy') score -= 25;
  } else if (experienceLevel === 'advanced') {
    if (candidate.difficulty === 'advanced' || candidate.difficulty === 'intermediate') {
      score += 15;
    }
  }

  // 6. Goal Relevance
  if (targetFocus === 'strength') {
    if (candidate.mechanic === 'compound') score += 20;
  } else if (targetFocus === 'hypertrophy') {
    if (candidate.fatigueCost <= 4) score += 10;
  } else if (targetFocus === 'fat_loss') {
    if (candidate.movementPattern.startsWith('conditioning_')) score += 25;
  }

  // 7. INTRA-SESSION REDUNDANCY PENALTY (Critical)
  for (const selected of selectedSessionExercises) {
    const sim = calculateExerciseSimilarity(candidate, selected);
    if (sim >= 0.8) {
      // High functional overlap with an already chosen exercise in this session!
      score -= 80;
    } else if (sim >= 0.5) {
      score -= 35;
    }
  }

  // 8. CROSS-SESSION REPETITION PENALTY
  // Penalize repeating the exact same exercise or highly fatiguing pattern from consecutive/recent sessions
  const repeatCount = recentSessionExercises.filter(e => e.name.toLowerCase() === candidate.name.toLowerCase()).length;
  if (repeatCount > 0) {
    score -= repeatCount * 40;
  }

  // Unilateral leg repeat penalty across consecutive sessions
  if (candidate.movementPattern === 'lunge_single_leg') {
    const recentUnilateral = recentSessionExercises.some(e => e.movementPattern === 'lunge_single_leg');
    if (recentUnilateral) {
      score -= 45;
    }
  }

  return score;
};
