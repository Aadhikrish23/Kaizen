import { z } from 'zod';

export const getMealLogsSchema = z.object({
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  })
});

export const createMealLogSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    calories: z.number().min(0, 'Calories must be non-negative'),
    protein: z.number().min(0).optional().default(0),
    carbs: z.number().min(0).optional().default(0),
    fat: z.number().min(0).optional().default(0),
    mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
    time: z.string().min(1, 'Time is required'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  })
});

export const deleteMealLogSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID is required')
  })
});
