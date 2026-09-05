import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as foodService from '../services/food.service';
import { SuccessResponse } from '../types/api';

const getUserId = (req: Request): string => {
  // @ts-ignore
  return req.user._id.toString();
};

export const searchFoods = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query.q as string || '';
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
  
  const foods = await foodService.searchFoods(getUserId(req), q, limit);
  const response: SuccessResponse<typeof foods> = { success: true, data: foods };
  res.json(response);
});

export const createFood = asyncHandler(async (req: Request, res: Response) => {
  const food = await foodService.createCustomFood(getUserId(req), req.body);
  const response: SuccessResponse<typeof food> = { success: true, data: food };
  res.status(201).json(response);
});

export const deleteFood = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await foodService.deleteCustomFood(getUserId(req), id);
  const response: SuccessResponse<null> = { success: true, data: null };
  res.json(response);
});
