import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as profileService from './profile.service';
import { getGoalHistory as getGoalHistoryEntries, getGoalProgress } from '../goals/goals.service';
import { SuccessResponse } from '../../types/api';

const getUserId = (req: Request): string => {
  // @ts-ignore
  return req.user._id.toString();
};

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.getProfile(getUserId(req));
  const response: SuccessResponse<typeof data> = { success: true, data };
  res.json(response);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await profileService.updateProfile(getUserId(req), req.body);
  const response: SuccessResponse<typeof user> = { success: true, data: user };
  res.json(response);
});

export const getGoalHistory = asyncHandler(async (req: Request, res: Response) => {
  const data = await getGoalHistoryEntries(getUserId(req));
  res.json({ success: true, data });
});

export const getGoalProgressSummary = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const data = await getGoalProgress(req.user);
  res.json({ success: true, data });
});

export const completeOnboarding = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.completeOnboarding(getUserId(req), req.body);
  const response: SuccessResponse<typeof data> = { success: true, data };
  res.json(response);
});

export const computeTDEE = asyncHandler(async (req: Request, res: Response) => {
  const tdeeData = profileService.computeTDEE(req.body);
  const response: SuccessResponse<typeof tdeeData> = { success: true, data: tdeeData };
  res.json(response);
});
