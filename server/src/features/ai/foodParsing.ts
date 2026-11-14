// Free-text meal parsing support: deterministic fallback parser plus DB matching and scaling.
// The AI layer (when available) only extracts names and quantities; nutrition always comes from the food DB.
import { Macros, NutritionBasis, parseServingSize, portionFactor, resolveBasis, scaleMacros } from '../externalFood/nutrition';

export interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
  grams?: number | null;
  confidence: number;
}

export interface FoodRecord {
  _id?: unknown;
  name: string;
  brand?: string;
  servingSize?: string;
  basis?: NutritionBasis | null;
  servingQty?: number | null;
  servingUnit?: 'g' | 'ml' | null;
  source?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// unit word -> [canonical unit, grams per unit | null]
const UNITS: Record<string, [string, number | null]> = {
  g: ['g', 1], gm: ['g', 1], gram: ['g', 1], grams: ['g', 1],
  kg: ['kg', 1000], kilo: ['kg', 1000], kilos: ['kg', 1000], kilogram: ['kg', 1000], kilograms: ['kg', 1000],
  oz: ['oz', 28.35], ounce: ['oz', 28.35], ounces: ['oz', 28.35],
  lb: ['lb', 453.6], lbs: ['lb', 453.6], pound: ['lb', 453.6], pounds: ['lb', 453.6],
  ml: ['ml', null], l: ['l', null], litre: ['l', null], litres: ['l', null], liter: ['l', null], liters: ['l', null],
  cup: ['cup', null], cups: ['cup', null], tbsp: ['tbsp', null], tablespoon: ['tbsp', null], tablespoons: ['tbsp', null],
  tsp: ['tsp', null], teaspoon: ['tsp', null], teaspoons: ['tsp', null],
  piece: ['piece', null], pieces: ['piece', null], slice: ['slice', null], slices: ['slice', null],
  serving: ['serving', null], servings: ['serving', null], bowl: ['bowl', null], bowls: ['bowl', null],
  glass: ['glass', null], glasses: ['glass', null], plate: ['plate', null], plates: ['plate', null],
  scoop: ['scoop', null], scoops: ['scoop', null],
};

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, half: 0.5,
};

/** Units that count whole portions of the food rather than a weight/volume. */
export const COUNT_UNITS = new Set(['piece', 'slice', 'serving', 'bowl', 'glass', 'plate', 'scoop', 'cup', 'tbsp', 'tsp']);

const parseQuantity = (token: string): number | null => {
  const t = token.toLowerCase();
  if (t in NUMBER_WORDS) return NUMBER_WORDS[t];
  const frac = /^(\d+)\/(\d+)$/.exec(t);
  if (frac) return Number(frac[2]) === 0 ? null : Number(frac[1]) / Number(frac[2]);
  if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t);
  return null;
};

/**
 * Deterministic parser: "2 rotis and 1 cup dal, 150g chicken" -> items.
 * Segments split on commas, "and", "&", "+", "with" and newlines. Quantity defaults to 1.
 */
