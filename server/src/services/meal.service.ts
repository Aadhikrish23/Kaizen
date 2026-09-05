import MealLog from '../models/MealLog';

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
}) => {
  const meal = new MealLog(data);
  return await meal.save();
};

export const deleteLog = async (id: string, userId: string) => {
  return await MealLog.findOneAndDelete({ _id: id, userId });
};
