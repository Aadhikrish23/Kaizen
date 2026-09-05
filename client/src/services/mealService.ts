import { MealLog } from '../types';

export const mealService = {
    // Fetch all meals logged for a specific day
    async getMealLogs(date: string): Promise<MealLog[]> {
        const response = await fetch(`/api/meals?date=${date}`);
        if (!response.ok) {
            throw new Error('Failed to fetch meal logs');
        }
        return response.json();
    },

    // Add a new meal record
    async addMealLog(
        name: string, 
        calories: number, 
        mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack', 
        time: string, 
        date: string
    ): Promise<MealLog> {
        const response = await fetch('/api/meals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, calories, mealType, time, date })
        });
        if (!response.ok) {
            throw new Error('Failed to add meal log');
        }
        return response.json();
    },

    // Delete a specific meal record by ID
    async deleteMealLog(id: string): Promise<{ message: string; deleted: MealLog }> {
        const response = await fetch(`/api/meals/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error('Failed to delete meal log');
        }
        return response.json();
    }
};
