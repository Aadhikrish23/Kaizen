import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as summaryService from '../services/summary.service';
import { SuccessResponse } from '../types/api';

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;
  // @ts-ignore
  const userId = req.user.id;
  const data = await summaryService.getSummaryByDate(date as string, userId);
  
  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.json(response);
});
