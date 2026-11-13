/**
 * Biomechanical Movement Pattern Model & Engine Types
 */

export type UpperMovementPattern =
  | 'horizontal_push'
  | 'horizontal_pull'
  | 'vertical_push'
  | 'vertical_pull'
  | 'shoulder_abduction'
  | 'rear_delt'
  | 'elbow_flexion'
  | 'elbow_extension';

export type LowerMovementPattern =
  | 'squat'             // bilateral knee-dominant
  | 'hinge'             // hip-dominant posterior chain
  | 'lunge_single_leg'  // unilateral knee/hip
  | 'calf';

export type CoreMovementPattern =
  | 'anti_extension'
  | 'anti_rotation'
  | 'anti_lateral_flexion'
  | 'trunk_flexion'
  | 'controlled_rotation';

export type ConditioningMovementPattern =
  | 'conditioning_circuit'
  | 'conditioning_hiit'
  | 'conditioning_aerobic'
  | 'conditioning_carry';

export type MovementPattern =
  | UpperMovementPattern
  | LowerMovementPattern
  | CoreMovementPattern
  | ConditioningMovementPattern;

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'calves'
  | 'forearms'
  | 'full_body';

export type EquipmentCategory =
  | 'dumbbell'
  | 'barbell'
  | 'bodyweight'
  | 'band'
  | 'cable'
  | 'machine'
  | 'kettlebell'
  | 'other';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type TargetFocus = 'hypertrophy' | 'strength' | 'fat_loss' | 'general_fitness';
export type SplitStyle = 'full_body' | 'upper_lower' | 'ppl' | 'home_dumbbell';

export interface RepRange {
  min: number;
  max: number;
}

export interface ExerciseCatalogItem {
  id?: string;
  name: string;
  targetMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentCategory;
  movementPattern: MovementPattern;
  movementSubtype: string; // e.g. 'overhead_press', 'bilateral_squat', 'hip_hinge_rdl'
  mechanic: 'compound' | 'isolation';
  laterality: 'bilateral' | 'unilateral';
  axialLoading: 'none' | 'light' | 'moderate' | 'heavy';
  stabilityDemand: 'low' | 'moderate' | 'high';
  fatigueCost: number; // 1 (lowest) to 5 (highest)
  recoveryDemandHours: number; // estimated hours (e.g. 24, 48, 72)
  difficulty: ExperienceLevel;
  
  // Rep & Rest Prescriptions
  defaultRepRange: RepRange;
  defaultRestSeconds: number;
  isTimeBased: boolean;
  defaultTimeSeconds?: number;
  
  // Progression & Equipment Requirements
  progressionMethod: 'double_progression' | 'bodyweight_ladder' | 'linear_load' | 'density_time';
  regressions?: string[];
  progressions?: string[];
  benchRequired: boolean;
  pullupBarRequired: boolean;
  pushupHandlesCompatible: boolean;
  conditioningClass?: 'circuit' | 'interval' | 'emom' | 'density';
  
  // Coaching guidance
  instructions: string;
  formTips: string[];
  videoUrl?: string;
}

export interface MovementSlotRequirement {
  name: string;
  pattern: MovementPattern | MovementPattern[];
  targetMuscles?: MuscleGroup[];
  mechanic?: 'compound' | 'isolation';
  role?: 'primary' | 'accessory' | 'core' | 'finisher';
  substitutions?: MovementPattern[];
  lateralityPreference?: 'bilateral' | 'unilateral' | 'any';
  minDifficulty?: ExperienceLevel;
  maxDifficulty?: ExperienceLevel;
  isConditioning?: boolean;
  isOptional?: boolean;
}

export type DurationPolicy = 'approximate_target' | 'hard_ceiling' | 'compact_efficient';

export interface IConditioningProtocol {
  rounds: number;
  workSeconds: number;
  restSeconds: number;
  roundRestSeconds: number;
  structureType: 'circuit' | 'interval' | 'density';
}

export interface CriticalConstraintResult {
  isValid: boolean;
  equipmentCompliance: boolean;
  impossibleExercise: boolean;
  intentFulfillment: boolean;
  prescriptionValidity: boolean;
  durationCompliance: boolean;
  noSevereRecoveryConflict: boolean;
  metadataValidity: boolean;
  violations: string[];
}

export interface MuscleVolumeBreakdown {
  directSets: number;
  indirectSets: number;
  effectiveSets: number;
}

export interface GoalBalanceTargets {
  idealPushPullMin: number;
  idealPushPullMax: number;
  acceptablePushPullMin: number;
  acceptablePushPullMax: number;
  idealSquatHingeMin: number;
  idealSquatHingeMax: number;
  minWeeklyMajorMuscleSets: number;
}

/**
 * Authoritative Goal-Specific Balance Targets (Single Source of Truth)
 */
