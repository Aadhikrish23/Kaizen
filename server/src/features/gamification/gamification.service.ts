import mongoose from 'mongoose';
import UserProgress from './UserProgress';
import XpEvent from './XpEvent';
import User from '../auth/User';
import WaterLog from '../water/WaterLog';
import { addDaysTz, todayInTz } from '../../utils/dates';
import { getUserTimezone } from '../../utils/userTimezone';
import {
  ActivityType, XP_VALUES, retryOnceOnDuplicate, streakFromDates, dedupeKeys, effectiveStreak, evaluateAchievements, isRewardableDate,
  levelForXp, levelProgress, newlyUnlocked, ProgressStats,
} from './gamification.logic';

const isDuplicateKey = (err: any) => err?.code === 11000;

interface Ledger {
  xp: number;
  counts: Record<string, number>;
  dates: string[];
}

/** Everything progress is derived from: one pass over the user's XP ledger. */
const readLedger = async (userId: any): Promise<Ledger> => {
  const uid = new mongoose.Types.ObjectId(String(userId));
  const [rows, dates]: [Array<{ _id: string; n: number; xp: number }>, string[]] = await Promise.all([
    XpEvent.aggregate([{ $match: { userId: uid } }, { $group: { _id: '$type', n: { $sum: 1 }, xp: { $sum: '$xp' } } }]),
    XpEvent.distinct('date', { userId: uid }),
  ]);
  return {
    xp: rows.reduce((s, r) => s + r.xp, 0),
    counts: Object.fromEntries(rows.map((r) => [r._id, r.n])),
    dates,
  };
};

const statsFrom = (ledger: Ledger, longestStreak: number, level: number): ProgressStats => ({
  mealDays: ledger.counts.meal ?? 0,
  workoutDays: ledger.counts.workout ?? 0,
  weightDays: ledger.counts.weight ?? 0,
  sleepDays: ledger.counts.sleep ?? 0,
  waterGoalDays: ledger.counts.water_goal ?? 0,
  longestStreak,
  level,
});

/**
 * Rebuild UserProgress from the XpEvent ledger (xp, level, streak, achievements). It is idempotent and order
 * independent, so it can run after every award and again whenever a read finds the two out of sync: if a progress
 * write ever fails after its event was inserted, the next recompute repairs it instead of losing the award.
 */
export const recomputeProgress = async (userId: string) => {
  const ledger = await readLedger(userId);
  const streak = streakFromDates(ledger.dates);
  const level = levelForXp(ledger.xp);

  // No $setOnInsert on the unique key: with an equality filter on it the server can retry a racing upsert itself;
  // we also retry once on E11000 for drivers/servers that do not.
  const progress = await retryOnceOnDuplicate(
    () => UserProgress.findOneAndUpdate({ userId }, { $set: { xp: ledger.xp, level, ...streak } }, { upsert: true, new: true }),
    isDuplicateKey
  );

  const fresh = newlyUnlocked(statsFrom(ledger, streak.longestStreak, level), progress.achievements.map((a) => a.key));
  if (fresh.length) {
    await UserProgress.updateOne(
      { userId, 'achievements.key': { $nin: fresh } },
      { $push: { achievements: { $each: fresh.map((key) => ({ key, unlockedAt: new Date() })) } } }
    );
  }
  return { ledger, streak, level };
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

  // The ledger now holds the award; progress is derived from it (and self-heals on read if this write fails).
  await recomputeProgress(userId);
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

  const ledger = await readLedger(userId);
  let progress = await UserProgress.findOne({ userId }).lean();
  // Self-heal: if progress is missing or out of sync with the ledger (e.g. a failed write), rebuild it from the ledger
  if (ledger.xp > 0 && (!progress || progress.xp !== ledger.xp)) {
    await recomputeProgress(userId);
    progress = await UserProgress.findOne({ userId }).lean();
  }
  const base = progress ?? { xp: 0, level: 1, currentStreak: 0, longestStreak: 0, lastActiveDate: null, achievements: [] as any[] };

  const stats = statsFrom(ledger, base.longestStreak, levelForXp(base.xp));
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
