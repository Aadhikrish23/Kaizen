import { z } from 'zod';

export const getWorkoutScheduleSchema = z.object({});

export const getWorkoutsSchema = z.object({
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional()
  })
});

const workoutSetSchema = z.object({
  setNumber: z.number().min(1),
  weightKg: z.number().min(0),
  reps: z.number().min(0),
  rpe: z.number().min(1).max(10).optional(),
  completed: z.boolean().optional()
});

const workoutExerciseSchema = z.object({
  exerciseId: z.string().optional(),
  exerciseName: z.string().min(1, 'Exercise name is required'),
  targetMuscle: z.string().min(1, 'Target muscle is required'),
  sets: z.array(workoutSetSchema)
});

export const createWorkoutSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    splitName: z.string().min(1, 'Split name is required'),
    muscleGroups: z.array(z.string()).optional(),
    exercises: z.array(workoutExerciseSchema),
    durationMinutes: z.number().min(0).optional(),
    notes: z.string().optional()
  })
});

export const deleteWorkoutSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID is required')
  })
});
