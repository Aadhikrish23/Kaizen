import FoodItem from '../foods/FoodItem';
import Recipe from '../recipes/Recipe';
import Exercise from '../exercises/Exercise';
import WorkoutRoutine from '../routines/WorkoutRoutine';
import {
  SEARCH_GROUP_LIMIT, buildNameMatcher, exerciseScope, foodScope,
  toExerciseResult, toFoodResult, toRecipeResult, toRoutineResult,
} from './search.query';

export interface SearchResults {
  foods: ReturnType<typeof toFoodResult>[];
  recipes: ReturnType<typeof toRecipeResult>[];
  exercises: ReturnType<typeof toExerciseResult>[];
  routines: ReturnType<typeof toRoutineResult>[];
}

const EMPTY: SearchResults = { foods: [], recipes: [], exercises: [], routines: [] };

/**
 * Grouped search across foods, recipes, exercises and routines. Recipes and routines are per-user only (there is no
 * public-recipe concept in the data model); foods and exercises are the global catalog plus the user's own rows.
 */
export const globalSearch = async (userId: string, rawQuery: unknown): Promise<SearchResults> => {
  const matcher = buildNameMatcher(rawQuery);
  if (!matcher) return { ...EMPTY };

  const [foods, recipes, exercises, routines] = await Promise.all([
    FoodItem.find({ $and: [foodScope(userId), { $or: [{ name: matcher }, { brand: matcher }] }] }).limit(SEARCH_GROUP_LIMIT).lean(),
    Recipe.find({ userId, name: matcher }).limit(SEARCH_GROUP_LIMIT).lean(),
    Exercise.find({ $and: [exerciseScope(userId), { name: matcher }] }).limit(SEARCH_GROUP_LIMIT).lean(),
    WorkoutRoutine.find({ userId, name: matcher }).limit(SEARCH_GROUP_LIMIT).lean(),
  ]);

  return {
    foods: foods.map(toFoodResult),
    recipes: recipes.map(toRecipeResult),
    exercises: exercises.map(toExerciseResult),
    routines: routines.map(toRoutineResult),
  };
};
