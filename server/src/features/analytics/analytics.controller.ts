import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as analyticsService from './analytics.service';
import { SuccessResponse } from '../../types/api';
import { AppError } from '../../middleware/errorHandler';

const MAX_ANALYTICS_DAYS = 365;

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user._id.toString();
  const parsedDays = req.query.days ? Number.parseInt(req.query.days as string, 10) : 30;
  if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > MAX_ANALYTICS_DAYS) {
    throw new AppError(400, 'VALIDATION_ERROR', `days must be an integer between 1 and ${MAX_ANALYTICS_DAYS}`);
  }
  const days = parsedDays;
  
  const data = await analyticsService.getAnalyticsDashboard(userId, days);
  const response: SuccessResponse<typeof data> = { success: true, data };
  res.json(response);
});
