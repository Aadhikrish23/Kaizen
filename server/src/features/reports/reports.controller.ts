import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { getReport } from './reports.service';

export const report = asyncHandler(async (req: Request, res: Response) => {
  const data = await getReport((req as any).user, req.query.period as any, req.query.date as string | undefined);
  res.json({ success: true, data });
});
