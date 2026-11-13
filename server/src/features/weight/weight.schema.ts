import { z } from 'zod';

export const getDailyWeightSchema = z.object({
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  })
});

export const upsertWeightSchema = z.object({
  body: z.object({
    weight: z.number().positive('Weight must be positive'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    notes: z.string().optional()
  })
});

export const deleteWeightSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID is required')
  })
});
