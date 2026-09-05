import { Router, Request, Response } from 'express';
import WaterLog from '../models/WaterLog';
import MealLog from '../models/MealLog';
import WeightLog from '../models/WeightLog';
import WorkoutLog from '../models/WorkoutLog';

const router = Router();

// GET: /api/v1/summary?date=YYYY-MM-DD
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Date parameter (YYYY-MM-DD) is required' }
      });
    }

    const dateStr = String(date);

    // Concurrent DB fetch across all domains
    const [waterLogs, meals, weightLog, workoutLog] = await Promise.all([
      WaterLog.find({ date: dateStr }).sort({ createdAt: 1 }),
      MealLog.find({ date: dateStr }).sort({ createdAt: 1 }),
      WeightLog.findOne({ date: dateStr }),
      WorkoutLog.findOne({ date: dateStr })
    ]);

    const totalWater = waterLogs.reduce((sum, item) => sum + item.amount, 0);
    const totalCalories = meals.reduce((sum, item) => sum + item.calories, 0);
    const totalProtein = meals.reduce((sum, item) => sum + (item.protein || 0), 0);
    const totalCarbs = meals.reduce((sum, item) => sum + (item.carbs || 0), 0);
    const totalFat = meals.reduce((sum, item) => sum + (item.fat || 0), 0);

    return res.json({
      success: true,
      data: {
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
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (err as Error).message }
    });
  }
});

export default router;
