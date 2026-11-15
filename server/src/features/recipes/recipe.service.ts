import { AppError } from '../../middleware/errorHandler';
import Recipe from './Recipe';
import { pickAllowed } from '../../utils/pickAllowed';
import { RECIPE_CREATE_KEYS, RECIPE_UPDATE_KEYS } from './recipe.schema';

// Returns null when any ingredient lacks macros (imported recipes), so existing totals are not overwritten.
export const calculateTotals = (ingredients: any[]) => {
  if (ingredients.some((i) => typeof i.calories !== 'number')) return null;
  return ingredients.reduce(
    (acc, curr) => ({
      totalCalories: acc.totalCalories + curr.calories,
      totalProtein: acc.totalProtein + (curr.protein || 0),
      totalCarbs: acc.totalCarbs + (curr.carbs || 0),
      totalFat: acc.totalFat + (curr.fat || 0)
    }),
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
  );
};

export const getRecipes = async (userId: string) => {
  return Recipe.find({ userId }).sort({ name: 1 });
};

/** The document written on create: whitelisted client fields first, then the server-owned ones (userId, totals). */
export const buildRecipeDoc = (userId: string, data: any) => {
  const totals = calculateTotals(data.ingredients);
  if (!totals) {
    // Manual recipes must carry macros on every ingredient (the route's zod schema enforces this too).
    throw new AppError(400, 'VALIDATION_ERROR', 'Every ingredient needs calories to create a recipe');
  }
  return { ...pickAllowed(data, RECIPE_CREATE_KEYS), userId, ...totals };
};

export const createRecipe = async (userId: string, data: any) => Recipe.create(buildRecipeDoc(userId, data));

/** The $set written on update: whitelisted fields, plus recomputed totals when every ingredient has macros. */
export const buildRecipeUpdate = (data: any): Record<string, unknown> => {
  const updateData: Record<string, unknown> = pickAllowed(data, RECIPE_UPDATE_KEYS);
  if (data.ingredients) {
    const totals = calculateTotals(data.ingredients);
    if (totals) Object.assign(updateData, totals);
  }
  return updateData;
};

export const getRecipeById = async (userId: string, recipeId: string) => {
  const recipe = await Recipe.findOne({ _id: recipeId, userId });
  if (!recipe) throw new Error('Recipe not found');
  return recipe;
};

export const updateRecipe = async (userId: string, recipeId: string, data: any) => {
  const recipe = await Recipe.findOneAndUpdate({ _id: recipeId, userId }, buildRecipeUpdate(data), { new: true });
  if (!recipe) throw new Error('Recipe not found');
  return recipe;
};

export const deleteRecipe = async (userId: string, recipeId: string) => {
  const recipe = await Recipe.findOneAndDelete({ _id: recipeId, userId });
  if (!recipe) throw new Error('Recipe not found');
  return recipe;
};
