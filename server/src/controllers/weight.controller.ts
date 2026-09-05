import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as weightService from '../services/weight.service';
import { SuccessResponse } from '../types/api';
import { AppError } from '../middleware/errorHandler';

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const data = await weightService.getHistory(userId);
  
  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.json(response);
});

export const getDailyLog = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;
  // @ts-ignore
  const userId = req.user.id;
  const data = await weightService.getDailyLog(date as string, userId);
  
  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.json(response);
});

export const upsertWeightLog = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const data = await weightService.upsertLog({ ...req.body, userId });
  
  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.json(response);
});

export const deleteWeightLog = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  // @ts-ignore
  const userId = req.user.id;
  const deleted = await weightService.deleteLog(id, userId);
  
  if (!deleted) {
    throw new AppError(404, 'NOT_FOUND', 'Weight log not found');
  }

  const response: SuccessResponse<{ id: string, deleted: any }> = {
    success: true,
    data: { id, deleted }
  };
  res.json(response);
});
