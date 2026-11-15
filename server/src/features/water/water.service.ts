import WaterLog from './WaterLog';
import { createIdempotent } from '../../utils/idempotency';
import { recordActivity } from '../gamification/gamification.service';

export const getLogsByDate = async (date: string, userId: string) => {
  const logs = await WaterLog.find({ date, userId }).sort({ createdAt: 1 });
  const totalAmount = logs.reduce((sum, item) => sum + item.amount, 0);
  return { date, totalAmount, logs };
};

export const createLog = async (data: { amount: number; time: string; date: string; userId: string; clientRequestId?: string }) => {
  const { doc, replayed } = await createIdempotent(
    data.clientRequestId,
    () => WaterLog.findOne({ userId: data.userId, clientRequestId: data.clientRequestId }),
    () => new WaterLog(data).save()
  );
  if (!replayed) recordActivity(data.userId, 'water_goal', data.date, doc._id); // rewarded only once the daily goal is reached
  return doc;
};

export const deleteLog = async (id: string, userId: string) => {
  return await WaterLog.findOneAndDelete({ _id: id, userId });
};
