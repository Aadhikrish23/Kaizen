import { z } from 'zod';

export const getExercisesSchema = z.object({
  query: z.object({
    muscle: z.string().optional()
  })
});

export const createExerciseSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    targetMuscle: z.enum(['chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps', 'core']),
    equipment: z.enum(['dumbbell', 'barbell', 'bodyweight', 'band', 'cable', 'machine', 'other']).optional(),
    secondaryMuscles: z.array(z.string()).optional(),
    instructions: z.string().optional()
  })
});

export const deleteExerciseSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID is required')
  })
});
