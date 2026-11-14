import ReminderPrefs from './ReminderPrefs';
import WaterLog from '../water/WaterLog';
import MealLog from '../meals/MealLog';
import WeightLog from '../weight/WeightLog';
import SleepLog from '../sleep/SleepLog';
import WorkoutLog from '../workouts/WorkoutLog';
import { isPerformedWorkout } from '../ai/weeklyInsight';
import { isValidTimezone } from '../../utils/dates';
import {
  ReminderPrefs as Prefs, DEFAULT_PREFS, REMINDER_TYPES, computeDueReminders, localNow, parseClockToMinutes, TodayStatus,
} from './reminders.logic';

const clone = (p: Prefs): Prefs => JSON.parse(JSON.stringify(p));

export const getPrefs = async (userId: string): Promise<Prefs> => {
  const doc = await ReminderPrefs.findOne({ userId }).lean();
  if (!doc) return clone(DEFAULT_PREFS);
  // Fill in any type the user has not configured, so the client always sees all five
  const saved = doc.reminders as any[];
  const reminders = REMINDER_TYPES.map((type) => {
    const found = saved.find((r) => r.type === type);
    return found ? { type, enabled: found.enabled, times: [...found.times], days: [...(found.days || [])] } : clone(DEFAULT_PREFS).reminders.find((r) => r.type === type)!;
  });
  return { reminders, quietHours: { ...DEFAULT_PREFS.quietHours, ...(doc.quietHours as any) } };
};

export const savePrefs = async (userId: string, input: { reminders: any[]; quietHours?: any }): Promise<Prefs> => {
  const current = await getPrefs(userId);
  const reminders = REMINDER_TYPES.map((type) => {
    const given = input.reminders.find((r) => r.type === type);
    return given
      ? { type, enabled: given.enabled, times: [...given.times].sort(), days: [...new Set<number>(given.days || [])].sort() }
      : current.reminders.find((r) => r.type === type)!;
  });
  const quietHours = input.quietHours ?? current.quietHours;
  await ReminderPrefs.findOneAndUpdate({ userId }, { $set: { reminders, quietHours } }, { upsert: true, new: true, runValidators: true });
  return { reminders, quietHours };
};

export const getDue = async (user: any, instant: Date = new Date()) => {
  const userId = String(user._id || user.id);
  const tz = isValidTimezone(user.timezone) ? user.timezone : 'UTC';
  const now = localNow(instant, tz);
  const prefs = await getPrefs(userId);
  // Nothing enabled: skip the status queries entirely
  if (!prefs.reminders.some((r) => r.enabled && r.times.length > 0)) return [];

  const date = now.date;
  const [water, meals, weight, sleep, workouts] = await Promise.all([
    WaterLog.find({ userId, date }).lean(),
    MealLog.find({ userId, date }).lean(),
    WeightLog.findOne({ userId, date }).lean(),
    SleepLog.findOne({ userId, date }).lean(),
    WorkoutLog.find({ userId, date }).lean(),
  ]);
  const status: TodayStatus = {
    waterTotalMl: water.reduce((s: number, l: any) => s + (l.amount || 0), 0),
    waterGoalMl: user.waterDailyTargetMl || 2500,
    weightLoggedToday: !!weight,
    workoutPerformedToday: workouts.some((w: any) => isPerformedWorkout(w)),
    sleepLoggedToday: !!sleep,
    mealMinutesToday: meals.map((m: any) => parseClockToMinutes(m.time)).filter((m: number | null): m is number => m !== null),
  };
  return computeDueReminders(prefs, now, status);
};
