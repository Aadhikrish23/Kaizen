import { Request, Response, NextFunction } from 'express';
import * as externalFoodService from '../services/externalFood.service';

export const getRecipes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string) || 'chicken';
    const diet = req.query.diet as string | undefined;
    const cuisine = req.query.cuisine as string | undefined;

    const recipes = await externalFoodService.searchRecipes(q, diet, cuisine);

    res.status(200).json({
      success: true,
      count: recipes.length,
      data: recipes,
    });
  } catch (err) {
    next(err);
  }
};

export const getFoods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string) || '';
    // @ts-ignore
    const userId = req.user?._id?.toString();

    const foods = await externalFoodService.searchUnifiedFoods(q, userId);

    res.status(200).json({
      success: true,
      count: foods.length,
      data: foods,
    });
  } catch (err) {
    next(err);
  }
};

export const importRecipe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    const userId = req.user._id;
    const recipeData = req.body;

    const savedRecipe = await externalFoodService.importExternalRecipe(userId, recipeData);

    res.status(201).json({
      success: true,
      message: 'Recipe imported successfully',
      data: savedRecipe,
    });
  } catch (err) {
    next(err);
  }
};
