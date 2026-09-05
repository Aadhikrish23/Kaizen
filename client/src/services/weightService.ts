import { WeightLog } from '../types';

export const weightService = {
    // Fetch full weight timeline history
    async getWeightHistory(): Promise<WeightLog[]> {
        const response = await fetch('/api/weight');
        if (!response.ok) {
            throw new Error('Failed to fetch weight history');
        }
        return response.json();
    },

    // Fetch weight logged on a specific day
    async getTodayWeight(date: string): Promise<WeightLog | null> {
        const response = await fetch(`/api/weight/today?date=${date}`);
        if (!response.ok) {
            throw new Error('Failed to fetch daily weight log');
        }
        return response.json();
    },

    // Save or update weight for a specific day
    async saveWeight(weight: number, date: string): Promise<WeightLog> {
        const response = await fetch('/api/weight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weight, date })
        });
        if (!response.ok) {
            throw new Error('Failed to save weight record');
        }
        return response.json();
    },

    // Delete a specific weight record by ID
    async deleteWeight(id: string): Promise<{ message: string; deleted: WeightLog }> {
        const response = await fetch(`/api/weight/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error('Failed to delete weight record');
        }
        return response.json();
    }
};
