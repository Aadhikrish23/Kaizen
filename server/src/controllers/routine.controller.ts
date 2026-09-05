import { Request, Response, NextFunction } from 'express';
import * as routineService from '../services/routine.service';

export const createRoutineHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    const userId = req.user._id;
    const { name, description, exercises } = req.body;

    const routine = await routineService.createRoutine(userId, name, description, exercises);

    res.status(201).json({
      success: true,
      data: routine
    });
  } catch (error) {
    next(error);
  }
};

export const getRoutinesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    const userId = req.user._id;

    const routines = await routineService.getRoutinesByUser(userId);

    res.status(200).json({
      success: true,
      count: routines.length,
      data: routines
    });
  } catch (error) {
    next(error);
  }
};

export const getRoutineByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    const userId = req.user._id;
    const { id } = req.params;

    const routine = await routineService.getRoutineById(id, userId);

    if (!routine) {
      return res.status(404).json({
        success: false,
        error: 'Workout routine not found'
      });
    }

    res.status(200).json({
      success: true,
      data: routine
    });
  } catch (error) {
    next(error);
  }
};

export const updateRoutineHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    const userId = req.user._id;
    const { id } = req.params;

    const routine = await routineService.updateRoutine(id, userId, req.body);

    if (!routine) {
      return res.status(404).json({
        success: false,
        error: 'Workout routine not found'
      });
    }

    res.status(200).json({
      success: true,
      data: routine
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRoutineHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    const userId = req.user._id;
    const { id } = req.params;

    const routine = await routineService.deleteRoutine(id, userId);

    if (!routine) {
      return res.status(404).json({
        success: false,
        error: 'Workout routine not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
