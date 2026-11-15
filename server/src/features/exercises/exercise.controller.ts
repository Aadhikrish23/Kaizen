import { pickAllowed } from '../../utils/pickAllowed';
import { EXERCISE_CREATE_KEYS } from './exercise.schema';
import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as exerciseService from './exercise.service';
import { SuccessResponse } from '../../types/api';
import { AppError } from '../../middleware/errorHandler';

export const getExercises = asyncHandler(async (req: Request, res: Response) => {
  const { muscle } = req.query;
  // @ts-ignore
  const userId = req.user.id;
  const data = await exerciseService.getExercises(userId, muscle as string);
  
  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.json(response);
});

export const createExercise = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const data = await exerciseService.createExercise({ ...pickAllowed(req.body, EXERCISE_CREATE_KEYS), userId });
  
  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.status(201).json(response);
});

export const deleteExercise = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  // @ts-ignore
  const userId = req.user.id;
  const deleted = await exerciseService.deleteExercise(id, userId);
  
  if (!deleted) {
    throw new AppError(404, 'NOT_FOUND', 'Exercise not found');
  }

  const response: SuccessResponse<{ id: string; deleted: any }> = {
    success: true,
    data: { id, deleted }
  };
  res.json(response);
});
