import { Request, Response, NextFunction } from 'express';
import * as measurementService from '../services/measurement.service';

export const getMeasurements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    const userId = req.user._id;
    const { startDate, endDate } = req.query;

    let measurements;
    if (startDate && endDate) {
      measurements = await measurementService.getMeasurementsByDateRange(
        userId,
        startDate as string,
        endDate as string
      );
    } else {
      measurements = await measurementService.getMeasurementsByUser(userId);
    }

    res.status(200).json({
      success: true,
      count: measurements.length,
      data: measurements
    });
  } catch (error) {
    next(error);
  }
};

export const upsertMeasurement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    const userId = req.user._id;
    const { date, ...data } = req.body;

    const measurement = await measurementService.upsertMeasurement(userId, date, data);

    res.status(200).json({
      success: true,
      data: measurement
    });
  } catch (error) {
    next(error);
  }
};
