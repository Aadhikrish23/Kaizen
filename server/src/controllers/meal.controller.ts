import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as mealService from '../services/meal.service';
import { SuccessResponse } from '../types/api';
import { AppError } from '../middleware/errorHandler';

export const getMealLogs = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;
  // @ts-ignore
  const userId = req.user.id;
  const data = await mealService.getLogsByDate(date as string, userId);
  
  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.json(response);
});

export const createMealLog = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const data = await mealService.createLog({ ...req.body, userId });
  
  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.status(201).json(response);
});

export const deleteMealLog = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  // @ts-ignore
  const userId = req.user.id;
  const deleted = await mealService.deleteLog(id, userId);
  
  if (!deleted) {
    throw new AppError(404, 'NOT_FOUND', 'Meal log not found');
  }

  const response: SuccessResponse<{ id: string }> = {
    success: true,
    data: { id }
  };
  res.json(response);
});
