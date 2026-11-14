import GoalHistory from './GoalHistory';
import WeightLog from '../weight/WeightLog';
import User from '../auth/User';
import { computeGoalProgress, GoalSnapshot, normalizeDate } from './goals.logic';
import { todayInTz } from '../../utils/dates';

/** Append a history entry (snapshot of the new goal state) when goal fields changed. */
export const recordGoalChange = async (userId: string, after: GoalSnapshot, changed: string[], startWeightKg?: number | null) => {
  if (changed.length === 0) return null;
  return GoalHistory.create({
    userId,
    goal: after.goal ?? null,
    targetWeightKg: after.targetWeightKg ?? null,
    targetDate: normalizeDate(after.targetDate),
    startWeightKg: startWeightKg ?? null,
    changed,
  });
};

export const getGoalHistory = async (userId: string, limit = 50) =>
  GoalHistory.find({ userId }).sort({ createdAt: -1, _id: -1 }).limit(limit).lean();

export const getGoalProgress = async (user: any) => {
  const userId = String(user._id || user.id);
  const [weighIns, latest] = await Promise.all([
    WeightLog.find({ userId }).sort({ date: 1 }).lean(),
    GoalHistory.findOne({ userId }).sort({ createdAt: -1, _id: -1 }).lean(),
  ]);
  const fresh: any = await User.findById(userId).select('targetWeightKg targetDate').lean();
  return computeGoalProgress({
    startWeightKg: latest?.startWeightKg ?? null,
    goalSetDate: latest ? todayInTz(user.timezone, new Date((latest as any).createdAt)) : null,
    targetWeightKg: fresh?.targetWeightKg ?? user.targetWeightKg ?? null,
    targetDate: normalizeDate(fresh?.targetDate ?? user.targetDate),
    today: todayInTz(user.timezone),
    weighIns: weighIns.map((w: any) => ({ date: w.date, weight: w.weight })),
  });
};
