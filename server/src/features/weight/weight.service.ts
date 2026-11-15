import WeightLog from './WeightLog';
import { createIdempotent } from '../../utils/idempotency';
import { recordActivity } from '../gamification/gamification.service';

export const getHistory = async (userId: string) => {
  return await WeightLog.find({ userId }).sort({ date: 1 });
};

export const getDailyLog = async (date: string, userId: string) => {
  return await WeightLog.findOne({ date, userId });
};

export const upsertLog = async (data: { weight: number; date: string; notes?: string; userId: string; clientRequestId?: string }) => {
  // A replay of the same request returns the stored log and does not re-apply (it could overwrite a newer edit)
  const { doc: log, replayed } = await createIdempotent(
    data.clientRequestId,
    () => WeightLog.findOne({ userId: data.userId, clientRequestId: data.clientRequestId }),
    () =>
      WeightLog.findOneAndUpdate(
        { date: data.date, userId: data.userId },
        { weight: data.weight, notes: data.notes || '', ...(data.clientRequestId ? { clientRequestId: data.clientRequestId } : {}) },
        { new: true, upsert: true, runValidators: true }
      ) as Promise<any>
  );
  if (!replayed) recordActivity(data.userId, 'weight', data.date, log?._id); // deduped per day, so edits earn nothing extra
  return log;
};

export const deleteLog = async (id: string, userId: string) => {
  return await WeightLog.findOneAndDelete({ _id: id, userId });
};
