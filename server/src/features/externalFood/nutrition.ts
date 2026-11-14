// Nutrition basis handling. Every food states what its macro numbers refer to:
//  - 'per_100g':   values are per 100 g (or 100 ml) of product; scale by amount / 100.
//  - 'per_serving': values are per one serving; scale by number of servings.
// Per-serving values are only derived when a numeric serving size in g/ml can be parsed.

export type NutritionBasis = 'per_100g' | 'per_serving';

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ServingSize {
  qty: number;
  unit: 'g' | 'ml';
}

const SERVING_RE = /(\d+(?:[.,]\d+)?)\s*(g|gr|grams?|ml|millilit(?:er|re)s?)\b/i;

/** Parse a numeric serving size in g or ml from labels like "30 g", "1 cup (240 ml)". Otherwise undefined. */
export const parseServingSize = (label?: string | null): ServingSize | undefined => {
  if (!label) return undefined;
  const m = SERVING_RE.exec(label);
  if (!m) return undefined;
  const qty = parseFloat(m[1].replace(',', '.'));
  if (!isFinite(qty) || qty <= 0) return undefined;
  return { qty, unit: m[2].toLowerCase().startsWith('m') ? 'ml' : 'g' };
};

const round1 = (n: number) => Math.round(n * 10) / 10;

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && isFinite(n) && n >= 0 ? n : undefined;
};

/** Per-100g macros from Open Food Facts nutriments (only the explicit *_100g fields). */
export const per100gFromOff = (nutriments: any): Macros | undefined => {
  const n = nutriments || {};
  let kcal = num(n['energy-kcal_100g']);
  if (kcal === undefined) {
    const kj = num(n['energy-kj_100g'] ?? n['energy_100g']);
    if (kj !== undefined) kcal = kj / 4.184;
  }
  if (kcal === undefined) return undefined;
  return {
    calories: Math.round(kcal),
    protein: round1(num(n.proteins_100g) ?? 0),
    carbs: round1(num(n.carbohydrates_100g) ?? 0),
    fat: round1(num(n.fat_100g) ?? 0),
  };
};

/** Legacy cached Open Food Facts rows have no basis but hold per-100g values. */
export const resolveBasis = (food: { basis?: NutritionBasis | null; source?: string | null }): NutritionBasis =>
  food.basis ?? (food.source === 'openfoodfacts' ? 'per_100g' : 'per_serving');

/** How many "base units" a portion is: grams/100 for per_100g foods, servings for per_serving foods. */
export const portionFactor = (basis: NutritionBasis, amount: number): number =>
  basis === 'per_100g' ? amount / 100 : amount;

/** Scale macros by a factor; calories to whole kcal, macros to 0.1 g. */
export const scaleMacros = (base: Macros, factor: number): Macros => ({
  calories: Math.round(base.calories * factor),
  protein: round1(base.protein * factor),
  carbs: round1(base.carbs * factor),
  fat: round1(base.fat * factor),
});

/** Per-serving macros for a per-100g food, only when the serving size is numeric (g/ml). */
export const perServingFrom100g = (per100g: Macros, serving?: ServingSize): Macros | undefined =>
  serving ? scaleMacros(per100g, serving.qty / 100) : undefined;
