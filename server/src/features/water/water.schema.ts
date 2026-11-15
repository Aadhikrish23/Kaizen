import { z } from 'zod';
import { clientRequestIdPattern } from '../../utils/idempotency';

export const getWaterLogsSchema = z.object({
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  })
});

export const createWaterLogSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be positive'),
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    clientRequestId: z.string().regex(clientRequestIdPattern, 'Invalid clientRequestId').optional()
  })
});

export const WATER_CREATE_KEYS = Object.keys(createWaterLogSchema.shape.body.shape);

export const deleteWaterLogSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID is required')
  })
});
