import { z } from 'zod';

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
    servings: z.number().finite().min(1).max(1000).nullish(),
    prepTimeMinutes: z.number().finite().min(0).max(100000).nullish(),
    instructions: z.array(z.string().max(5000)).max(200).nullish(),
    calories: nonNegative,
    protein: nonNegative,
    carbs: nonNegative,
    fat: nonNegative,
    ingredients: z.array(importIngredient).max(200),
  }),
});
