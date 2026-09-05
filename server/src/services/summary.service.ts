import WaterLog from '../models/WaterLog';
import MealLog from '../models/MealLog';
import WeightLog from '../models/WeightLog';
import WorkoutLog from '../models/WorkoutLog';

export const getSummaryByDate = async (dateStr: string, userId: string) => {
  const [waterLogs, meals, weightLog, workoutLog] = await Promise.all([
    WaterLog.find({ date: dateStr, userId }).sort({ createdAt: 1 }),
    MealLog.find({ date: dateStr, userId }).sort({ createdAt: 1 }),
    WeightLog.findOne({ date: dateStr, userId }),
    WorkoutLog.findOne({ date: dateStr, userId })
  ]);

  const totalWater = waterLogs.reduce((sum, item) => sum + item.amount, 0);
  const totalCalories = meals.reduce((sum, item) => sum + item.calories, 0);
  const totalProtein = meals.reduce((sum, item) => sum + (item.protein || 0), 0);
  const totalCarbs = meals.reduce((sum, item) => sum + (item.carbs || 0), 0);
  const totalFat = meals.reduce((sum, item) => sum + (item.fat || 0), 0);

  return {
    date: dateStr,
    nutrition: {
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      calorieGoal: 2200,
      meals
    },
    hydration: {
      totalWater,
      waterGoal: 2500,
      logs: waterLogs
    },
    bodyMetrics: {
      weight: weightLog ? weightLog.weight : null,
      targetWeight: 72.0
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
