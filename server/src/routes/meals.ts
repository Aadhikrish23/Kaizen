import { Router, Request, Response } from 'express';
import MealLog from '../models/MealLog';

const router = Router();

// GET: /api/v1/meals?date=YYYY-MM-DD
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Query parameter date (YYYY-MM-DD) is required' }
      });
    }

    const meals = await MealLog.find({ date: String(date) }).sort({ createdAt: 1 });
    const totalCalories = meals.reduce((sum, item) => sum + item.calories, 0);
    const totalProtein = meals.reduce((sum, item) => sum + (item.protein || 0), 0);
    const totalCarbs = meals.reduce((sum, item) => sum + (item.carbs || 0), 0);
    const totalFat = meals.reduce((sum, item) => sum + (item.fat || 0), 0);

    return res.json({
      success: true,
      data: {
        date: String(date),
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        meals
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (err as Error).message }
    });
  }
});

// POST: /api/v1/meals
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, calories, protein, carbs, fat, mealType, time, date } = req.body;
    if (!name || calories === undefined || !mealType || !time || !date) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Fields name, calories, mealType, time, and date are required' }
      });
    }

    const meal = new MealLog({
      name,
      calories: Number(calories),
      protein: Number(protein || 0),
      carbs: Number(carbs || 0),
      fat: Number(fat || 0),
      mealType,
      time,
      date
    });
    await meal.save();

    return res.status(201).json({
      success: true,
      data: meal
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (err as Error).message }
    });
  }
});

// DELETE: /api/v1/meals/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await MealLog.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Meal log not found' }
      });
    }

    return res.json({
      success: true,
      data: { id, deleted }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (err as Error).message }
    });
  }
});

export default router;