export const GOAL_BALANCE_TARGETS: Record<TargetFocus, GoalBalanceTargets> = {
  strength: {
    idealPushPullMin: 0.90,
    idealPushPullMax: 1.10,
    acceptablePushPullMin: 0.75,
    acceptablePushPullMax: 1.25,
    idealSquatHingeMin: 0.75,
    idealSquatHingeMax: 1.40,
    minWeeklyMajorMuscleSets: 8,
  },
  hypertrophy: {
    idealPushPullMin: 0.80,
    idealPushPullMax: 1.25, // Favors back/lat volume
    acceptablePushPullMin: 0.70,
    acceptablePushPullMax: 1.35,
    idealSquatHingeMin: 0.60,
    idealSquatHingeMax: 1.60,
    minWeeklyMajorMuscleSets: 10,
  },
  general_fitness: {
    idealPushPullMin: 0.85,
    idealPushPullMax: 1.15,
    acceptablePushPullMin: 0.70,
    acceptablePushPullMax: 1.30,
    idealSquatHingeMin: 0.60,
    idealSquatHingeMax: 1.80,
    minWeeklyMajorMuscleSets: 6,
  },
  fat_loss: {
    idealPushPullMin: 0.80,
    idealPushPullMax: 1.20,
    acceptablePushPullMin: 0.65,
    acceptablePushPullMax: 1.35,
    idealSquatHingeMin: 0.60,
    idealSquatHingeMax: 1.80,
    minWeeklyMajorMuscleSets: 6,
  },
};

export type PushPullClassification =
  | 'ideal'
  | 'mild_deficit'
  | 'mild_excess'
  | 'severe_deficit'
  | 'severe_excess';

export const classifyPushPullRatio = (
  ratio: number,
  targetFocus: TargetFocus = 'general_fitness'
): PushPullClassification => {
  const targets = GOAL_BALANCE_TARGETS[targetFocus] || GOAL_BALANCE_TARGETS.general_fitness;
  if (ratio < targets.acceptablePushPullMin) return 'severe_deficit';
  if (ratio < targets.idealPushPullMin) return 'mild_deficit';
  if (ratio > targets.acceptablePushPullMax) return 'severe_excess';
  if (ratio > targets.idealPushPullMax) return 'mild_excess';
  return 'ideal';
};

export const classifySquatHingeRatio = (
  ratio: number,
  targetFocus: TargetFocus = 'general_fitness'
): 'ideal' | 'imbalanced' => {
  const targets = GOAL_BALANCE_TARGETS[targetFocus] || GOAL_BALANCE_TARGETS.general_fitness;
  if (ratio < targets.idealSquatHingeMin || ratio > targets.idealSquatHingeMax) return 'imbalanced';
  return 'ideal';
};

export interface MuscleFatigueProfile {
  muscle: string;
  residualRecoveryHours: number;
  exhaustionScore: number; // 0 to 10
}

export interface DailyFatigueProfile {
  dayIndex: number;
  dayName: string;
  hoursSinceLastSession: number;
  residualAxialFatigueHours: number;
  muscleFatigue: Record<string, MuscleFatigueProfile>;
  accumulatedFatigueCost: number;
  hadHeavyAxialLoad: boolean;
}

export interface ExerciseDecisionExplanation {
  exerciseName: string;
  slotName: string;
  selectedRationale: string;
  rejectedCandidates: Array<{
    exerciseName: string;
    reason: string;
  }>;
}

export interface SessionBlueprint {
  dayIndex: number;
  title: string;
  focus: string;
  intent: string;
  primaryMuscles: MuscleGroup[];
  slots: MovementSlotRequirement[];
  isConditioningSession?: boolean;
  conditioningProtocol?: IConditioningProtocol;
}

export interface WeeklyBalanceMetrics {
  totalSets: number;
  pushSets: number;
  pullSets: number;
  pushPullRatio: number;
  squatSets: number;
  hingeSets: number;
  squatHingeRatio: number;
  unilateralLegSets: number;
  bilateralLegSets: number;
  directArmSets: number;
  coreSets: number;
  conditioningSessions: number;
  muscleSetCounts: Record<string, number>;
  muscleVolumeBreakdown?: Record<string, MuscleVolumeBreakdown>;
  movementPatternCounts: Record<string, number>;
  repeatedExerciseCounts: Record<string, number>;
}

export interface PlanQualityScore {
  isValid: boolean; // Binary gate: all critical constraints met
  status: 'VALID' | 'NEEDS_REPAIR' | 'REJECTED';
  criticalConstraintResult: CriticalConstraintResult;
  overallScore: number; // 0 - 100 (capped at 40 if !isValid)
  movementBalanceScore: number; // 0 - 100
  muscleCoverageScore: number; // 0 - 100
  recoveryScore: number; // 0 - 100
  redundancyScore: number; // 0 - 100 (100 = zero unnecessary redundancy)
  equipmentComplianceScore: number; // 0 - 100 (100 = 100% compliant)
  timeComplianceScore: number; // 0 - 100
  experienceSuitabilityScore: number; // 0 - 100
  warnings: string[];
  strengths: string[];
}

