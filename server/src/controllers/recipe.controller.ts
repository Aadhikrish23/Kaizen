import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as recipeService from '../services/recipe.service';
import { SuccessResponse } from '../types/api';

const getUserId = (req: Request): string => {
  // @ts-ignore
  return req.user._id.toString();
};

export const getRecipes = asyncHandler(async (req: Request, res: Response) => {
  const recipes = await recipeService.getRecipes(getUserId(req));
  const response: SuccessResponse<typeof recipes> = { success: true, data: recipes };
  res.json(response);
});

export const getRecipeById = asyncHandler(async (req: Request, res: Response) => {
  const recipe = await recipeService.getRecipeById(getUserId(req), req.params.id);
  const response: SuccessResponse<typeof recipe> = { success: true, data: recipe };
  res.json(response);
});

export const createRecipe = asyncHandler(async (req: Request, res: Response) => {
  const recipe = await recipeService.createRecipe(getUserId(req), req.body);
  const response: SuccessResponse<typeof recipe> = { success: true, data: recipe };
  res.status(201).json(response);
});

export const updateRecipe = asyncHandler(async (req: Request, res: Response) => {
  const recipe = await recipeService.updateRecipe(getUserId(req), req.params.id, req.body);
  const response: SuccessResponse<typeof recipe> = { success: true, data: recipe };
  res.json(response);
});

export const deleteRecipe = asyncHandler(async (req: Request, res: Response) => {
  await recipeService.deleteRecipe(getUserId(req), req.params.id);
  const response: SuccessResponse<null> = { success: true, data: null };
  res.json(response);
});
