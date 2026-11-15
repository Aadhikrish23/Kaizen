import { Request, Response, NextFunction } from 'express';
import { pickAllowed } from '../../utils/pickAllowed';
import { MEASUREMENT_KEYS } from './measurement.schema';
import * as measurementService from './measurement.service';

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
    const { date, ...data } = pickAllowed(req.body, MEASUREMENT_KEYS) as { date: string } & Record<string, unknown>;

    const measurement = await measurementService.upsertMeasurement(userId, date, data);

    res.status(200).json({
      success: true,
      data: measurement
    });
  } catch (error) {
    next(error);
  }
};
