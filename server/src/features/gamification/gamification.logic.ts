// Pure gamification rules: XP table, level formula, streaks and achievements. No I/O. See docs/gamification.md.
import { addDaysTz } from '../../utils/dates';

// --- XP ---------------------------------------------------------------------------------------------------

export type ActivityType = 'meal' | 'water_goal' | 'weight' | 'sleep' | 'workout';

export const XP_VALUES: Record<ActivityType, number> = {
  meal: 10,
  water_goal: 15,
  weight: 10,
  sleep: 10,
  workout: 50,
};

/** Maximum awards per user per day for each type (the rest of the day's actions earn nothing). */
export const DAILY_CAPS: Record<ActivityType, number> = {
  meal: 4,
  water_goal: 1,
  weight: 1,
  sleep: 1,
  workout: 1,
};

/**
 * Dedupe keys an action may claim, in order. The first free key is taken (via a unique index), so awards are
 * idempotent and deleting then re-adding a log cannot earn more than the day's cap.
 */
export const dedupeKeys = (type: ActivityType, date: string): string[] =>
  Array.from({ length: DAILY_CAPS[type] }, (_, i) => `${type}:${date}:${i + 1}`);

/** XP is only given for today or yesterday in the user's timezone (late logging is fine; backfilling old days is not). */
export const isRewardableDate = (date: string, today: string): boolean => date === today || date === addDaysTz(today, -1);

// --- Levels -----------------------------------------------------------------------------------------------

/** level = floor(sqrt(xp / 100)) + 1  (level 2 at 100 xp, 3 at 400, 4 at 900, 5 at 1600, ...). */
export const levelForXp = (xp: number): number => Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;

/** XP needed to reach a level: 100 * (level - 1)^2. */
export const xpForLevel = (level: number): number => 100 * Math.pow(Math.max(1, level) - 1, 2);

export interface LevelProgress {
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number; // size of the current level band
  percentToNext: number; // 0..100
}

export const levelProgress = (xp: number): LevelProgress => {
  const safe = Math.max(0, Math.floor(xp));
  const level = levelForXp(safe);
  const floor = xpForLevel(level);
  const band = xpForLevel(level + 1) - floor;
  const into = safe - floor;
  return { level, xp: safe, xpIntoLevel: into, xpForNextLevel: band, percentToNext: Math.min(100, Math.round((into / band) * 100)) };
};

// --- Streaks ----------------------------------------------------------------------------------------------

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

/**
 * Apply a rewarded action on `date` (a calendar date in the user's timezone).
 *  - same day as last active: unchanged
 *  - the day after: streak + 1
 *  - a gap (or first ever): streak restarts at 1
 *  - an earlier date than last active (late back-fill): unchanged
 */
export const applyActivityToStreak = (state: StreakState, date: string): StreakState => {
  const last = state.lastActiveDate;
  if (last && date <= last) return state;
  const continues = last !== null && addDaysTz(last, 1) === date;
  const current = continues ? state.currentStreak + 1 : 1;
  return { currentStreak: current, longestStreak: Math.max(state.longestStreak, current), lastActiveDate: date };
};

/** The streak to show today: alive only if the last active day is today or yesterday (a missed day breaks it). */
export const effectiveStreak = (state: StreakState, today: string): number => {
  if (!state.lastActiveDate) return 0;
  return state.lastActiveDate === today || state.lastActiveDate === addDaysTz(today, -1) ? state.currentStreak : 0;
};

// --- Achievements -----------------------------------------------------------------------------------------

export interface ProgressStats {
  mealDays: number; // number of meal XP awards (<= 4/day)
  workoutDays: number;
  weightDays: number;
  sleepDays: number;
  waterGoalDays: number;
  longestStreak: number;
  level: number;
}

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  target: number;
  /** current progress toward `target`, taken from the stats */
  progress: (s: ProgressStats) => number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first_meal', title: 'First Bite', description: 'Log your first meal', target: 1, progress: (s) => s.mealDays },
  { key: 'first_workout', title: 'First Rep', description: 'Complete your first workout', target: 1, progress: (s) => s.workoutDays },
  { key: 'first_weigh_in', title: 'On the Scale', description: 'Log your first weigh-in', target: 1, progress: (s) => s.weightDays },
  { key: 'sleep_5', title: 'Rested', description: 'Log sleep on 5 days', target: 5, progress: (s) => s.sleepDays },
  { key: 'water_goal_7', title: 'Well Hydrated', description: 'Hit your water goal on 7 days', target: 7, progress: (s) => s.waterGoalDays },
  { key: 'streak_7', title: 'One Week Strong', description: 'Reach a 7-day streak', target: 7, progress: (s) => s.longestStreak },
  { key: 'streak_30', title: 'Thirty-Day Habit', description: 'Reach a 30-day streak', target: 30, progress: (s) => s.longestStreak },
  { key: 'workouts_10', title: 'Getting Stronger', description: 'Complete workouts on 10 days', target: 10, progress: (s) => s.workoutDays },
  { key: 'workouts_50', title: 'Iron Habit', description: 'Complete workouts on 50 days', target: 50, progress: (s) => s.workoutDays },
  { key: 'weigh_ins_10', title: 'Tracking Trends', description: 'Log your weight on 10 days', target: 10, progress: (s) => s.weightDays },
  { key: 'level_5', title: 'Level 5', description: 'Reach level 5', target: 5, progress: (s) => s.level },
  { key: 'level_10', title: 'Level 10', description: 'Reach level 10', target: 10, progress: (s) => s.level },
];

export interface AchievementStatus {
  key: string;
  title: string;
  description: string;
  target: number;
  progress: number; // capped at target
  unlocked: boolean;
  unlockedAt: string | null;
}

/** Evaluate every achievement against the stats; `unlockedAt` comes from what was persisted earlier. */
export const evaluateAchievements = (stats: ProgressStats, persisted: Array<{ key: string; unlockedAt: Date | string }> = []): AchievementStatus[] =>
  ACHIEVEMENTS.map((a) => {
    const raw = a.progress(stats);
    const earned = persisted.find((p) => p.key === a.key);
    const unlocked = !!earned || raw >= a.target;
    return {
      key: a.key,
      title: a.title,
      description: a.description,
      target: a.target,
      progress: Math.min(raw, a.target),
      unlocked,
      unlockedAt: earned ? new Date(earned.unlockedAt).toISOString() : null,
    };
  });

/** Keys that the stats now satisfy but that have not been persisted as unlocked yet. */
export const newlyUnlocked = (stats: ProgressStats, persistedKeys: string[]): string[] =>
  ACHIEVEMENTS.filter((a) => a.progress(stats) >= a.target && !persistedKeys.includes(a.key)).map((a) => a.key);
