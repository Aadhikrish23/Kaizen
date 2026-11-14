import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as searchService from './search.service';

export const globalSearch = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id.toString();
  const data = await searchService.globalSearch(userId, req.query.q);
  res.json({ success: true, data });
});
