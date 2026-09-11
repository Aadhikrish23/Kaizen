import { z } from 'zod';

export const configurePlanSchema = z.object({
  body: z.object({
    daysPerWeek: z.number().int().min(2).max(6).default(3),
    sessionDurationMinutes: z.number().int().min(20).max(120).default(45),
    splitStyle: z.enum(['full_body', 'upper_lower', 'ppl', 'home_dumbbell']).default('full_body'),
    experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
    targetFocus: z.enum(['hypertrophy', 'strength', 'fat_loss', 'general_fitness']).default('general_fitness'),
    preferredDays: z.array(z.string()).optional(),
  }),
});

export const adaptPlanSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    force: z.boolean().optional(),
  }),
});

export const activateDaySchema = z.object({
  body: z.object({
    dayNumber: z.number().int().min(1).max(7),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  }),
});

export const swapExerciseSchema = z.object({
  body: z.object({
    dayNumber: z.number().int().min(1).max(7),
    exerciseIndex: z.number().int().min(0).max(20),
    newExerciseId: z.string().min(1),
  }),
});

export const plannedExerciseSchema = z.object({
  exerciseId: z.string().optional(),
  exerciseName: z.string().min(1),
  targetMuscle: z.string().default('chest'),
  equipment: z.string().default('bodyweight'),
  targetSets: z.number().int().min(1).default(3),
  targetReps: z.number().int().min(1).default(10),
  suggestedWeightKg: z.number().min(0).default(0),
  restSeconds: z.number().int().min(0).default(60),
  videoUrl: z.string().optional(),
  formTips: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const plannedDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(7),
  dayName: z.string().min(1),
  isRestDay: z.boolean().default(false),
  title: z.string().min(1),
  focus: z.string().default('Strength & Conditioning'),
  targetMuscles: z.array(z.string()).default([]),
  estimatedDurationMinutes: z.number().int().min(0).default(45),
  exercises: z.array(plannedExerciseSchema).default([]),
});

export const saveCustomPlanSchema = z.object({
  body: z.object({
    programName: z.string().min(1).optional(),
    daysPerWeek: z.number().int().min(1).max(7).optional(),
    schedule: z.array(plannedDaySchema),
  }),
});

export const addExerciseToDaySchema = z.object({
  body: z.object({
    dayNumber: z.number().int().min(1).max(7),
    exercise: plannedExerciseSchema,
  }),
});

export const removeExerciseFromDaySchema = z.object({
  body: z.object({
    dayNumber: z.number().int().min(1).max(7),
    exerciseIndex: z.number().int().min(0),
  }),
});


