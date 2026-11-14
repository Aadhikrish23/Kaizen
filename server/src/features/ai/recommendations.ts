// Deterministic meal suggestions: no AI needed. An optional re-ranker hook lets an AI layer reorder later.
import FoodItem from '../foods/FoodItem';
import Recipe from '../recipes/Recipe';
import { getSummaryByDate } from '../summary/summary.service';
import { Macros, resolveBasis, scaleMacros } from '../externalFood/nutrition';
import { todayInTz } from '../../utils/dates';

export interface MealCandidate extends Macros {
  id: string;
  type: 'food' | 'recipe';
  name: string;
  servingLabel: string;
}

export interface Suggestion extends MealCandidate {
  score: number;
  reason: string;
}

export interface Remaining {
  calories: number;
  protein: number;
}

/** Optional hook: receives the ranked list and may reorder/trim it (e.g. an LLM re-ranker). */
export type Reranker = (ranked: Suggestion[], remaining: Remaining) => Promise<Suggestion[]> | Suggestion[];

const MIN_MEAL_KCAL = 50;
const TYPICAL_MEAL_KCAL = 600;
const TYPICAL_MEAL_PROTEIN_G = 40;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Score a candidate against what is left today. Higher is better.
 *  - calorie fit (40%): closeness to a typical meal size capped by the calories remaining
 *  - protein fit (40%): how much of a protein-forward target (<= remaining protein) it supplies
 *  - protein density (20%): protein calories / calories, saturating at 60%
 */
export const scoreCandidate = (c: MealCandidate, remaining: Remaining): number => {
  const targetCal = Math.max(MIN_MEAL_KCAL, Math.min(remaining.calories, TYPICAL_MEAL_KCAL));
  const calFit = 1 - clamp01(Math.abs(c.calories - targetCal) / targetCal);
  const targetPro = Math.min(Math.max(remaining.protein, 0), TYPICAL_MEAL_PROTEIN_G);
  const proFit = targetPro > 0 ? clamp01(c.protein / targetPro) : 1;
  const density = clamp01(((c.protein * 4) / c.calories) / 0.6);
  return Math.round((0.4 * calFit + 0.4 * proFit + 0.2 * density) * 1000) / 1000;
};

export const buildReason = (c: MealCandidate, remaining: Remaining): string => {
  const parts = [`${c.calories} kcal and ${c.protein} g protein per ${c.servingLabel}`];
  parts.push(`fits within your ${Math.round(remaining.calories)} kcal remaining`);
  if (remaining.protein > 0) {
    const share = Math.round(Math.min(100, (c.protein / remaining.protein) * 100));
    parts.push(`covers about ${share}% of your ${Math.round(remaining.protein)} g remaining protein`);
  }
  return parts.join('; ');
};

export const rankMeals = async (
  candidates: MealCandidate[],
  remaining: Remaining,
  limit = 5,
  rerank?: Reranker
): Promise<Suggestion[]> => {
  if (!(remaining.calories >= MIN_MEAL_KCAL)) return []; // nothing sensible fits in what is left
  const seen = new Set<string>();
  let ranked: Suggestion[] = candidates
    .filter((c) => c.calories >= MIN_MEAL_KCAL && c.calories <= remaining.calories)
    .map((c) => ({ ...c, score: scoreCandidate(c, remaining), reason: buildReason(c, remaining) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .filter((s) => {
      const key = `${s.type}:${s.name.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (rerank) ranked = await rerank(ranked, remaining);
  return ranked.slice(0, limit);
};

// --- candidate construction -------------------------------------------------------------

export const foodToCandidate = (food: any): MealCandidate | null => {
  const basis = resolveBasis(food);
  if (basis === 'per_100g') {
    const qty = food.servingQty && food.servingQty > 0 ? food.servingQty : 100;
    const unit = food.servingUnit === 'ml' ? 'ml' : 'g';
    return { id: String(food._id), type: 'food', name: food.name, servingLabel: `${qty} ${unit}`, ...scaleMacros(food, qty / 100) };
  }
  const label = food.servingSize || '1 serving';
  return { id: String(food._id), type: 'food', name: food.name, servingLabel: label, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat };
};

/**
 * Recipe totals: imported recipes (no per-ingredient macros) store per-serving totals; manual recipes store the
 * sum of their ingredients for the whole recipe, so those are divided by servings.
 */
export const recipeToCandidate = (r: any): MealCandidate | null => {
  const ingredients: any[] = r.ingredients || [];
  const manual = ingredients.length > 0 && ingredients.every((i) => typeof i.calories === 'number');
  const servings = manual ? Math.max(1, r.servings || 1) : 1;
  if (typeof r.totalCalories !== 'number') return null;
  const m: Macros = {
    calories: Math.round(r.totalCalories / servings),
    protein: Math.round(((r.totalProtein || 0) / servings) * 10) / 10,
    carbs: Math.round(((r.totalCarbs || 0) / servings) * 10) / 10,
    fat: Math.round(((r.totalFat || 0) / servings) * 10) / 10,
  };
  return { id: String(r._id), type: 'recipe', name: r.name, servingLabel: '1 serving', ...m };
};

export const getMealRecommendations = async (
  user: any,
  opts: { date?: string; limit?: number; rerank?: Reranker } = {}
): Promise<Suggestion[]> => {
  const userId = String(user._id || user.id);
  const date = opts.date || todayInTz(user.timezone);
  const summary = await getSummaryByDate(date, userId);
  const remaining: Remaining = {
    calories: Math.max(0, summary.nutrition.calorieGoal - summary.nutrition.totalCalories),
    protein: Math.max(0, summary.nutrition.proteinGoal - summary.nutrition.totalProtein),
  };

  const [foods, recipes] = await Promise.all([
    FoodItem.find({ $or: [{ isCustom: false }, { userId: user._id, isCustom: true }] }).limit(400).lean(),
    Recipe.find({ userId: user._id }).limit(100).lean(),
  ]);
  const candidates = [
    ...foods.map(foodToCandidate),
    ...recipes.map(recipeToCandidate),
  ].filter((c): c is MealCandidate => !!c);

  return rankMeals(candidates, remaining, opts.limit ?? 5, opts.rerank);
};

