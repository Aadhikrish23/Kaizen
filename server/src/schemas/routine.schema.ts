import { z } from 'zod';
import mongoose from 'mongoose';

export const routineExerciseSchema = z.object({
  exerciseId: z.string().refine(val => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid exerciseId'
  }).optional(),
  exerciseName: z.string().min(1, 'Exercise name is required'),
  targetMuscle: z.string().min(1, 'Target muscle is required'),
  sets: z.number().int().min(1, 'Must have at least 1 set'),
  targetReps: z.string().min(1, 'Target reps are required')
});

export const workoutRoutineSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Routine name is required').trim(),
    description: z.string().trim().optional(),
    exercises: z.array(routineExerciseSchema).optional()
  }),
});

export type WorkoutRoutineInput = z.infer<typeof workoutRoutineSchema>;
