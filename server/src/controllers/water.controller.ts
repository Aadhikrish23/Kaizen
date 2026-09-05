import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as waterService from '../services/water.service';
import { SuccessResponse } from '../types/api';
import { AppError } from '../middleware/errorHandler';

export const getWaterLogs = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;
  // @ts-ignore
  const userId = req.user.id;
  const data = await waterService.getLogsByDate(date as string, userId);
  
  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.json(response);
});

export const createWaterLog = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const data = await waterService.createLog({ ...req.body, userId });
  
  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.status(201).json(response);
});

export const deleteWaterLog = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  // @ts-ignore
  const userId = req.user.id;
  const deleted = await waterService.deleteLog(id, userId);
  
  if (!deleted) {
    throw new AppError(404, 'NOT_FOUND', 'Water log entry not found');
  }

  const response: SuccessResponse<{ id: string }> = {
    success: true,
    data: { id }
  };
  res.json(response);
});
