// Centralized TypeScript Interfaces for Kaizen Platform

export interface FoodItem {
  _id: string;
  name: string;
  brand?: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isCustom: boolean;
  imageUrl?: string;
  externalId?: string;
  source?: 'local' | 'spoonacular' | 'openfoodfacts';
}

export interface RecipeIngredient {
  foodId?: string;
  name: string;
  servingSize: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Recipe {
  _id: string;
  name: string;
  description?: string;
  ingredients: RecipeIngredient[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  imageUrl?: string;
  sourceUrl?: string;
  instructions?: string[];
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
}

export interface ExternalRecipe {
  externalId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sourceUrl?: string;
  servings: number;
  prepTimeMinutes?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }>;
  instructions: string[];
  source: 'spoonacular' | 'local';
}

export interface WaterLog {
  _id: string;
  amount: number; // in ml
  time: string;   // e.g. "08:30 AM"
  date: string;   // format "YYYY-MM-DD"
  createdAt?: string;
  updatedAt?: string;
}

export interface WeightLog {
  _id: string;
  weight: number; // in kg
  date: string;   // format "YYYY-MM-DD"
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MealLog {
  _id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  time: string;   // e.g. "12:45 PM"
  date: string;   // format "YYYY-MM-DD"
  createdAt?: string;
  updatedAt?: string;
}

export interface Exercise {
  _id: string;
  name: string;
  targetMuscle: 'chest' | 'back' | 'legs' | 'shoulders' | 'biceps' | 'triceps' | 'core';
  secondaryMuscles?: string[];
  equipment: 'dumbbell' | 'barbell' | 'bodyweight' | 'band' | 'cable' | 'machine' | 'other';
  instructions?: string;
  gifUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  formTips?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  userId?: string;
}

export interface EquipmentItem {
  id: string;
  type: 'dumbbell' | 'barbell' | 'plates' | 'bench' | 'pullup_bar' | 'bands' | 'cable' | 'machine' | 'kettlebell' | 'other';
  name: string;
  availableWeightsKg: number[];
  platePairsKg?: number[];
  barbellWeightKg?: number;
  notes?: string;
}

export interface WorkingWeightHistory {
  date: string;
  weightKg: number;
  reps: number;
  rpe?: number;
}

export interface ExerciseWorkingWeight {
  exerciseName: string;
  exerciseId?: string;
  currentWeightKg: number;
  targetReps: number;
  lastUsedDate: string;
  history: WorkingWeightHistory[];
}

export interface UserInventory {
  _id?: string;
  userId?: string;
  equipment: EquipmentItem[];
  workingWeights: ExerciseWorkingWeight[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkoutSet {
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number; // 1-10
  completed: boolean;
}

export interface WorkoutExercise {
  exerciseId?: string;
  exerciseName: string;
  targetMuscle: string;
  sets: WorkoutSet[];
}

export interface WorkoutLog {
  _id: string;
  date: string;
  splitName: string;
  muscleGroups: string[];
  exercises: WorkoutExercise[];
  durationMinutes?: number;
  notes?: string;
  totalVolumeKg: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SplitScheduleItem {
  splitName: string;
  targetMuscles: string[];
  status: 'active' | 'upcoming' | 'rest';
}

export interface WorkoutSplitSchedule {
  today: SplitScheduleItem;
  tomorrow: SplitScheduleItem;
}

export interface DailySummary {
  date: string;
  nutrition: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    calorieGoal: number;
    meals: MealLog[];
  };
  hydration: {
    totalWater: number;
    waterGoal: number;
    logs: WaterLog[];
  };
  bodyMetrics: {
    weight: number | null;
    targetWeight: number;
  };
  sleep?: {
    logged: boolean;
    durationMinutes: number;
    cyclesCount: number;
    quality: number;
    recoveryScore: number;
    bedtime: string | null;
    wakeTime: string | null;
    deepSleepMinutes: number;
    remSleepMinutes: number;
  };
  strength: {
    workoutCompleted: boolean;
    splitName: string | null;
    totalVolumeKg: number;
    exercisesCount: number;
    workout: WorkoutLog | null;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PlannedExercise {
  exerciseId?: string;
  exerciseName: string;
  targetMuscle: string;
  equipment: string;
  targetSets: number;
  targetReps: number;
  suggestedWeightKg: number;
  restSeconds: number;
  videoUrl?: string;
  formTips?: string[];
  notes?: string;
}

export interface PlannedDay {
  dayNumber: number;
  dayName: string;
  isRestDay: boolean;
  title: string;
  focus: string;
  targetMuscles: string[];
  estimatedDurationMinutes: number;
  exercises: PlannedExercise[];
}

export interface DailyAdaptation {
  date: string;
  reason: string;
  type: 'weight_increase' | 'volume_adjustment' | 'rest_shift' | 'deload' | 'streak_milestone' | 'exercise_swap';
  exerciseName?: string;
  oldValue?: number | string;
  newValue?: number | string;
}

export interface PlannerPreferences {
  daysPerWeek: number;
  sessionDurationMinutes: number;
  splitStyle: 'full_body' | 'upper_lower' | 'ppl' | 'home_dumbbell';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  targetFocus: 'hypertrophy' | 'strength' | 'fat_loss' | 'general_fitness';
  preferredDays?: string[];
}

export interface UserWorkoutPlan {
  _id?: string;
  userId?: string;
  programName?: string;
  isCustomPlan?: boolean;
  preferences: PlannerPreferences;
  schedule: PlannedDay[];
  dailyAdaptations: DailyAdaptation[];
  adherenceRate: number;
  lastEvaluatedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SleepLog {
  _id?: string;
  userId?: string;
  date: string; // format "YYYY-MM-DD"
  bedtime: string; // e.g. "23:00"
  wakeTime: string; // e.g. "07:00"
  durationMinutes: number; // e.g. 480
  quality: number; // 1 to 5
  cyclesCount: number; // durationMinutes / 90
  deepSleepMinutes: number;
  remSleepMinutes: number;
  lightSleepMinutes: number;
  awakeMinutes: number;
  recoveryScore: number; // 0 to 100
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CircadianWindow {
  cycles: number;
  durationHours: string;
  label: string;
  desc: string;
  bedtime: string;
}


