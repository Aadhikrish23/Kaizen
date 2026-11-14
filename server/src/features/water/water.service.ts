import WaterLog from './WaterLog';
import { recordActivity } from '../gamification/gamification.service';

export const getLogsByDate = async (date: string, userId: string) => {
  const logs = await WaterLog.find({ date, userId }).sort({ createdAt: 1 });
  const totalAmount = logs.reduce((sum, item) => sum + item.amount, 0);
  return { date, totalAmount, logs };
};

export const createLog = async (data: { amount: number; time: string; date: string; userId: string }) => {
  const log = new WaterLog(data);
  const saved = await log.save();
  recordActivity(data.userId, 'water_goal', data.date, saved._id); // rewarded only once the daily goal is reached
  return saved;
};

export const deleteLog = async (id: string, userId: string) => {
  return await WaterLog.findOneAndDelete({ _id: id, userId });
};
