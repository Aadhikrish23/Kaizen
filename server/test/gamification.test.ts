import test from 'node:test';
import assert from 'node:assert/strict';
import {
  XP_VALUES, DAILY_CAPS, dedupeKeys, isRewardableDate, levelForXp, xpForLevel, levelProgress, applyActivityToStreak,
  effectiveStreak, evaluateAchievements, newlyUnlocked, ACHIEVEMENTS, ProgressStats, StreakState,
} from '../src/features/gamification/gamification.logic';
import { todayInTz, dateStringInTz } from '../src/utils/dates';

const zero: ProgressStats = { mealDays: 0, workoutDays: 0, weightDays: 0, sleepDays: 0, waterGoalDays: 0, longestStreak: 0, level: 1 };
const none: StreakState = { currentStreak: 0, longestStreak: 0, lastActiveDate: null };

test('level formula: floor(sqrt(xp/100)) + 1 with documented thresholds', () => {
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(99), 1);
  assert.equal(levelForXp(100), 2);
  assert.equal(levelForXp(399), 2);
  assert.equal(levelForXp(400), 3);
  assert.equal(levelForXp(1600), 5);
  assert.equal(levelForXp(-50), 1);
  assert.deepEqual([1, 2, 3, 5].map(xpForLevel), [0, 100, 400, 1600]);
  for (const xp of [0, 1, 99, 100, 250, 399, 400, 1599, 1600, 9999]) {
    const l = levelForXp(xp);
    assert.ok(xp >= xpForLevel(l) && xp < xpForLevel(l + 1), `xp ${xp}`);
  }
});

test('levelProgress reports position within the current level band', () => {
  assert.deepEqual(levelProgress(0), { level: 1, xp: 0, xpIntoLevel: 0, xpForNextLevel: 100, percentToNext: 0 });
  assert.deepEqual(levelProgress(250), { level: 2, xp: 250, xpIntoLevel: 150, xpForNextLevel: 300, percentToNext: 50 });
  assert.equal(levelProgress(399).percentToNext, 100);
});

test('XP table and daily caps', () => {
  assert.deepEqual(XP_VALUES, { meal: 10, water_goal: 15, weight: 10, sleep: 10, workout: 50 });
  assert.equal(DAILY_CAPS.meal, 4);
  for (const t of ['water_goal', 'weight', 'sleep', 'workout'] as const) assert.equal(DAILY_CAPS[t], 1);
});

test('dedupe keys bound awards per day and are stable (delete + re-add cannot farm)', () => {
  assert.deepEqual(dedupeKeys('meal', '2026-03-08'), ['meal:2026-03-08:1', 'meal:2026-03-08:2', 'meal:2026-03-08:3', 'meal:2026-03-08:4']);
  assert.deepEqual(dedupeKeys('workout', '2026-03-08'), ['workout:2026-03-08:1']);
  // a different day gets different keys; the same day always gets the same keys regardless of the log's id
  assert.notDeepEqual(dedupeKeys('weight', '2026-03-08'), dedupeKeys('weight', '2026-03-09'));
  assert.deepEqual(dedupeKeys('weight', '2026-03-08'), dedupeKeys('weight', '2026-03-08'));
  // simulate the unique index: 7 meal logs on one day (with deletions in between) award exactly 4 times
  const taken = new Set<string>();
  let awards = 0;
  for (let i = 0; i < 7; i++) {
    const free = dedupeKeys('meal', '2026-03-08').find((k) => !taken.has(k));
    if (free) { taken.add(free); awards++; }
  }
  assert.equal(awards, 4);
});

test('only today and yesterday (user timezone) are rewardable', () => {
  assert.equal(isRewardableDate('2026-03-08', '2026-03-08'), true);
  assert.equal(isRewardableDate('2026-03-07', '2026-03-08'), true);
  assert.equal(isRewardableDate('2026-03-06', '2026-03-08'), false);
  assert.equal(isRewardableDate('2026-03-09', '2026-03-08'), false); // future
  // month/year boundary and leap day
  assert.equal(isRewardableDate('2025-12-31', '2026-01-01'), true);
  assert.equal(isRewardableDate('2028-02-29', '2028-03-01'), true);
});

test('timezone midnight edge: the same instant is a different day per zone, so rewardability follows the user zone', () => {
  const instant = new Date('2026-03-08T23:30:00Z');
  const kolkata = todayInTz('Asia/Kolkata', instant); // 2026-03-09
  const la = todayInTz('America/Los_Angeles', instant); // 2026-03-08
  assert.equal(isRewardableDate('2026-03-09', kolkata), true);
  assert.equal(isRewardableDate('2026-03-09', la), false); // future for LA
  assert.equal(dateStringInTz(instant, 'UTC'), '2026-03-08');
});

test('streak: first action starts at 1; same day is idempotent; next day increments', () => {
  const s1 = applyActivityToStreak(none, '2026-03-05');
  assert.deepEqual(s1, { currentStreak: 1, longestStreak: 1, lastActiveDate: '2026-03-05' });
  assert.equal(applyActivityToStreak(s1, '2026-03-05'), s1);
  const s2 = applyActivityToStreak(s1, '2026-03-06');
  assert.deepEqual(s2, { currentStreak: 2, longestStreak: 2, lastActiveDate: '2026-03-06' });
});

