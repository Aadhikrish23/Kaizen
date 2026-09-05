import WaterLog from '../models/WaterLog';
import MealLog from '../models/MealLog';
import WeightLog from '../models/WeightLog';
import WorkoutLog from '../models/WorkoutLog';
import User from '../models/User';

export const getSummaryByDate = async (dateStr: string, userId: string) => {
  const [waterLogs, meals, weightLog, workoutLog, user] = await Promise.all([
    WaterLog.find({ date: dateStr, userId }).sort({ createdAt: 1 }),
    MealLog.find({ date: dateStr, userId }).sort({ createdAt: 1 }),
    WeightLog.findOne({ date: dateStr, userId }),
    WorkoutLog.findOne({ date: dateStr, userId }),
    User.findById(userId).select('calorieDailyTarget proteinDailyTargetG waterDailyTargetMl targetWeightKg currentWeightKg')
  ]);

  const totalWater = waterLogs.reduce((sum, item) => sum + item.amount, 0);
  const totalCalories = meals.reduce((sum, item) => sum + item.calories, 0);
  const totalProtein = meals.reduce((sum, item) => sum + (item.protein || 0), 0);
  const totalCarbs = meals.reduce((sum, item) => sum + (item.carbs || 0), 0);
  const totalFat = meals.reduce((sum, item) => sum + (item.fat || 0), 0);

  // Pull targets from user profile, with sensible defaults
  const calorieGoal = user?.calorieDailyTarget ?? 2000;
  const proteinGoal = user?.proteinDailyTargetG ?? 150;
  const waterGoal = user?.waterDailyTargetMl ?? 2500;
  const targetWeight = user?.targetWeightKg ?? user?.currentWeightKg ?? 70;

  return {
    date: dateStr,
    nutrition: {
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      calorieGoal,
      proteinGoal,
      meals
    },
    hydration: {
      totalWater,
      waterGoal,
      logs: waterLogs
    },
    bodyMetrics: {
      weight: weightLog ? weightLog.weight : null,
      targetWeight
    },
    strength: {
      workoutCompleted: !!workoutLog,
      splitName: workoutLog?.splitName || null,
      totalVolumeKg: workoutLog?.totalVolumeKg || 0,
      exercisesCount: workoutLog?.exercises.length || 0,
      workout: workoutLog || null
    }
  };
};
