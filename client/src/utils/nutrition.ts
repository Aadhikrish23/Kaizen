// Pure nutrition scaling helpers (also unit-tested from server/test).
// A food's macros refer to its `basis`: 'per_100g' (scale by grams / 100) or 'per_serving' (scale by servings).

export type NutritionBasis = 'per_100g' | 'per_serving';

export interface FoodLike {
  basis?: NutritionBasis;
  source?: string;
  servingQty?: number;
  servingUnit?: 'g' | 'ml';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Legacy cached Open Food Facts rows have no basis but hold per-100g values. */
export const resolveBasis = (food: Pick<FoodLike, 'basis' | 'source'>): NutritionBasis =>
  food.basis ?? (food.source === 'openfoodfacts' ? 'per_100g' : 'per_serving');

export const portionFactor = (basis: NutritionBasis, amount: number): number =>
  basis === 'per_100g' ? amount / 100 : amount;

const round1 = (n: number) => Math.round(n * 10) / 10;

export const scaleFood = (food: FoodLike, amount: number): Macros => {
  const f = portionFactor(resolveBasis(food), amount);
  return {
    calories: Math.round(food.calories * f),
    protein: round1(food.protein * f),
    carbs: round1(food.carbs * f),
    fat: round1(food.fat * f),
  };
};

/** Starting amount when a food is picked: its serving size (g/ml) if known, else 100 g; 1 serving for per-serving foods. */
export const defaultAmount = (food: FoodLike): number =>
  resolveBasis(food) === 'per_100g' ? food.servingQty ?? 100 : 1;

export const amountUnitLabel = (food: FoodLike): string =>
  resolveBasis(food) === 'per_100g' ? food.servingUnit ?? 'g' : 'serving(s)';
