// Pure weekly aggregation + deterministic insight. No I/O, so it is unit-testable with fixed data.
import { addDaysTz, dateRange } from '../../utils/dates';

export interface WeeklyInputs {
  endDate: string; // YYYY-MM-DD, the user's "today"
  days?: number; // window length, default 7
  targets: { calories: number; protein: number; water: number };
  meals: Array<{ date: string; calories?: number; protein?: number }>;
  water: Array<{ date: string; amount?: number }>;
  workouts: Array<{ date: string; totalVolumeKg?: number }>;
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

  const days: DayRow[] = dates.map((date) => {
    const calories = sumBy(input.meals, date, (m) => m.calories || 0);
    const protein = sumBy(input.meals, date, (m) => m.protein || 0);
    const w = input.weights.filter((x) => x.date === date);
    return {
      date,
      calories,
      protein,
      waterMl: sumBy(input.water, date, (x) => x.amount || 0),
      workouts: input.workouts.filter((x) => x.date === date).length,
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

  const volume = input.workouts.filter((w) => dates.includes(w.date)).reduce((s, w) => s + (w.totalVolumeKg || 0), 0);

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

export interface WeeklyInsightText {
  insight: string;
  highlights: string[];
}

/** Deterministic weekly summary used when the AI service is down. States missing data instead of inventing it. */
export const heuristicWeeklyInsight = (a: WeeklyAggregate): WeeklyInsightText => {
  if (!a.sufficient) {
    return {
      insight: `Not enough data for a weekly insight yet: you logged on ${a.daysWithData} of ${a.days.length} days (at least ${MIN_DAYS_WITH_DATA} needed). Keep logging meals, water, sleep and workouts.`,
      highlights: a.missing.length ? [`Nothing logged for: ${a.missing.join(', ')}.`] : [],
    };
  }

  const highlights: string[] = [];
  let focus: string | null = null;

  if (a.avgCalories !== null) {
    const pct = Math.round((a.avgCalories / a.targets.calories) * 100);
    highlights.push(`Average intake ${a.avgCalories} kcal on ${a.loggedDays.nutrition} logged days (${pct}% of your ${a.targets.calories} kcal target).`);
    if (pct < 80 || pct > 115) focus = pct < 80 ? 'Your logged intake runs well under target: make sure you are logging every meal and eating enough.' : 'Your logged intake runs above target: review portions on your biggest meals.';
  }
  if (a.avgProteinG !== null) {
    const pct = Math.round((a.avgProteinG / a.targets.protein) * 100);
    highlights.push(`Average protein ${a.avgProteinG} g (${pct}% of your ${a.targets.protein} g target).`);
    if (!focus && pct < 85) focus = 'Protein is the gap this week: add a protein source to your lightest meal.';
  }
  if (a.avgWaterMl !== null) {
    const pct = Math.round((a.avgWaterMl / a.targets.water) * 100);
    highlights.push(`Average water ${a.avgWaterMl} ml on ${a.loggedDays.water} logged days (${pct}% of target).`);
    if (!focus && pct < 75) focus = 'Hydration is behind target: keep a bottle nearby.';
  }
  highlights.push(
    a.workoutCount > 0
      ? `${a.workoutCount} workout${a.workoutCount === 1 ? '' : 's'} on ${a.workoutDays} day${a.workoutDays === 1 ? '' : 's'}, ${a.totalVolumeKg} kg total volume.`
      : 'No workouts logged this week.'
  );
  if (a.avgSleepHours !== null) {
    highlights.push(`Average sleep ${a.avgSleepHours} h on ${a.loggedDays.sleep} logged nights.`);
    if (!focus && a.avgSleepHours < 7) focus = 'Sleep averaged under 7 hours: an earlier bedtime is the easiest win.';
  }
  if (a.weightChangeKg !== null) {
    highlights.push(`Weight ${a.weightChangeKg > 0 ? '+' : ''}${a.weightChangeKg} kg between your first and last weigh-in.`);
  }
  if (!focus && a.workoutCount === 0) focus = 'No workouts this week: schedule one short session to restart the habit.';

  const insight = `This week (${a.startDate} to ${a.endDate}), based on ${a.daysWithData} of ${a.days.length} days with logs. ${focus ?? 'You are broadly on track: keep the consistency going.'}${a.missing.length ? ` Not logged: ${a.missing.join(', ')}.` : ''}`;
  return { insight, highlights };
};
