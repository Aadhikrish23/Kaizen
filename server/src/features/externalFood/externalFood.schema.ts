import { z } from 'zod';

const searchQuery = z.string().trim().max(100, 'q must be at most 100 characters');

// GET /external/recipes and /external/foods: plain strings only (rejects q[$ne]=x style objects and arrays), bounded length
export const externalRecipesQuerySchema = z.object({
  query: z.object({
    q: searchQuery.optional(),
    diet: z.string().trim().max(50).optional(),
    cuisine: z.string().trim().max(50).optional(),
  }),
});

export const externalFoodsQuerySchema = z.object({
  query: z.object({ q: searchQuery.optional() }),
});

const nonNegative = z.number().finite().min(0);

const importIngredient = z.object({
  name: z.string().min(1).max(200),
  amount: z.number().finite().min(0).nullish(),
  unit: z.string().max(50).nullish(),
  calories: nonNegative.nullish(),
  protein: nonNegative.nullish(),
  carbs: nonNegative.nullish(),
  fat: nonNegative.nullish(),
});

// The service copies explicit fields (it never spreads the body); this validates their types and sizes so malformed
// input is a 400 instead of a 500, and unknown extras (externalId, source, ...) are simply ignored.
export const importRecipeSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).nullish(),
    imageUrl: z.string().max(2000).nullish(),
    sourceUrl: z.string().max(2000).nullish(),
    servings: z.number().finite().gt(0).max(1000).nullish(), // fractional servings are valid imports
    prepTimeMinutes: z.number().finite().min(0).max(100000).nullish(),
    // Steps may be long raw text (Spoonacular fallback); the service splits/truncates them instead of rejecting
    instructions: z.array(z.string()).max(500).nullish(),
    calories: nonNegative,
    protein: nonNegative,
    carbs: nonNegative,
    fat: nonNegative,
    ingredients: z.array(importIngredient).max(200),
  }),
});
