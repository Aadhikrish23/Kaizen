import { z } from 'zod';
import { SEARCH_MAX_LENGTH, SEARCH_MIN_LENGTH } from './search.query';

export const searchSchema = z.object({
  query: z.object({
    // Must be a plain string (rejects q[$ne]=x style objects/arrays); length is checked after trimming.
    q: z
      .string()
      .trim()
      .min(SEARCH_MIN_LENGTH, `q must be at least ${SEARCH_MIN_LENGTH} characters`)
      .max(SEARCH_MAX_LENGTH, `q must be at most ${SEARCH_MAX_LENGTH} characters`)
  })
});
