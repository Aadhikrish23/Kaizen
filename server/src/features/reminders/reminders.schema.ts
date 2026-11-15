import { z } from 'zod';
import { MAX_TIMES_PER_REMINDER, REMINDER_TYPES, TIME_RE } from './reminders.logic';

const time = z.string().regex(TIME_RE, 'Time must be HH:MM (24-hour)');

const reminder = z.object({
  type: z.enum(REMINDER_TYPES),
  enabled: z.boolean(),
  times: z.array(time).max(MAX_TIMES_PER_REMINDER, `At most ${MAX_TIMES_PER_REMINDER} times per reminder`)
    .refine((t) => new Set(t).size === t.length, 'Times must be unique'),
  days: z.array(z.number().int().min(0).max(6)).max(7).optional(),
});

export const putRemindersSchema = z.object({
  body: z.object({
    reminders: z.array(reminder).max(REMINDER_TYPES.length)
      .refine((r) => new Set(r.map((x) => x.type)).size === r.length, 'Each reminder type may appear once'),
    quietHours: z.object({ enabled: z.boolean(), start: time, end: time }).optional(),
  }),
});
