import { z } from 'zod';

export const createFoodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    brand: z.string().max(100).optional(),
    servingSize: z.string().min(1).max(50),
    calories: z.number().min(0),
    protein: z.number().min(0).default(0),
    carbs: z.number().min(0).default(0),
    fat: z.number().min(0).default(0),
  })
});

export const searchFoodSchema = z.object({
  query: z.object({
    q: z.string().min(1).optional(),
    limit: z.string().optional()
  })
});
