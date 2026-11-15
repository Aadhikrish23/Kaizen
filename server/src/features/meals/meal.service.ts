import MealLog from './MealLog';
import { createIdempotent } from '../../utils/idempotency';
import { recordActivity } from '../gamification/gamification.service';

export const getLogsByDate = async (date: string, userId: string) => {
  const meals = await MealLog.find({ date, userId }).sort({ createdAt: 1 });
  const totalCalories = meals.reduce((sum, item) => sum + item.calories, 0);
  const totalProtein = meals.reduce((sum, item) => sum + (item.protein || 0), 0);
  const totalCarbs = meals.reduce((sum, item) => sum + (item.carbs || 0), 0);
  const totalFat = meals.reduce((sum, item) => sum + (item.fat || 0), 0);
  
  return { date, totalCalories, totalProtein, totalCarbs, totalFat, meals };
};

export const createLog = async (data: { 
  name: string; 
  calories: number; 
  protein?: number; 
  carbs?: number; 
  fat?: number; 
  mealType: string; 
  time: string; 
  date: string; 
  userId: string; 
  clientRequestId?: string;
}) => {
  // A replayed request (same clientRequestId) returns the original document: no duplicate meal, no second XP award
  const { doc, replayed } = await createIdempotent(
    data.clientRequestId,
    () => MealLog.findOne({ userId: data.userId, clientRequestId: data.clientRequestId }),
    () => new MealLog(data).save()
  );
  if (!replayed) recordActivity(data.userId, 'meal', data.date, doc._id);
  return doc;
};

export const deleteLog = async (id: string, userId: string) => {
  return await MealLog.findOneAndDelete({ _id: id, userId });
};
