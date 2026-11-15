// Pure report builder on top of the weekly aggregation helper (`aggregateWeek`). All averages cover logged days only.
import { addDaysTz } from '../../utils/dates';
import type { WeeklyAggregate } from '../ai/weeklyInsight';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

/** Window length ending on the requested date (monthly = the last 30 days, a rolling window). */
export const PERIOD_DAYS: Record<ReportPeriod, number> = { daily: 1, weekly: 7, monthly: 30 };
/** Minimum days with any log before the report makes statements about the period. */
export const MIN_DAYS_WITH_DATA: Record<ReportPeriod, number> = { daily: 1, weekly: 3, monthly: 7 };

export const isReportPeriod = (v: unknown): v is ReportPeriod => v === 'daily' || v === 'weekly' || v === 'monthly';

const pct = (value: number | null, target: number): number | null =>
  value === null || !(target > 0) ? null : Math.round((value / target) * 100);

export interface Adherence {
  average: number;
  target: number;
  adherencePct: number;
  loggedDays: number;
}

export interface Report {
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  daysInPeriod: number;
  daysWithData: number;
  minDaysWithData: number;
  sufficient: boolean;
  /** Plain-language statement when there is not enough data; null otherwise. */
  notEnoughData: string | null;
  missing: string[];
  calories: Adherence | null;
  protein: Adherence | null;
  water: Adherence | null;
  workouts: { count: number; daysWithWorkout: number; totalVolumeKg: number } | null;
  weight: { firstKg: number; lastKg: number; changeKg: number } | null;
  sleep: { averageHours: number; loggedNights: number } | null;
  /** Per-day rows for charts; days without a log have null values (never zero-filled). */
  days: WeeklyAggregate['days'];
}

export const buildReport = (period: ReportPeriod, a: WeeklyAggregate): Report => {
  const min = MIN_DAYS_WITH_DATA[period];
  const sufficient = a.daysWithData >= min;

  const adherence = (avg: number | null, target: number, loggedDays: number): Adherence | null =>
    avg === null ? null : { average: avg, target, adherencePct: pct(avg, target) as number, loggedDays };

  const weighIns = a.days.filter((d) => d.weightKg !== null);
  const weight =
    weighIns.length >= 2
      ? {
          firstKg: weighIns[0].weightKg as number,
          lastKg: weighIns[weighIns.length - 1].weightKg as number,
          changeKg: a.weightChangeKg as number,
        }
      : null;

  const base = {
    period,
    startDate: a.startDate,
    endDate: a.endDate,
    daysInPeriod: a.days.length,
    daysWithData: a.daysWithData,
    minDaysWithData: min,
    missing: a.missing,
    days: a.days,
  };

  if (!sufficient) {
    // State it plainly and return no aggregates: nothing is zero-filled or extrapolated from a thin sample.
    return {
      ...base,
      sufficient,
      notEnoughData: `Not enough data for a ${period} report: you logged on ${a.daysWithData} of ${a.days.length} day${a.days.length === 1 ? '' : 's'} (at least ${min} needed).`,
      calories: null,
      protein: null,
      water: null,
      workouts: null, // not computed: never zero-filled
      weight: null,
      sleep: null,
    };
  }

  return {
    ...base,
    sufficient,
    notEnoughData: null,
    calories: adherence(a.avgCalories, a.targets.calories, a.loggedDays.nutrition),
    protein: adherence(a.avgProteinG, a.targets.protein, a.loggedDays.nutrition),
    water: adherence(a.avgWaterMl, a.targets.water, a.loggedDays.water),
    workouts: { count: a.workoutCount, daysWithWorkout: a.workoutDays, totalVolumeKg: a.totalVolumeKg },
    weight,
    sleep: a.avgSleepHours === null ? null : { averageHours: a.avgSleepHours, loggedNights: a.loggedDays.sleep },
  };
};

export const periodStart = (period: ReportPeriod, endDate: string): string => addDaysTz(endDate, -(PERIOD_DAYS[period] - 1));
