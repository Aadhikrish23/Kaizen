import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { getWeeklyInsight } from './weeklyInsight.service';

export const weeklyInsight = asyncHandler(async (req: Request, res: Response) => {
  const data = await getWeeklyInsight((req as any).user);
  res.json({ success: true, data });
});
