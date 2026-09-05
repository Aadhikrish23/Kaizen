import { WaterLog } from '../types';

export const waterService = {
    // Fetch all water logs for a specific day
    async getWaterLogs(date: string): Promise<WaterLog[]> {
        const response = await fetch(`/api/water?date=${date}`);
        if (!response.ok) {
            throw new Error('Failed to fetch water logs');
        }
        return response.json();
    },

    // Add a new water intake record
    async addWaterLog(amount: number, time: string, date: string): Promise<WaterLog> {
        const response = await fetch('/api/water', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, time, date })
        });
        if (!response.ok) {
            throw new Error('Failed to add water record');
        }
        return response.json();
    },

    // Delete a specific water log by its ID
    async deleteWaterLog(id: string): Promise<{ message: string; deleted: WaterLog }> {
        const response = await fetch(`/api/water/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error('Failed to delete water record');
        }
        return response.json();
    }
};
