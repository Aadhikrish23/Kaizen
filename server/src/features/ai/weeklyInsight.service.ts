import axios from 'axios';
import MealLog from '../meals/MealLog';
import WaterLog from '../water/WaterLog';
import WorkoutLog from '../workouts/WorkoutLog';
import WeightLog from '../weight/WeightLog';
import SleepLog from '../sleep/SleepLog';
import { addDaysTz, todayInTz } from '../../utils/dates';
import { aggregateWeek, heuristicWeeklyInsight, WeeklyAggregate } from './weeklyInsight';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/** Load the user's logs for the `days` ending on `endDate` and aggregate them (shared by the weekly insight and reports). */
export const loadAggregate = async (user: any, endDate: string, days = 7): Promise<WeeklyAggregate> => {
  const userId = user._id || user.id;
  const startDate = addDaysTz(endDate, -(days - 1));
  const range = { $gte: startDate, $lte: endDate };

  const [meals, water, workouts, weights, sleep] = await Promise.all([
    MealLog.find({ userId, date: range }).lean(),
    WaterLog.find({ userId, date: range }).lean(),
    WorkoutLog.find({ userId, date: range }).lean(),
    WeightLog.find({ userId, date: range }).sort({ date: 1 }).lean(),
    SleepLog.find({ userId, date: range }).lean(),
  ]);

  return aggregateWeek({
    endDate,
    days,
    targets: {
      calories: user.calorieDailyTarget || 2000,
      protein: user.proteinDailyTargetG || 150,
      water: user.waterDailyTargetMl || 2500,
    },
    meals: meals as any,
    water: water as any,
    workouts: workouts as any,
    weights: weights as any,
    sleep: sleep as any,
  });
};

export const getWeeklyInsight = async (user: any) => {
  const aggregate: WeeklyAggregate = await loadAggregate(user, todayInTz(user.timezone), 7);

  const stats = {
    startDate: aggregate.startDate,
    endDate: aggregate.endDate,
    daysWithData: aggregate.daysWithData,
    avgCalories: aggregate.avgCalories,
    avgProteinG: aggregate.avgProteinG,
    avgWaterMl: aggregate.avgWaterMl,
    avgSleepHours: aggregate.avgSleepHours,
    workoutCount: aggregate.workoutCount,
    weightChangeKg: aggregate.weightChangeKg,
    missing: aggregate.missing,
  };

  const heuristic = heuristicWeeklyInsight(aggregate);

  // With too little data the answer is "not enough data": do not ask a model to say something anyway.
  if (aggregate.sufficient) {
    try {
      const res = await axios.post(
        `${AI_SERVICE_URL}/api/coach/weekly-insight`,
        {
          user_profile: { name: user.name, goal: user.goal, calorieDailyTarget: aggregate.targets.calories, proteinDailyTargetG: aggregate.targets.protein, waterDailyTargetMl: aggregate.targets.water },
          weekly_metrics: {
            start_date: aggregate.startDate,
            end_date: aggregate.endDate,
            days_with_data: aggregate.daysWithData,
            avg_calories: aggregate.avgCalories,
            avg_protein_g: aggregate.avgProteinG,
            avg_water_ml: aggregate.avgWaterMl,
            avg_sleep_hours: aggregate.avgSleepHours,
            workout_count: aggregate.workoutCount,
            total_volume_kg: aggregate.totalVolumeKg,
            weight_change_kg: aggregate.weightChangeKg,
            missing: aggregate.missing,
          },
        },
        { timeout: 20000 }
      );
      if (typeof res.data?.insight === 'string' && res.data.insight.trim()) {
        return { insight: res.data.insight, highlights: heuristic.highlights, category: 'weekly', modelUsed: res.data.model_used, sufficient: true, stats };
      }
    } catch (err: any) {
      console.warn(`[AI weekly insight] AI service unavailable (${err?.message || err}); using heuristic.`);
    }
  }

  return { insight: heuristic.insight, highlights: heuristic.highlights, category: 'weekly', modelUsed: 'heuristic-fallback', sufficient: aggregate.sufficient, stats };
};
