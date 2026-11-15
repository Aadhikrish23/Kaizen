import { z } from 'zod';

const ingredientSchema = z.object({
  foodId: z.string().optional(),
  name: z.string().min(1),
  servingSize: z.string().min(1),
  quantity: z.number().min(0.1),
  calories: z.number().min(0),
  protein: z.number().min(0).default(0),
  carbs: z.number().min(0).default(0),
  fat: z.number().min(0).default(0)
}).strict();

export const createRecipeSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(300).optional(),
    ingredients: z.array(ingredientSchema).min(1)
  }).strict()
});

export const updateRecipeSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(300).optional(),
    ingredients: z.array(ingredientSchema).min(1).optional()
  }).strict()
});

export const RECIPE_CREATE_KEYS = Object.keys(createRecipeSchema.shape.body.shape);
export const RECIPE_UPDATE_KEYS = Object.keys(updateRecipeSchema.shape.body.shape);
