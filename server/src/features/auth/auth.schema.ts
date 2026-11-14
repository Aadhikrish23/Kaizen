import { z } from 'zod';
import { isValidTimezone } from '../../utils/dates';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    timezone: z.string().refine(isValidTimezone, 'Invalid IANA timezone').optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
    timezone: z.string().refine(isValidTimezone, 'Invalid IANA timezone').optional()
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format')
  })
});
