// Pure reminder rules: no I/O. `now` and the day's status are passed in so everything is testable.
import { weekdayOfDate } from '../../utils/dates';

export const REMINDER_TYPES = ['water', 'meal', 'weight', 'workout', 'sleep'] as const;
export type ReminderType = (typeof REMINDER_TYPES)[number];

export interface Reminder {
  type: ReminderType;
  enabled: boolean;
  times: string[]; // 'HH:MM' in the user's timezone
  days?: number[]; // weekdays 0 (Sun) .. 6 (Sat); empty/undefined = every day
}

export interface QuietHours {
  enabled: boolean;
  start: string; // 'HH:MM'
  end: string; // 'HH:MM'; may be earlier than start (wraps past midnight)
}

export interface ReminderPrefs {
  reminders: Reminder[];
  quietHours: QuietHours;
}

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const MAX_TIMES_PER_REMINDER = 8;
export const DEFAULT_WINDOW_MINUTES = 15; // a reminder stays due for this long after its time
const MEAL_LOOKBACK_MINUTES = 60; // a meal logged this long before the reminder time already covers it

export const DEFAULT_PREFS: ReminderPrefs = {
  reminders: [
    { type: 'water', enabled: false, times: ['10:00', '14:00', '18:00'], days: [] },
    { type: 'meal', enabled: false, times: ['08:00', '13:00', '19:00'], days: [] },
    { type: 'weight', enabled: false, times: ['07:30'], days: [] },
    { type: 'workout', enabled: false, times: ['18:00'], days: [] },
    { type: 'sleep', enabled: false, times: ['22:00'], days: [] },
  ],
  quietHours: { enabled: false, start: '22:30', end: '07:00' },
};

export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Parse a logged meal time ("12:45 PM", "08:05", "7:30 am") to minutes since midnight; null if unrecognised. */
export const parseClockToMinutes = (raw: string | undefined | null): number | null => {
  if (!raw) return null;
  const m = /^\s*(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?\s*$/i.exec(raw);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const mer = m[3]?.toLowerCase().replace(/\./g, '');
  if (min > 59) return null;
  if (mer) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (mer === 'pm' ? 12 : 0);
  } else if (h > 23) return null;
  return h * 60 + min;
};

export interface LocalNow {
  date: string; // YYYY-MM-DD in the user's timezone
  minutes: number; // minutes since local midnight
  weekday: number; // 0 (Sun) .. 6 (Sat)
}

/** The wall-clock date/time of an instant in an IANA timezone (DST-aware via Intl). */
export const localNow = (instant: Date, tz: string): LocalNow => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  return { date, minutes: Number(get('hour')) * 60 + Number(get('minute')), weekday: weekdayOfDate(date) };
};

/** True when `minutes` falls inside quiet hours; handles ranges that wrap midnight (22:30-07:00). */
export const inQuietHours = (q: QuietHours, minutes: number): boolean => {
  if (!q.enabled) return false;
  const start = toMinutes(q.start);
  const end = toMinutes(q.end);
  if (start === end) return false;
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
};

export interface TodayStatus {
  waterTotalMl: number;
  waterGoalMl: number;
  weightLoggedToday: boolean;
  workoutPerformedToday: boolean; // at least one completed set
  sleepLoggedToday: boolean;
  mealMinutesToday: number[]; // local minutes-since-midnight of meals logged today
}

export interface DueReminder {
  id: string; // `${type}:${time}`, stable for the day: clients dedupe dismissals on `${date}:${id}`
  type: ReminderType;
  time: string;
  date: string;
  message: string;
}

const MESSAGES: Record<ReminderType, string> = {
  water: 'Time for a glass of water.',
  meal: 'Time to log your meal.',
  weight: 'Time for your weigh-in.',
  workout: 'Time for your workout.',
  sleep: 'Time to wind down and log your sleep.',
};

/** Already done for today (or for this slot): the reminder is not shown. */
export const isSatisfied = (type: ReminderType, time: string, now: LocalNow, s: TodayStatus): boolean => {
  switch (type) {
    case 'water': return s.waterGoalMl > 0 && s.waterTotalMl >= s.waterGoalMl;
    case 'weight': return s.weightLoggedToday;
    case 'workout': return s.workoutPerformedToday;
    case 'sleep': return s.sleepLoggedToday;
    case 'meal': {
      const t = toMinutes(time);
      return s.mealMinutesToday.some((m) => m >= t - MEAL_LOOKBACK_MINUTES && m <= now.minutes);
    }
  }
};

/**
 * Reminders due right now: scheduled time reached within the last `windowMinutes`, enabled, on an allowed weekday,
 * outside quiet hours, and not already satisfied. Times are wall-clock in the user's timezone, so on a DST
 * spring-forward day a time that does not exist (e.g. 02:30) is skipped, and on a fall-back day a repeated
 * hour can report the same reminder twice (clients dedupe by id per day).
 */
export const computeDueReminders = (
  prefs: ReminderPrefs,
  now: LocalNow,
  status: TodayStatus,
  windowMinutes: number = DEFAULT_WINDOW_MINUTES
): DueReminder[] => {
  if (inQuietHours(prefs.quietHours, now.minutes)) return [];
  const due: DueReminder[] = [];
  for (const r of prefs.reminders) {
    if (!r.enabled) continue;
    if (r.days && r.days.length > 0 && !r.days.includes(now.weekday)) continue;
    for (const time of r.times) {
      const t = toMinutes(time);
      const elapsed = now.minutes - t;
      if (elapsed < 0 || elapsed > windowMinutes) continue;
      if (inQuietHours(prefs.quietHours, t)) continue;
      if (isSatisfied(r.type, time, now, status)) continue;
      due.push({ id: `${r.type}:${time}`, type: r.type, time, date: now.date, message: MESSAGES[r.type] });
    }
  }
  return due.sort((a, b) => a.time.localeCompare(b.time) || a.type.localeCompare(b.type));
};
