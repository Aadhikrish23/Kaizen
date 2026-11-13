import { z } from 'zod';

export const measurementLogSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    weight: z.number().min(0).optional(),
    bodyFatPercentage: z.number().min(0).max(100).optional(),
    chestCm: z.number().min(0).optional(),
    waistCm: z.number().min(0).optional(),
    hipsCm: z.number().min(0).optional(),
    armsCm: z.number().min(0).optional(),
    legsCm: z.number().min(0).optional(),
  }),
});

export type MeasurementLogInput = z.infer<typeof measurementLogSchema>;
