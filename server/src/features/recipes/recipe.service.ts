import Recipe from './Recipe';

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

export const createRecipe = async (userId: string, data: any) => {
  const totals = calculateTotals(data.ingredients);
  return Recipe.create({
    ...data,
    userId,
    ...(totals || {})
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
    if (totals) Object.assign(updateData, totals);
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
