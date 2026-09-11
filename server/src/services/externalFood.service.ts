import axios from 'axios';
import FoodItem, { IFoodItem } from '../models/FoodItem';
import Recipe, { IRecipe } from '../models/Recipe';
import mongoose from 'mongoose';

export interface ExternalRecipeResult {
  externalId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sourceUrl?: string;
  servings: number;
  prepTimeMinutes?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }>;
  instructions: string[];
  source: 'spoonacular' | 'local';
}

export interface ExternalFoodResult {
  name: string;
  brand?: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
  externalId?: string;
  source: 'local' | 'spoonacular' | 'openfoodfacts';
}

const SPOONACULAR_KEY = process.env.SPOONACULAR_API_KEY || '';

/**
 * Search recipes via Spoonacular with fallback to local recipes
 */
export const searchRecipes = async (
  query: string,
  diet?: string,
  cuisine?: string
): Promise<ExternalRecipeResult[]> => {
  if (SPOONACULAR_KEY) {
    try {
      let url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${SPOONACULAR_KEY}&query=${encodeURIComponent(
        query
      )}&addRecipeNutrition=true&addRecipeInformation=true&number=8`;
      if (diet) url += `&diet=${encodeURIComponent(diet)}`;
      if (cuisine) url += `&cuisine=${encodeURIComponent(cuisine)}`;

      const response = await axios.get(url, { timeout: 6000 });
      const results = response.data?.results || [];

      if (results.length > 0) {
        return results.map((r: any) => {
          const nutrients = r.nutrition?.nutrients || [];
          const getNutrient = (nName: string) => {
            const found = nutrients.find((n: any) => n.name?.toLowerCase() === nName.toLowerCase());
            return found ? Math.round(found.amount) : 0;
          };

          const rawInstructions = r.analyzedInstructions?.[0]?.steps || [];
          const instructions = rawInstructions.map((s: any) => s.step || '');

          const ingredients = (r.extendedIngredients || []).map((ing: any) => ({
            name: ing.nameClean || ing.name || 'Ingredient',
            amount: ing.amount || 1,
            unit: ing.unit || 'serving',
          }));

          return {
            externalId: String(r.id),
            name: r.title,
            description: r.summary?.replace(/<[^>]*>?/gm, '').substring(0, 160) + '...',
            imageUrl: r.image,
            sourceUrl: r.sourceUrl,
            servings: r.servings || 1,
            prepTimeMinutes: r.readyInMinutes || 30,
            calories: getNutrient('calories'),
            protein: getNutrient('protein'),
            carbs: getNutrient('carbohydrates'),
            fat: getNutrient('fat'),
            ingredients,
            instructions: instructions.length > 0 ? instructions : [r.instructions || 'Prepare ingredients and cook to preference.'],
            source: 'spoonacular',
          };
        });
      }
    } catch (err: any) {
      console.warn('[ExternalFood] Spoonacular search failed or quota exceeded:', err?.message || err);
      // Fall through to local fallback
    }
  }

  // Fallback: search local/system recipes
  const localRecipes = await Recipe.find({
    name: { $regex: query, $options: 'i' },
  }).limit(8);

  return localRecipes.map((r) => ({
    externalId: String(r._id),
    name: r.name,
    description: r.description,
    imageUrl: r.imageUrl || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=500&q=80',
    sourceUrl: r.sourceUrl,
    servings: r.servings || 1,
    prepTimeMinutes: r.prepTimeMinutes || 25,
    calories: r.totalCalories,
    protein: r.totalProtein,
    carbs: r.totalCarbs,
    fat: r.totalFat,
    ingredients: r.ingredients.map((ing) => ({
      name: ing.name,
      amount: ing.quantity,
      unit: ing.servingSize,
      calories: ing.calories,
      protein: ing.protein,
      carbs: ing.carbs,
      fat: ing.fat,
    })),
    instructions: r.instructions && r.instructions.length > 0 ? r.instructions : ['Follow standard preparation instructions.'],
    source: 'local',
  }));
};

/**
 * Search Open Food Facts (Zero API Key, Unlimited open data fallback)
 */
export const searchOpenFoodFacts = async (query: string): Promise<ExternalFoodResult[]> => {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      query
    )}&search_simple=1&action=process&json=1&page_size=8`;
    const res = await axios.get(url, {
      timeout: 5000,
      headers: { 'User-Agent': 'KaizenHealthOS - Web - Version 2.0' },
    });
    const products = res.data?.products || [];

    const parsed: ExternalFoodResult[] = [];
    for (const p of products) {
      const name = p.product_name || p.product_name_en;
      if (!name) continue;

      const nutriments = p.nutriments || {};
      const calories = Math.round(nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? 0);
      const protein = Math.round(nutriments.proteins_100g ?? nutriments.proteins ?? 0);
      const carbs = Math.round(nutriments.carbohydrates_100g ?? nutriments.carbohydrates ?? 0);
      const fat = Math.round(nutriments.fat_100g ?? nutriments.fat ?? 0);

      parsed.push({
        name,
        brand: p.brands || undefined,
        servingSize: p.serving_size || '100g',
        calories,
        protein,
        carbs,
        fat,
        imageUrl: p.image_front_small_url || p.image_url,
        externalId: p.code || p.id,
        source: 'openfoodfacts',
      });
    }
    return parsed;
  } catch (err: any) {
    console.warn('[ExternalFood] OpenFoodFacts search failed:', err?.message || err);
    return [];
  }
};

/**
 * Unified food search:
 * 1. Checks local MongoDB
 * 2. If < 5 results, enriches with Open Food Facts
 * 3. Auto-caches top external results into local DB for offline access
 */
export const searchUnifiedFoods = async (
  query: string,
  userId?: string
): Promise<ExternalFoodResult[]> => {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  // 1. Local Database
  const localQuery: any = {
    $or: [{ name: { $regex: cleanQuery, $options: 'i' } }, { brand: { $regex: cleanQuery, $options: 'i' } }],
  };
  if (userId) {
    localQuery.$and = [{ $or: [{ userId: null }, { userId: new mongoose.Types.ObjectId(userId) }] }];
  }

  const localItems = await FoodItem.find(localQuery).limit(8);
  const localResults: ExternalFoodResult[] = localItems.map((item) => ({
    name: item.name,
    brand: item.brand,
    servingSize: item.servingSize,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    imageUrl: item.imageUrl,
    externalId: item.externalId || String(item._id),
    source: (item.source as any) || 'local',
  }));

  // If local results are sufficient, return immediately
  if (localResults.length >= 6) {
    return localResults;
  }

  // 2. Query Open Food Facts for enrichment
  const offResults = await searchOpenFoodFacts(cleanQuery);

  // Auto-cache unique external results to MongoDB in background
  for (const item of offResults) {
    if (item.calories > 0 || item.protein > 0) {
      FoodItem.findOne({ name: item.name, brand: item.brand })
        .then((existing) => {
          if (!existing) {
            FoodItem.create({
              name: item.name,
              brand: item.brand,
              servingSize: item.servingSize,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
              imageUrl: item.imageUrl,
              externalId: item.externalId,
              source: 'openfoodfacts',
              isCustom: false,
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }
  }

  // Deduplicate and combine
  const seen = new Set(localResults.map((r) => `${r.name.toLowerCase()}-${(r.brand || '').toLowerCase()}`));
  const combined = [...localResults];

  for (const off of offResults) {
    const key = `${off.name.toLowerCase()}-${(off.brand || '').toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(off);
    }
  }

  return combined.slice(0, 10);
};

/**
 * 1-Click Import an external recipe to user's saved recipes
 */
export const importExternalRecipe = async (
  userId: string,
  recipe: ExternalRecipeResult
): Promise<IRecipe> => {
  const imported = await Recipe.create({
    userId: new mongoose.Types.ObjectId(userId),
    name: recipe.name,
    description: recipe.description,
    imageUrl: recipe.imageUrl,
    sourceUrl: recipe.sourceUrl,
    servings: recipe.servings || 1,
    prepTimeMinutes: recipe.prepTimeMinutes || 30,
    instructions: recipe.instructions,
    totalCalories: recipe.calories,
    totalProtein: recipe.protein,
    totalCarbs: recipe.carbs,
    totalFat: recipe.fat,
    ingredients: recipe.ingredients.map((ing) => ({
      name: ing.name,
      servingSize: ing.unit || '1 serving',
      quantity: ing.amount || 1,
      calories: Math.round(recipe.calories / Math.max(1, recipe.ingredients.length)),
      protein: Math.round(recipe.protein / Math.max(1, recipe.ingredients.length)),
      carbs: Math.round(recipe.carbs / Math.max(1, recipe.ingredients.length)),
      fat: Math.round(recipe.fat / Math.max(1, recipe.ingredients.length)),
    })),
  });

  return imported;
};
