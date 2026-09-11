import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as plannerService from '../services/planner.service';
import { SuccessResponse } from '../types/api';

export const getPlan = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const data = await plannerService.getUserPlan(userId);

  const response: SuccessResponse<typeof data> = {
    success: true,
    data,
  };
  res.json(response);
});

export const configurePlan = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const data = await plannerService.configurePlan(userId, req.body);

  const response: SuccessResponse<typeof data> = {
    success: true,
    data,
  };
  res.json(response);
});

export const adaptPlan = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const { date, force } = req.body || {};
  const data = await plannerService.adaptPlanDaily(userId, date, force);

  const response: SuccessResponse<typeof data> = {
    success: true,
    data,
  };
  res.json(response);
});

export const activateDay = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const { dayNumber, date } = req.body;
  const data = await plannerService.activatePlannedDay(userId, dayNumber, date);

  const response: SuccessResponse<typeof data> = {
    success: true,
    data,
  };
  res.status(201).json(response);
});

export const swapExercise = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const { dayNumber, exerciseIndex, newExerciseId } = req.body;
  const data = await plannerService.swapPlannedExercise(userId, dayNumber, exerciseIndex, newExerciseId);

  const response: SuccessResponse<typeof data> = {
    success: true,
    data,
  };
  res.json(response);
});

export const saveCustomPlan = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const data = await plannerService.saveCustomPlan(userId, req.body);

  const response: SuccessResponse<typeof data> = {
    success: true,
    data,
  };
  res.json(response);
});

export const addExerciseToDay = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const { dayNumber, exercise } = req.body;
  const data = await plannerService.addExerciseToDay(userId, dayNumber, exercise);

  const response: SuccessResponse<typeof data> = {
    success: true,
    data,
  };
  res.json(response);
});

export const removeExerciseFromDay = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const { dayNumber, exerciseIndex } = req.body;
  const data = await plannerService.removeExerciseFromDay(userId, dayNumber, exerciseIndex);

  const response: SuccessResponse<typeof data> = {
    success: true,
    data,
  };
  res.json(response);
});

export const deletePlan = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const data = await plannerService.deleteUserPlan(userId);

  const response: SuccessResponse<typeof data> = {
    success: true,
    data,
  };
  res.json(response);
});



