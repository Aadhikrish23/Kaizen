import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as profileService from '../services/profile.service';
import { SuccessResponse } from '../types/api';

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
