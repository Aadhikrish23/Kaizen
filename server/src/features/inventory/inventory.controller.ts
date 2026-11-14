import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { applyWorkingWeightToPlan } from '../planner/planner.service';
import * as inventoryService from './inventory.service';
import { SuccessResponse } from '../../types/api';

export const getInventory = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const data = inventoryService.toInventoryResponse(await inventoryService.getUserInventory(userId));

  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.json(response);
});

export const updateInventory = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const { equipment } = req.body;
  const data = inventoryService.toInventoryResponse(await inventoryService.updateUserInventory(userId, equipment));

  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.json(response);
});

export const recordWorkingWeight = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const data = await inventoryService.recordWorkingWeight(userId, req.body);
  await applyWorkingWeightToPlan(userId, req.body.exerciseName, req.body.currentWeightKg);

  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.status(200).json(response);
});
