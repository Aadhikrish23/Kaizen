import { escapeRegex } from '../../utils/escapeRegex';

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;
export const SEARCH_GROUP_LIMIT = 8;

/**
 * Turn raw user input into a literal, case-insensitive match. Input is trimmed, collapsed and escaped, so no
 * regex operator (or Mongo operator object) can come through. Returns null when it is too short/long.
 */
export const buildNameMatcher = (raw: unknown): RegExp | null => {
  if (typeof raw !== 'string') return null;
  const q = raw.trim().replace(/\s+/g, ' ');
  if (q.length < SEARCH_MIN_LENGTH || q.length > SEARCH_MAX_LENGTH) return null;
  return new RegExp(escapeRegex(q), 'i');
};

// Per-user scoping: global catalog rows plus the caller's own rows. A missing/invalid user never matches others' data.
export const foodScope = (userId: unknown) => ({ $or: [{ isCustom: false }, { userId, isCustom: true }] });
export const exerciseScope = (userId: unknown) => ({ $or: [{ userId: null }, { userId: { $exists: false } }, { userId }] });

export const toFoodResult = (f: any) => ({ id: String(f._id), name: f.name, brand: f.brand, servingSize: f.servingSize, calories: f.calories, basis: f.basis });
export const toRecipeResult = (r: any) => ({ id: String(r._id), name: r.name, totalCalories: r.totalCalories, servings: r.servings });
export const toExerciseResult = (e: any) => ({ id: String(e._id), name: e.name, targetMuscle: e.targetMuscle, equipment: e.equipment });
export const toRoutineResult = (r: any) => ({ id: String(r._id), name: r.name, exercisesCount: Array.isArray(r.exercises) ? r.exercises.length : 0 });
