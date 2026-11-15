// Pure query builders and normalisers for the external food/recipe feature (no model imports, easy to test).
import { escapeRegex } from '../../utils/escapeRegex';
import { foodScope } from '../search/search.query';

export const MAX_QUERY_LENGTH = 100;

/** Trimmed, length-capped literal matcher for user input; null for non-strings or empty input. */
export const literalMatcher = (raw: unknown): RegExp | null => {
  if (typeof raw !== 'string') return null;
  const q = raw.trim().slice(0, MAX_QUERY_LENGTH);
  return q ? new RegExp(escapeRegex(q), 'i') : null;
};

/**
 * Local-fallback recipe search: ONLY the caller's own recipes (every Recipe has a required userId and there are no
 * public recipes), with the query matched literally.
 */
export const ownRecipeFallbackFilter = (userId: unknown, query: unknown): { userId: unknown; name: RegExp } | null => {
  const matcher = literalMatcher(query);
  if (!userId || !matcher) return null;
  return { userId, name: matcher };
};

/** Local food lookup: global foods plus the caller's own custom foods, name/brand matched literally. */
export const localFoodFilter = (userId: unknown, query: unknown) => {
  const matcher = literalMatcher(query);
  if (!userId || !matcher) return null;
  return { $and: [foodScope(userId), { $or: [{ name: matcher }, { brand: matcher }] }] };
};

export const MAX_STEP_LENGTH = 2000;
export const MAX_STEPS = 100;

/**
 * Imported instruction steps may be one long block of raw text. Instead of rejecting them, split anything over
 * MAX_STEP_LENGTH at sentence (or word) boundaries and cap the number of steps.
 */
export const normalizeInstructions = (steps: unknown): string[] => {
  if (!Array.isArray(steps)) return [];
  const out: string[] = [];
  for (const raw of steps) {
    if (typeof raw !== 'string') continue;
    let rest = raw.trim();
    while (rest.length > MAX_STEP_LENGTH) {
      const window = rest.slice(0, MAX_STEP_LENGTH);
      const sentence = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '));
      const cut = sentence > MAX_STEP_LENGTH / 2 ? sentence + 1 : Math.max(window.lastIndexOf(' '), MAX_STEP_LENGTH / 2) ;
      out.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) out.push(rest);
    if (out.length >= MAX_STEPS) break;
  }
  return out.slice(0, MAX_STEPS);
};
