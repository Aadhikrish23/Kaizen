import { WeightLog, ApiResponse } from '../types';

export const weightService = {
  // Fetch full weight timeline history
  async getWeightHistory(): Promise<WeightLog[]> {
    const response = await fetch('/api/v1/weight');
    const res: ApiResponse<WeightLog[]> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to fetch weight history');
    }
    return res.data;
  },

  // Fetch weight logged on a specific day
  async getDailyWeight(date: string): Promise<WeightLog | null> {
    const response = await fetch(`/api/v1/weight/daily?date=${date}`);
    const res: ApiResponse<WeightLog | null> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to fetch daily weight log');
    }
    return res.data;
  },

  // Save or update weight for a specific day
  async saveWeight(weight: number, date: string, notes?: string): Promise<WeightLog> {
    const response = await fetch('/api/v1/weight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight, date, notes })
    });
    const res: ApiResponse<WeightLog> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to save weight record');
    }
    return res.data;
  },

  // Delete a specific weight record by ID
  async deleteWeight(id: string): Promise<{ id: string }> {
    const response = await fetch(`/api/v1/weight/${id}`, {
      method: 'DELETE'
    });
    const res: ApiResponse<{ id: string }> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to delete weight record');
    }
    return res.data;
  }
};
