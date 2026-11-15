import mongoose from 'mongoose';
import { pickAllowed } from '../../utils/pickAllowed';
import { MEASUREMENT_FIELDS } from './measurement.schema';
import MeasurementLog, { IMeasurementLog } from './MeasurementLog';

export const getMeasurementsByUser = async (userId: string | mongoose.Types.ObjectId): Promise<IMeasurementLog[]> => {
  return await MeasurementLog.find({ userId }).sort({ date: -1 });
};

export const getMeasurementsByDateRange = async (
  userId: string | mongoose.Types.ObjectId,
  startDate: string,
  endDate: string
): Promise<IMeasurementLog[]> => {
  return await MeasurementLog.find({
    userId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });
};

export const upsertMeasurement = async (
  userId: string | mongoose.Types.ObjectId,
  date: string,
  data: Partial<IMeasurementLog>
): Promise<IMeasurementLog> => {
  return await MeasurementLog.findOneAndUpdate(
    { userId, date },
    { $set: pickAllowed(data, MEASUREMENT_FIELDS) }, // never userId/date/_id from the client
    { new: true, upsert: true, runValidators: true }
  );
};
