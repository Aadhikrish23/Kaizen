import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as sleepService from '../services/sleep.service';
import { SuccessResponse } from '../types/api';
import { AppError } from '../middleware/errorHandler';

export const getSleepLog = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user._id || req.user.id;
  const { date } = req.query;

  if (!date) {
    throw new AppError(400, 'BAD_REQUEST', 'Date query parameter is required');
  }

  const data = await sleepService.getSleepLogByDate(userId.toString(), date as string);

  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.json(response);
});

export const getSleepHistory = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user._id || req.user.id;
  const { startDate, endDate } = req.query;

  const data = await sleepService.getSleepLogs(
    userId.toString(),
    startDate as string | undefined,
    endDate as string | undefined
  );

  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.json(response);
});

export const upsertSleepLog = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user._id || req.user.id;
  const data = await sleepService.upsertSleepLog({
    ...req.body,
    userId: userId.toString()
  });

  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.status(200).json(response);
});

export const deleteSleepLog = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user._id || req.user.id;
  const { id } = req.params;

  const data = await sleepService.deleteSleepLog(userId.toString(), id);

  if (!data) {
    throw new AppError(404, 'NOT_FOUND', 'Sleep log not found or unauthorized');
  }

  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.json(response);
});

export const getCircadianWindows = asyncHandler(async (req: Request, res: Response) => {
  const wakeTime = (req.query.wakeTime as string) || '07:00';
  const windows = sleepService.calculateOptimalSleepWindows(wakeTime);

  const response: SuccessResponse<typeof windows> = {
    success: true,
    data: windows
  };
  res.json(response);
});