export const regexParseFood = (text: string): ParsedItem[] => {
  const segments = text
    .toLowerCase()
    .split(/\s*(?:,|;|\n|&|\+|\band\b|\bwith\b)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  const items: ParsedItem[] = [];
  for (const seg of segments) {
    // glue "150g" -> "150 g"
    const tokens = seg.replace(/^(\d+(?:\.\d+)?)([a-z]+)/, '$1 $2').split(/\s+/);
    let quantity = 1;
    let hadQuantity = false;
    let i = 0;
    const q = parseQuantity(tokens[0]);
    if (q !== null) {
      quantity = q;
      hadQuantity = true;
      i = 1;
    }
    let unit = 'piece';
    let gramsPerUnit: number | null = null;
    let hadUnit = false;
    if (i < tokens.length && tokens[i] in UNITS) {
      [unit, gramsPerUnit] = UNITS[tokens[i]];
      hadUnit = true;
      i++;
      if (tokens[i] === 'of') i++;
    }
    const name = tokens.slice(i).join(' ').replace(/[^a-z0-9\s'-]/g, '').trim();
    if (!name || !(quantity > 0)) continue;
    items.push({
      name,
      quantity,
      unit,
      grams: gramsPerUnit ? Math.round(quantity * gramsPerUnit * 10) / 10 : null,
      confidence: hadQuantity && hadUnit ? 0.6 : hadQuantity ? 0.5 : 0.35,
    });
  }
  return items.slice(0, 20);
};

/** Candidate search terms for a parsed name: exact, then a simple singular form. */
export const searchTerms = (name: string): string[] => {
  const terms = [name];
  if (/[^aeiou]ies$/.test(name)) terms.push(name.slice(0, -3) + 'y');
  else if (/(ch|sh|x|z|ss|o)es$/.test(name)) terms.push(name.slice(0, -2));
  else if (/[^s]s$/.test(name) && name.length > 3) terms.push(name.slice(0, -1));
  return terms;
};

/** Pick the best match among DB rows: exact name, then prefix, then shortest name. */
export const pickBestFood = <T extends { name: string }>(name: string, foods: T[]): T | undefined => {
  const n = name.trim().toLowerCase();
  const score = (f: T) => {
    const fn = f.name.trim().toLowerCase();
    if (fn === n) return 0;
    if (fn.startsWith(n)) return 1;
    return 2;
  };
  return [...foods].sort((a, b) => score(a) - score(b) || a.name.length - b.name.length)[0];
};

export interface ResolvedAmount {
  amount: number;
  amountUnit: 'g' | 'ml' | 'serving';
}

/**
 * Express the parsed quantity in the food's own basis units:
 *  - per_100g foods: grams (from explicit grams, or count x known serving size)
 *  - per_serving foods: number of servings (count units, or grams / numeric serving size)
 * Returns null when it cannot be done honestly (the UI then asks the user).
 */
export const resolveAmount = (item: ParsedItem, food: FoodRecord): ResolvedAmount | null => {
  const basis = resolveBasis(food);
  const unitOfFood: 'g' | 'ml' = food.servingUnit === 'ml' ? 'ml' : 'g';
  const isCount = COUNT_UNITS.has(item.unit);
  const grams = item.grams && item.grams > 0 ? item.grams : null;

  if (basis === 'per_100g') {
    if (grams) return { amount: grams, amountUnit: unitOfFood };
    if (item.unit === 'ml') return { amount: item.quantity, amountUnit: 'ml' };
    if (isCount && food.servingQty && food.servingQty > 0) return { amount: item.quantity * food.servingQty, amountUnit: unitOfFood };
    return null;
  }

  // per_serving
  if (isCount) return { amount: item.quantity, amountUnit: 'serving' };
  const serving = parseServingSize(food.servingSize);
  if (grams && serving && serving.unit === 'g') return { amount: Math.round((grams / serving.qty) * 100) / 100, amountUnit: 'serving' };
  return null;
};

export interface MatchedNutrition {
  amount: number;
  amountUnit: ResolvedAmount['amountUnit'];
  nutrition: Macros;
}

export const computeNutrition = (item: ParsedItem, food: FoodRecord): MatchedNutrition | null => {
  const resolved = resolveAmount(item, food);
  if (!resolved) return null;
  const factor = portionFactor(resolveBasis(food), resolved.amount);
  return { ...resolved, nutrition: scaleMacros(food, factor) };
};

export interface ParsedFoodResult extends ParsedItem {
  /** 'database' when nutrition comes from a matched DB food, otherwise 'estimate' (no numbers: the user must fill them in). */
  source: 'database' | 'estimate';
  needsConfirmation: boolean;
  amount: number | null;
  amountUnit: ResolvedAmount['amountUnit'] | null;
  nutrition: Macros | null;
  food: FoodRecord | null;
}

/** Combine a parsed item with an (optional) DB match. Never fabricates nutrition. */
export const buildResult = (item: ParsedItem, food: FoodRecord | undefined): ParsedFoodResult => {
  const base = { ...item, grams: item.grams ?? null };
  if (!food) {
    return { ...base, source: 'estimate', needsConfirmation: true, amount: null, amountUnit: null, nutrition: null, food: null };
  }
  const matched = computeNutrition(item, food);
  if (!matched) {
    // Food found but the amount cannot be converted: keep the match so the user can enter an amount.
    return { ...base, source: 'estimate', needsConfirmation: true, amount: null, amountUnit: null, nutrition: null, food };
  }
  return { ...base, source: 'database', needsConfirmation: item.confidence < 0.5, ...matched, food };
};
