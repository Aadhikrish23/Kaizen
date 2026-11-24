// Pure weekly aggregation shared by reports and the reminders. No I/O, so it is unit-testable with fixed data.
// (The AI weekly insight text is built in the Python AI service from the report this produces.)
import { addDaysTz, dateRange } from '../../utils/dates';

export interface WorkoutLike {
  date: string;
  totalVolumeKg?: number;
  exercises?: Array<{ sets?: Array<{ completed?: boolean }> }>;
}

/** A workout counts only if at least one set was actually completed (planned-but-not-performed logs do not). */
export const isPerformedWorkout = (w: WorkoutLike): boolean =>
  Array.isArray(w.exercises) && w.exercises.some((ex) => Array.isArray(ex.sets) && ex.sets.some((s) => s.completed === true));

export interface WeeklyInputs {
  endDate: string; // YYYY-MM-DD, the user's "today"
  days?: number; // window length, default 7
  targets: { calories: number; protein: number; water: number };
  meals: Array<{ date: string; calories?: number; protein?: number }>;
  water: Array<{ date: string; amount?: number }>;
  workouts: WorkoutLike[];
  weights: Array<{ date: string; weight: number }>;
  sleep: Array<{ date: string; durationMinutes?: number }>;
}

export interface DayRow {
  date: string;
  calories: number | null;
  protein: number | null;
  waterMl: number | null;
  workouts: number;
  sleepMinutes: number | null;
  weightKg: number | null;
}

export interface WeeklyAggregate {
  startDate: string;
  endDate: string;
  days: DayRow[];
  /** Days with any log at all (a day with nothing logged is "no data", never zero). */
  daysWithData: number;
  loggedDays: { nutrition: number; water: number; sleep: number; weight: number; workouts: number };
  avgCalories: number | null;
  avgProteinG: number | null;
  avgWaterMl: number | null;
  avgSleepHours: number | null;
  workoutCount: number;
  workoutDays: number;
  totalVolumeKg: number;
  weightChangeKg: number | null;
  targets: WeeklyInputs['targets'];
  /** true when there is enough data to say something meaningful (see MIN_DAYS_WITH_DATA). */
  sufficient: boolean;
  missing: string[];
}

export const MIN_DAYS_WITH_DATA = 3;
const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (values: number[]): number | null => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

export const aggregateWeek = (input: WeeklyInputs): WeeklyAggregate => {
  const length = input.days ?? 7;
  const endDate = input.endDate;
  const startDate = addDaysTz(endDate, -(length - 1));
  const dates = dateRange(startDate, endDate);

  const sumBy = <T extends { date: string }>(rows: T[], date: string, pick: (r: T) => number) => {
    const found = rows.filter((r) => r.date === date);
    return found.length ? found.reduce((s, r) => s + pick(r), 0) : null;
  };

  const performed = input.workouts.filter(isPerformedWorkout);

  const days: DayRow[] = dates.map((date) => {
    const calories = sumBy(input.meals, date, (m) => m.calories || 0);
    const protein = sumBy(input.meals, date, (m) => m.protein || 0);
    const w = input.weights.filter((x) => x.date === date);
    return {
      date,
      calories,
      protein,
      waterMl: sumBy(input.water, date, (x) => x.amount || 0),
      workouts: performed.filter((x) => x.date === date).length,
      sleepMinutes: sumBy(input.sleep, date, (s) => s.durationMinutes || 0),
      weightKg: w.length ? w[w.length - 1].weight : null,
    };
  });

  const nutritionDays = days.filter((d) => d.calories !== null && d.calories > 0);
  const waterDays = days.filter((d) => d.waterMl !== null && d.waterMl > 0);
  const sleepDays = days.filter((d) => d.sleepMinutes !== null && d.sleepMinutes > 0);
  const weightDays = days.filter((d) => d.weightKg !== null);
  const workoutDayRows = days.filter((d) => d.workouts > 0);

  const daysWithData = days.filter(
    (d) => (d.calories ?? 0) > 0 || (d.waterMl ?? 0) > 0 || (d.sleepMinutes ?? 0) > 0 || d.weightKg !== null || d.workouts > 0
  ).length;

  const avgCal = avg(nutritionDays.map((d) => d.calories as number));
  const avgPro = avg(nutritionDays.filter((d) => d.protein !== null).map((d) => d.protein as number));
  const avgWater = avg(waterDays.map((d) => d.waterMl as number));
  const avgSleepMin = avg(sleepDays.map((d) => d.sleepMinutes as number));

  const volume = performed.filter((w) => dates.includes(w.date)).reduce((s, w) => s + (w.totalVolumeKg || 0), 0);

  // Weight change needs at least two weigh-ins on different days (first vs last in the window)
  const weightChange = weightDays.length >= 2 ? (weightDays[weightDays.length - 1].weightKg as number) - (weightDays[0].weightKg as number) : null;

  const missing: string[] = [];
  if (nutritionDays.length === 0) missing.push('meals');
  if (waterDays.length === 0) missing.push('water');
  if (sleepDays.length === 0) missing.push('sleep');
  if (workoutDayRows.length === 0) missing.push('workouts');
  if (weightDays.length < 2) missing.push('weight (needs two weigh-ins)');

  return {
    startDate,
    endDate,
    days,
    daysWithData,
    loggedDays: { nutrition: nutritionDays.length, water: waterDays.length, sleep: sleepDays.length, weight: weightDays.length, workouts: workoutDayRows.length },
    avgCalories: avgCal === null ? null : Math.round(avgCal),
    avgProteinG: avgPro === null ? null : Math.round(avgPro),
    avgWaterMl: avgWater === null ? null : Math.round(avgWater),
    avgSleepHours: avgSleepMin === null ? null : round1(avgSleepMin / 60),
    workoutCount: days.reduce((s, d) => s + d.workouts, 0),
    workoutDays: workoutDayRows.length,
    totalVolumeKg: Math.round(volume),
    weightChangeKg: weightChange === null ? null : round1(weightChange),
    targets: input.targets,
    sufficient: daysWithData >= MIN_DAYS_WITH_DATA,
    missing,
  };
};
