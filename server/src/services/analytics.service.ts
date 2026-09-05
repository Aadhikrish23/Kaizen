import WaterLog from '../models/WaterLog';
import MealLog from '../models/MealLog';
import WeightLog from '../models/WeightLog';
import WorkoutLog from '../models/WorkoutLog';

export const getAnalyticsDashboard = async (userId: string, days: number = 30) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Fetch all logs in the date range
  const [waterLogs, meals, weightLogs, workoutLogs] = await Promise.all([
    WaterLog.find({ userId, date: { $gte: startDateStr, $lte: endDateStr } }),
    MealLog.find({ userId, date: { $gte: startDateStr, $lte: endDateStr } }),
    WeightLog.find({ userId, date: { $gte: startDateStr, $lte: endDateStr } }).sort({ date: 1 }),
    WorkoutLog.find({ userId, date: { $gte: startDateStr, $lte: endDateStr } }).sort({ date: 1 })
  ]);

  // Aggregate by Date
  const dateMap: Record<string, any> = {};
  
  // Initialize map with all dates in range
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dStr = d.toISOString().split('T')[0];
    dateMap[dStr] = {
      date: dStr,
      waterAmount: 0,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      weight: null,
      workoutVolume: 0
    };
  }

  // Populate Water
  waterLogs.forEach(log => {
    if (dateMap[log.date]) dateMap[log.date].waterAmount += log.amount;
  });

  // Populate Meals
  meals.forEach(meal => {
    if (dateMap[meal.date]) {
      dateMap[meal.date].calories += meal.calories;
      dateMap[meal.date].protein += meal.protein || 0;
      dateMap[meal.date].carbs += meal.carbs || 0;
      dateMap[meal.date].fat += meal.fat || 0;
    }
  });

  // Populate Weight
  weightLogs.forEach(log => {
    if (dateMap[log.date]) dateMap[log.date].weight = log.weight;
  });

  // Populate Workout Volume
  workoutLogs.forEach(log => {
    if (dateMap[log.date]) dateMap[log.date].workoutVolume = log.totalVolumeKg;
  });

  const dailyStats = Object.values(dateMap).sort((a: any, b: any) => a.date.localeCompare(b.date));

  // Averages
  const activeCalorieDays = dailyStats.filter(d => d.calories > 0);
  const avgCalories = activeCalorieDays.length > 0 
    ? Math.round(activeCalorieDays.reduce((sum, d) => sum + d.calories, 0) / activeCalorieDays.length) 
    : 0;
    
  const activeProteinDays = dailyStats.filter(d => d.protein > 0);
  const avgProtein = activeProteinDays.length > 0 
    ? Math.round(activeProteinDays.reduce((sum, d) => sum + d.protein, 0) / activeProteinDays.length) 
    : 0;

  return {
    timeRange: `${days} days`,
    avgCalories,
    avgProtein,
    totalWorkouts: workoutLogs.length,
    dailyStats
  };
};
