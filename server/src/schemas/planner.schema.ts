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

