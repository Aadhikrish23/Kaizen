import { ExerciseCatalogItem, ExerciseDecisionExplanation, MovementSlotRequirement } from './movementModel';
import { UserEquipmentProfile } from './inventoryEvaluator';

/**
 * Generate a transparent explanation for an exercise selection decision
 */
export const explainExerciseDecision = (
  selected: ExerciseCatalogItem,
  slot: MovementSlotRequirement,
  allCandidates: ExerciseCatalogItem[],
  profile: UserEquipmentProfile,
  alreadySelectedSessionExercises: ExerciseCatalogItem[],
  recentSessionExercises: ExerciseCatalogItem[],
  hadHeavyLegsYesterday: boolean = false
): ExerciseDecisionExplanation => {
  const rejectedCandidates: Array<{ exerciseName: string; reason: string }> = [];

  for (const candidate of allCandidates) {
    if (candidate.name === selected.name) continue;

    // Check equipment rejection
    if (candidate.benchRequired && !profile.hasBench) {
      rejectedCandidates.push({
        exerciseName: candidate.name,
        reason: 'Hardware limitation: requires flat/incline bench which user lacks.',
      });
      continue;
    }

    if (candidate.pullupBarRequired && !profile.hasPullupBar) {
      rejectedCandidates.push({
        exerciseName: candidate.name,
        reason: 'Hardware limitation: requires pull-up bar which user lacks.',
      });
      continue;
    }

    if (candidate.equipment === 'barbell' && !profile.hasBarbell) {
      rejectedCandidates.push({
        exerciseName: candidate.name,
        reason: 'Hardware limitation: requires barbell/rack which user lacks.',
      });
      continue;
    }

    // Check intra-session duplicate or subtype redundancy
    if (alreadySelectedSessionExercises.some(s => s.name === candidate.name)) {
      rejectedCandidates.push({
        exerciseName: candidate.name,
        reason: 'Intra-session redundancy: exercise already selected in this workout.',
      });
      continue;
    }

    if (alreadySelectedSessionExercises.some(s => s.movementSubtype === candidate.movementSubtype)) {
      rejectedCandidates.push({
        exerciseName: candidate.name,
        reason: `Subtype redundancy: session already includes "${candidate.movementSubtype}".`,
      });
      continue;
    }

    // Check recent session duplication
    if (recentSessionExercises.some(r => r.name === candidate.name)) {
      rejectedCandidates.push({
        exerciseName: candidate.name,
        reason: 'Cross-session spacing: performed in preceding workout; rotated out to prevent localized staleness.',
      });
      continue;
    }

    // Check recovery/fatigue conflict
    if (hadHeavyLegsYesterday && ['squat', 'lunge_single_leg', 'conditioning_hiit'].includes(candidate.movementPattern)) {
      rejectedCandidates.push({
        exerciseName: candidate.name,
        reason: 'Recovery safeguard: high axial/quad fatigue detected from yesterday\'s lower body session.',
      });
      continue;
    }

    // Lower scoring / ranking
    rejectedCandidates.push({
      exerciseName: candidate.name,
      reason: 'Ranked lower in biomechanical suitability or experience compatibility for this slot.',
    });
  }

  // Selected rationale
  let selectedRationale = `Optimal fit for "${slot.name}". `;
  if (selected.equipment === 'dumbbell') {
    selectedRationale += `Leverages user's dumbbell inventory (${profile.availableDumbbellWeightsKg.join(', ')}kg) with zero bench dependency.`;
  } else if (selected.equipment === 'bodyweight') {
    selectedRationale += `Pure bodyweight mechanic perfectly matching user setup.`;
  } else {
    selectedRationale += `Meets target muscle recruitment and mechanical tension profile.`;
  }

  return {
    exerciseName: selected.name,
    slotName: slot.name,
    selectedRationale,
    rejectedCandidates: rejectedCandidates.slice(0, 5), // Keep top 5 representative rejections
  };
};
