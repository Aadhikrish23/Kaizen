import Recipe from '../models/Recipe';

const calculateTotals = (ingredients: any[]) => {
  return ingredients.reduce(
    (acc, curr) => ({
      totalCalories: acc.totalCalories + curr.calories,
      totalProtein: acc.totalProtein + curr.protein,
      totalCarbs: acc.totalCarbs + curr.carbs,
      totalFat: acc.totalFat + curr.fat
    }),
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
  );
};

export const getRecipes = async (userId: string) => {
  return Recipe.find({ userId }).sort({ name: 1 });
};

export const createRecipe = async (userId: string, data: any) => {
  const totals = calculateTotals(data.ingredients);
  return Recipe.create({
    ...data,
    userId,
    ...totals
  });
};

export const getRecipeById = async (userId: string, recipeId: string) => {
  const recipe = await Recipe.findOne({ _id: recipeId, userId });
  if (!recipe) throw new Error('Recipe not found');
  return recipe;
};

export const updateRecipe = async (userId: string, recipeId: string, data: any) => {
  const updateData = { ...data };
  if (data.ingredients) {
    const totals = calculateTotals(data.ingredients);
    Object.assign(updateData, totals);
  }
  const recipe = await Recipe.findOneAndUpdate({ _id: recipeId, userId }, updateData, { new: true });
  if (!recipe) throw new Error('Recipe not found');
  return recipe;
};

export const deleteRecipe = async (userId: string, recipeId: string) => {
  const recipe = await Recipe.findOneAndDelete({ _id: recipeId, userId });
  if (!recipe) throw new Error('Recipe not found');
  return recipe;
};
