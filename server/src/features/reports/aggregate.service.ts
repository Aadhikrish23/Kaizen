import MealLog from '../meals/MealLog';
import WaterLog from '../water/WaterLog';
import WorkoutLog from '../workouts/WorkoutLog';
import WeightLog from '../weight/WeightLog';
import SleepLog from '../sleep/SleepLog';
import { addDaysTz } from '../../utils/dates';
import { aggregateWeek, WeeklyAggregate } from './aggregate';

/** Load the user's logs for the `days` ending on `endDate` and aggregate them (the basis of every report). */
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
