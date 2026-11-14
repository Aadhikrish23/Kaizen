import { z } from 'zod';

export const isRealDate = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

export const reportsSchema = z.object({
  query: z.object({
    period: z.enum(['daily', 'weekly', 'monthly']),
    date: z.string().refine(isRealDate, 'date must be a real calendar date in YYYY-MM-DD format').optional(),
  }),
});
