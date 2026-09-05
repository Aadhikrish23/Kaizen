import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as analyticsService from '../services/analytics.service';
import { SuccessResponse } from '../types/api';

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user._id.toString();
  const days = req.query.days ? parseInt(req.query.days as string) : 30;
  
  const data = await analyticsService.getAnalyticsDashboard(userId, days);
  const response: SuccessResponse<typeof data> = { success: true, data };
  res.json(response);
});
