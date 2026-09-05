import { MealLog, ApiResponse } from '../types';

export interface DailyMealsData {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  meals: MealLog[];
}

export const mealService = {
  // Fetch all meals logged for a specific day
  async getMealLogs(date: string): Promise<DailyMealsData> {
    const response = await fetch(`/api/v1/meals?date=${date}`);
    const res: ApiResponse<DailyMealsData> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to fetch meal logs');
    }
    return res.data;
  },

  // Add a new meal record
  async addMealLog(mealData: {
    name: string;
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    time: string;
    date: string;
  }): Promise<MealLog> {
    const response = await fetch('/api/v1/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mealData)
    });
    const res: ApiResponse<MealLog> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to add meal log');
    }
    return res.data;
  },

  // Delete a specific meal record by ID
  async deleteMealLog(id: string): Promise<{ id: string }> {
    const response = await fetch(`/api/v1/meals/${id}`, {
      method: 'DELETE'
    });
    const res: ApiResponse<{ id: string }> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to delete meal log');
    }
    return res.data;
  }
};
