import { DailySummary, ApiResponse } from '../types';

export const summaryService = {
  // Fetch consolidated dashboard daily health stats for a given day
  async getDailySummary(date: string): Promise<DailySummary> {
    const response = await fetch(`/api/v1/summary?date=${date}`);
    const res: ApiResponse<DailySummary> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to fetch daily summary');
    }
    return res.data;
  }
};
