import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as reminderService from './reminders.service';

export const getReminders = asyncHandler(async (req: Request, res: Response) => {
  const data = await reminderService.getPrefs((req as any).user._id.toString());
  res.json({ success: true, data });
});

export const putReminders = asyncHandler(async (req: Request, res: Response) => {
  const data = await reminderService.savePrefs((req as any).user._id.toString(), req.body);
  res.json({ success: true, data });
});

export const getDueReminders = asyncHandler(async (req: Request, res: Response) => {
  const data = await reminderService.getDue((req as any).user);
  res.json({ success: true, data });
});
