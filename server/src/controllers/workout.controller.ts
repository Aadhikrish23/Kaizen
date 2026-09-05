import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as workoutService from '../services/workout.service';
import { SuccessResponse } from '../types/api';
import { AppError } from '../middleware/errorHandler';

export const getSchedule = asyncHandler(async (req: Request, res: Response) => {
  const data = workoutService.getSchedule();
  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.json(response);
});

export const getWorkouts = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;
  // @ts-ignore
  const userId = req.user.id;
  const data = await workoutService.getWorkouts(userId, date as string);
  
  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.json(response);
});

export const createWorkout = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const data = await workoutService.createOrUpdateWorkout({ ...req.body, userId });
  
  const response: SuccessResponse<typeof data> = {
    success: true,
    data
  };
  res.status(201).json(response);
});

export const deleteWorkout = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  // @ts-ignore
  const userId = req.user.id;
  const deleted = await workoutService.deleteWorkout(id, userId);
  
  if (!deleted) {
    throw new AppError(404, 'NOT_FOUND', 'Workout log not found');
  }

  const response: SuccessResponse<{ id: string; deleted: any }> = {
    success: true,
    data: { id, deleted }
  };
  res.json(response);
});
