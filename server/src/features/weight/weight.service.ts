import WeightLog from './WeightLog';
import { recordActivity } from '../gamification/gamification.service';

export const getHistory = async (userId: string) => {
  return await WeightLog.find({ userId }).sort({ date: 1 });
};

export const getDailyLog = async (date: string, userId: string) => {
  return await WeightLog.findOne({ date, userId });
};

export const upsertLog = async (data: { weight: number; date: string; notes?: string; userId: string }) => {
  const log = await WeightLog.findOneAndUpdate(
    { date: data.date, userId: data.userId },
    { weight: data.weight, notes: data.notes || '' },
    { new: true, upsert: true, runValidators: true }
  );
  recordActivity(data.userId, 'weight', data.date, log?._id); // deduped per day, so edits earn nothing extra
  return log;
};

export const deleteLog = async (id: string, userId: string) => {
  return await WeightLog.findOneAndDelete({ _id: id, userId });
};
