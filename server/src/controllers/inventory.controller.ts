import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as inventoryService from '../services/inventory.service';
import { SuccessResponse } from '../types/api';

export const getInventory = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const data = await inventoryService.getUserInventory(userId);

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
  const data = await inventoryService.updateUserInventory(userId, equipment);

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

  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.status(200).json(response);
});
