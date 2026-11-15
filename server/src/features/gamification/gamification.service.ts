import mongoose from 'mongoose';
import UserProgress from './UserProgress';
import XpEvent from './XpEvent';
import User from '../auth/User';
import WaterLog from '../water/WaterLog';
import { addDaysTz, todayInTz } from '../../utils/dates';
import { getUserTimezone } from '../../utils/userTimezone';
import {
  ActivityType, XP_VALUES, applyActivityToStreak, dedupeKeys, effectiveStreak, evaluateAchievements, isRewardableDate,
  levelForXp, levelProgress, newlyUnlocked, ProgressStats,
} from './gamification.logic';

const isDuplicateKey = (err: any) => err?.code === 11000;

const loadStats = async (userId: any, progress: { longestStreak: number; level: number }): Promise<ProgressStats> => {
  const rows: Array<{ _id: string; n: number }> = await XpEvent.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(String(userId)) } },
    { $group: { _id: '$type', n: { $sum: 1 } } },
  ]);
  const n = (t: ActivityType) => rows.find((r) => r._id === t)?.n ?? 0;
  return {
    mealDays: n('meal'),
    workoutDays: n('workout'),
    weightDays: n('weight'),
    sleepDays: n('sleep'),
    waterGoalDays: n('water_goal'),
    longestStreak: progress.longestStreak,
    level: progress.level,
  };
};

/**
 * Try to award XP for an action. Returns the XP granted (0 when capped/duplicate/not rewardable).
 * Idempotent: the unique (userId, dedupeKey) index guarantees one award per key even under concurrency.
 */
export const awardActivity = async (userId: string, type: ActivityType, date: string, refId?: string): Promise<number> => {
  const tz = await getUserTimezone(userId);
  const today = todayInTz(tz);
  if (!isRewardableDate(date, today)) return 0;

  let granted = false;
  for (const dedupeKey of dedupeKeys(type, date)) {
    try {
      await XpEvent.create({ userId, type, date, dedupeKey, xp: XP_VALUES[type], refId });
      granted = true;
      break;
    } catch (err) {
      if (!isDuplicateKey(err)) throw err; // this slot is taken: try the next one, else the cap is reached
    }
  }
  if (!granted) return 0;

  // XP is exact (an atomic $inc per unique event); the streak is updated with an optimistic guard on lastActiveDate.
  let progress = await UserProgress.findOneAndUpdate({ userId }, { $inc: { xp: XP_VALUES[type] }, $setOnInsert: { userId } }, { upsert: true, new: true });
  const next = applyActivityToStreak(
    { currentStreak: progress.currentStreak, longestStreak: progress.longestStreak, lastActiveDate: progress.lastActiveDate },
    date
  );
  const level = levelForXp(progress.xp);
  const updated = await UserProgress.findOneAndUpdate(
    { userId, lastActiveDate: progress.lastActiveDate },
    { $set: { ...next, level } },
    { new: true }
  );
  if (updated) progress = updated;
  else await UserProgress.updateOne({ userId }, { $set: { level } }); // someone else advanced the streak: keep it, fix level

  // Persist newly earned achievements
  const stats = await loadStats(userId, { longestStreak: Math.max(progress.longestStreak, next.longestStreak), level });
  const fresh = newlyUnlocked(stats, progress.achievements.map((a) => a.key));
  if (fresh.length) {
    await UserProgress.updateOne(
      { userId, 'achievements.key': { $nin: fresh } },
      { $push: { achievements: { $each: fresh.map((key) => ({ key, unlockedAt: new Date() })) } } }
    );
  }
  return XP_VALUES[type];
};

/**
 * Fire-and-forget hook for the create paths. It never throws and is never awaited by callers, so it cannot fail
 * or slow the primary operation; errors are logged.
 */
export const recordActivity = (userId: unknown, type: ActivityType, date: string, refId?: unknown): void => {
  try {
    const id = String(userId);
    void (async () => {
      if (type === 'water_goal') {
        // Only reaching the daily goal is rewarded
        const [logs, user] = await Promise.all([WaterLog.find({ userId: id, date }).lean(), User.findById(id).select('waterDailyTargetMl').lean()]);
        const total = logs.reduce((s: number, l: any) => s + (l.amount || 0), 0);
        const goal = (user as any)?.waterDailyTargetMl || 2500;
        if (total < goal) return;
      }
      await awardActivity(id, type, date, refId ? String(refId) : undefined);
    })().catch((err) => console.error(`[Gamification] ${type} award failed:`, err));
  } catch (err) {
    console.error('[Gamification] hook failed:', err);
  }
};

export const getGamification = async (userId: string) => {
  const tz = await getUserTimezone(userId);
  const today = todayInTz(tz);
  const progress = await UserProgress.findOne({ userId }).lean();
  const base = progress ?? { xp: 0, level: 1, currentStreak: 0, longestStreak: 0, lastActiveDate: null, achievements: [] as any[] };

  const stats = await loadStats(userId, { longestStreak: base.longestStreak, level: levelForXp(base.xp) });
  const state = { currentStreak: base.currentStreak, longestStreak: base.longestStreak, lastActiveDate: base.lastActiveDate };
  return {
    progress: levelProgress(base.xp),
    streak: {
      current: effectiveStreak(state, today),
      longest: base.longestStreak,
      lastActiveDate: base.lastActiveDate,
      activeToday: base.lastActiveDate === today,
    },
    achievements: evaluateAchievements(stats, base.achievements),
    // yesterday-only grace is shown so the UI can nudge "log something today to keep your streak"
    streakAtRisk: base.lastActiveDate === addDaysTz(today, -1) && base.currentStreak > 0,
  };
};
