import { z } from 'zod';

// Only user/assistant roles are accepted from clients; 'system' would let a caller inject instructions.
export const chatSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message is required').max(2000, 'Message must be at most 2000 characters'),
    history: z
      .array(
        z
          .object({
            role: z.enum(['user', 'assistant']),
            content: z.string().min(1).max(4000, 'History content must be at most 4000 characters')
          })
          .strict()
      )
      .max(20, 'History must have at most 20 messages')
      .optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional()
  })
});
