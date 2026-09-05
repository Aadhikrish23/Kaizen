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
