import { DailySummary } from '../types';

export const summaryService = {
    // Fetch consolidated dashboard daily health stats for a given day
    async getDailySummary(date: string): Promise<DailySummary> {
        const response = await fetch(`/api/summary?date=${date}`);
        if (!response.ok) {
            throw new Error('Failed to fetch daily summary');
        }
        return response.json();
    }
};