test('streak continues across DST changes, month and year ends, and leap days', () => {
  let s = applyActivityToStreak(none, '2026-03-07');
  s = applyActivityToStreak(s, '2026-03-08'); // US spring forward (23-hour day)
  s = applyActivityToStreak(s, '2026-03-09');
  assert.equal(s.currentStreak, 3);
  let f = applyActivityToStreak(none, '2026-10-31');
  f = applyActivityToStreak(f, '2026-11-01'); // fall back (25-hour day)
  f = applyActivityToStreak(f, '2026-11-02');
  assert.equal(f.currentStreak, 3);
  let y = applyActivityToStreak(none, '2025-12-31');
  y = applyActivityToStreak(y, '2026-01-01');
  assert.equal(y.currentStreak, 2);
  let l = applyActivityToStreak(none, '2028-02-28');
  l = applyActivityToStreak(l, '2028-02-29');
  l = applyActivityToStreak(l, '2028-03-01');
  assert.equal(l.currentStreak, 3);
});

test('streak breaks after a missed day but the longest streak is kept; late back-fill changes nothing', () => {
  let s: StreakState = { currentStreak: 5, longestStreak: 5, lastActiveDate: '2026-03-05' };
  const gap = applyActivityToStreak(s, '2026-03-07'); // 03-06 missed
  assert.deepEqual(gap, { currentStreak: 1, longestStreak: 5, lastActiveDate: '2026-03-07' });
  assert.equal(applyActivityToStreak(s, '2026-03-04'), s);
  s = { currentStreak: 2, longestStreak: 9, lastActiveDate: '2026-03-05' };
  assert.equal(applyActivityToStreak(s, '2026-03-06').longestStreak, 9);
});

test('effectiveStreak: alive today or yesterday, otherwise broken (0)', () => {
  const s: StreakState = { currentStreak: 4, longestStreak: 6, lastActiveDate: '2026-03-07' };
  assert.equal(effectiveStreak(s, '2026-03-07'), 4);
  assert.equal(effectiveStreak(s, '2026-03-08'), 4); // still alive until the day ends
  assert.equal(effectiveStreak(s, '2026-03-09'), 0); // a full day was missed
  assert.equal(effectiveStreak(none, '2026-03-09'), 0);
  assert.equal(effectiveStreak({ ...s, lastActiveDate: '2025-12-31' }, '2026-01-01'), 4);
});

test('achievement catalog is well-formed', () => {
  const keys = ACHIEVEMENTS.map((a) => a.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(ACHIEVEMENTS.length >= 10 && ACHIEVEMENTS.length <= 14);
  for (const a of ACHIEVEMENTS) assert.ok(a.target > 0 && a.title && a.description);
});

test('nothing earned yet: all locked with zero progress', () => {
  const r = evaluateAchievements(zero);
  assert.ok(r.every((a) => !a.unlocked && a.unlockedAt === null));
  assert.ok(r.filter((a) => !a.key.startsWith('level_')).every((a) => a.progress === 0));
  assert.equal(r.find((a) => a.key === 'level_5')!.progress, 1); // everyone starts at level 1
  assert.deepEqual(newlyUnlocked(zero, []), []);
});

test('achievement checks and progress counters', () => {
  const stats: ProgressStats = { mealDays: 3, workoutDays: 10, weightDays: 1, sleepDays: 4, waterGoalDays: 7, longestStreak: 8, level: 5 };
  const by = (k: string) => evaluateAchievements(stats).find((a) => a.key === k)!;
  assert.equal(by('first_meal').unlocked, true);
  assert.equal(by('first_workout').unlocked, true);
  assert.equal(by('workouts_10').unlocked, true);
  assert.equal(by('workouts_50').unlocked, false);
  assert.equal(by('workouts_50').progress, 10);
  assert.equal(by('first_weigh_in').unlocked, true);
  assert.equal(by('weigh_ins_10').progress, 1);
  assert.equal(by('sleep_5').unlocked, false);
  assert.equal(by('sleep_5').progress, 4);
  assert.equal(by('water_goal_7').unlocked, true);
  assert.equal(by('streak_7').unlocked, true);
  assert.equal(by('streak_30').unlocked, false);
  assert.equal(by('streak_30').progress, 8);
  assert.equal(by('level_5').unlocked, true);
  assert.equal(by('level_10').unlocked, false);
});

test('progress is capped at the target and persisted unlocks stay unlocked with their date', () => {
  const stats: ProgressStats = { ...zero, mealDays: 99 };
  assert.equal(evaluateAchievements(stats).find((a) => a.key === 'first_meal')!.progress, 1);
  const persisted = [{ key: 'streak_7', unlockedAt: '2026-03-01T10:00:00.000Z' }];
  const s7 = evaluateAchievements(zero, persisted).find((a) => a.key === 'streak_7')!;
  assert.equal(s7.unlocked, true); // earned once, stays earned even if the longest streak counter were reset
  assert.equal(s7.unlockedAt, '2026-03-01T10:00:00.000Z');
});

test('newlyUnlocked returns only achievements satisfied and not yet persisted', () => {
  const stats: ProgressStats = { ...zero, mealDays: 1, workoutDays: 1 };
  assert.deepEqual(newlyUnlocked(stats, []).sort(), ['first_meal', 'first_workout']);
  assert.deepEqual(newlyUnlocked(stats, ['first_meal']), ['first_workout']);
  assert.deepEqual(newlyUnlocked(stats, ['first_meal', 'first_workout']), []);
});
