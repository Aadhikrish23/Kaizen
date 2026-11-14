// Goal change detection and progress/pace maths. Pure: no I/O.
import { addDaysTz } from '../../utils/dates';

export interface GoalSnapshot {
  goal?: string | null;
  targetWeightKg?: number | null;
  targetDate?: string | null; // YYYY-MM-DD
}

export const GOAL_FIELDS = ['goal', 'targetWeightKg', 'targetDate'] as const;
export type GoalField = (typeof GOAL_FIELDS)[number];

/** Dates may arrive as Date (Mongoose) or string; normalise to YYYY-MM-DD (UTC calendar date) or null. */
export const normalizeDate = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
};

/**
 * Which goal fields change if `patch` is applied on top of `before`. Only fields present in the patch count, so an
 * update that does not mention the goal never creates a history entry.
 */
export const detectGoalChange = (before: GoalSnapshot, patch: Record<string, unknown>): GoalField[] => {
  const changed: GoalField[] = [];
  if ('goal' in patch && (patch.goal ?? null) !== (before.goal ?? null)) changed.push('goal');
  if ('targetWeightKg' in patch && (patch.targetWeightKg ?? null) !== (before.targetWeightKg ?? null)) changed.push('targetWeightKg');
  if ('targetDate' in patch && normalizeDate(patch.targetDate as any) !== normalizeDate(before.targetDate)) changed.push('targetDate');
  return changed;
};

export const isFutureDate = (date: string, today: string): boolean => date > today;

const daysBetween = (from: string, to: string): number => {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
};

export const MIN_PACE_SPAN_DAYS = 7; // pace needs weigh-ins at least a week apart

export interface WeighIn {
  date: string;
  weight: number;
}

export interface GoalProgressInput {
  startWeightKg?: number | null; // weight when the goal was set, if known
  goalSetDate?: string | null; // only weigh-ins on/after this date drive the pace
  targetWeightKg?: number | null;
  targetDate?: string | null;
  today: string;
  weighIns: WeighIn[]; // ascending by date
}

export type GoalProgressStatus = 'no_target' | 'not_enough_data' | 'reached' | 'moving_away' | 'flat' | 'ok';

export interface GoalProgress {
  status: GoalProgressStatus;
  message: string;
  startWeightKg: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  targetDate: string | null;
  remainingKg: number | null; // absolute distance to target
  percentComplete: number | null; // 0..100
  requiredWeeklyChangeKg: number | null; // signed kg/week needed to hit targetDate (negative = lose)
  actualWeeklyChangeKg: number | null; // signed kg/week from the weigh-ins
  estimatedDate: string | null; // at the current pace
  onTrack: boolean | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export const computeGoalProgress = (i: GoalProgressInput): GoalProgress => {
  const blank: GoalProgress = {
    status: 'no_target', message: '', startWeightKg: null, currentWeightKg: null, targetWeightKg: i.targetWeightKg ?? null,
    targetDate: i.targetDate ?? null, remainingKg: null, percentComplete: null, requiredWeeklyChangeKg: null,
    actualWeeklyChangeKg: null, estimatedDate: null, onTrack: null,
  };
  if (!i.targetWeightKg || !(i.targetWeightKg > 0)) return { ...blank, message: 'Set a target weight to track your progress.' };

  const all = [...i.weighIns].sort((a, b) => a.date.localeCompare(b.date));
  if (all.length === 0) return { ...blank, status: 'not_enough_data', message: 'Log a weigh-in to see progress toward your goal.' };

  const current = all[all.length - 1].weight;
  const considered = i.goalSetDate ? all.filter((w) => w.date >= (i.goalSetDate as string)) : all;
  const start = i.startWeightKg ?? (considered[0] ?? all[0]).weight;
  const target = i.targetWeightKg;
  const direction = Math.sign(target - start); // -1 lose, +1 gain, 0 already at target

  const remaining = Math.abs(target - current);
  const reached = direction === 0 ? current === target : direction < 0 ? current <= target : current >= target;
  const total = Math.abs(target - start);
  const percent = reached ? 100 : total > 0 ? Math.max(0, Math.min(100, Math.round(((total - remaining) / total) * 100))) : null;

  const base: GoalProgress = {
    ...blank, startWeightKg: round1(start), currentWeightKg: round1(current), remainingKg: round1(reached ? 0 : remaining), percentComplete: percent,
  };
  if (reached) return { ...base, status: 'reached', message: 'You have reached your target weight.', onTrack: true };

  // Required pace to hit the target date
  let required: number | null = null;
  let weeksLeft: number | null = null;
  if (i.targetDate && i.targetDate > i.today) {
    weeksLeft = daysBetween(i.today, i.targetDate) / 7;
    required = round2((target - current) / weeksLeft);
  }

  // Actual pace needs 2+ weigh-ins at least a week apart (since the goal was set)
  const first = considered[0];
  const last = considered[considered.length - 1];
  const span = first && last ? daysBetween(first.date, last.date) : 0;
  if (considered.length < 2 || span < MIN_PACE_SPAN_DAYS) {
    return {
      ...base, status: 'not_enough_data', requiredWeeklyChangeKg: required,
      message: 'Not enough data to estimate your pace: needs at least 2 weigh-ins at least 7 days apart.',
    };
  }

  const actual = round2(((last.weight - first.weight) / span) * 7);
  const toward = Math.sign(target - current);
  if (actual === 0) {
    return { ...base, status: 'flat', actualWeeklyChangeKg: actual, requiredWeeklyChangeKg: required, onTrack: false, message: 'Your weight has not changed over this period, so no finish date can be estimated.' };
  }
  if (Math.sign(actual) !== toward) {
    return { ...base, status: 'moving_away', actualWeeklyChangeKg: actual, requiredWeeklyChangeKg: required, onTrack: false, message: 'Your weight is moving away from the target at the current pace.' };
  }
  const weeksToGo = Math.abs(target - current) / Math.abs(actual);
  const estimatedDate = addDaysTz(i.today, Math.ceil(weeksToGo * 7));
  const onTrack = i.targetDate ? estimatedDate <= i.targetDate : null;
  return {
    ...base, status: 'ok', actualWeeklyChangeKg: actual, requiredWeeklyChangeKg: required, estimatedDate, onTrack,
    message: onTrack === null ? 'Estimated finish date at your current pace.' : onTrack ? 'On track to reach your target by your target date.' : 'At the current pace you will reach your target after your target date.',
  };
};
