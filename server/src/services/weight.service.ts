import WeightLog from '../models/WeightLog';

export const getHistory = async (userId: string) => {
  return await WeightLog.find({ userId }).sort({ date: 1 });
};

export const getDailyLog = async (date: string, userId: string) => {
  return await WeightLog.findOne({ date, userId });
};

export const upsertLog = async (data: { weight: number; date: string; notes?: string; userId: string }) => {
  return await WeightLog.findOneAndUpdate(
    { date: data.date, userId: data.userId },
    { weight: data.weight, notes: data.notes || '' },
    { new: true, upsert: true, runValidators: true }
  );
};

export const deleteLog = async (id: string, userId: string) => {
  return await WeightLog.findOneAndDelete({ _id: id, userId });
};
