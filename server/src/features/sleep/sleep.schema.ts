import { z } from 'zod';

export const upsertSleepSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    bedtime: z.string().min(1, 'Bedtime is required'),
    wakeTime: z.string().min(1, 'Wake time is required'),
    durationMinutes: z.number().min(0).optional(),
    quality: z.number().min(1).max(5).default(3),
    deepSleepMinutes: z.number().min(0).optional(),
    remSleepMinutes: z.number().min(0).optional(),
    lightSleepMinutes: z.number().min(0).optional(),
    awakeMinutes: z.number().min(0).optional(),
    notes: z.string().optional()
  })
});

export const getSleepByDateSchema = z.object({
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  })
});

export const getSleepRangeSchema = z.object({
  query: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional()
  })
});

export const deleteSleepSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID is required')
  })
});

export type UpsertSleepInput = z.infer<typeof upsertSleepSchema>['body'];
