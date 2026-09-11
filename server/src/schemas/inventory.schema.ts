import { z } from 'zod';

export const equipmentItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['dumbbell', 'barbell', 'plates', 'bench', 'pullup_bar', 'bands', 'cable', 'machine', 'kettlebell', 'other']),
  name: z.string().min(1),
  availableWeightsKg: z.array(z.number()),
  platePairsKg: z.array(z.number()).optional(),
  barbellWeightKg: z.number().optional(),
  notes: z.string().optional(),
});

export const updateInventorySchema = z.object({
  body: z.object({
    equipment: z.array(equipmentItemSchema),
  }),
});

export const recordWorkingWeightSchema = z.object({
  body: z.object({
    exerciseName: z.string().min(1),
    exerciseId: z.string().optional(),
    currentWeightKg: z.number().min(0),
    targetReps: z.number().min(1).optional(),
    date: z.string().optional(),
    rpe: z.number().min(1).max(10).optional(),
  }),
});
