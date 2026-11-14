import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { getGamification } from './gamification.service';

export const getProgress = asyncHandler(async (req: Request, res: Response) => {
  const data = await getGamification((req as any).user._id.toString());
  res.json({ success: true, data });
});
