import { WaterLog, ApiResponse } from '../types';

export const waterService = {
  // Fetch all water logs for a specific day
  async getWaterLogs(date: string): Promise<{ date: string; totalAmount: number; logs: WaterLog[] }> {
    const response = await fetch(`/api/v1/water?date=${date}`);
    const res: ApiResponse<{ date: string; totalAmount: number; logs: WaterLog[] }> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to fetch water logs');
    }
    return res.data;
  },

  // Add a new water intake record
  async addWaterLog(amount: number, time: string, date: string): Promise<WaterLog> {
    const response = await fetch('/api/v1/water', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, time, date })
    });
    const res: ApiResponse<WaterLog> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to add water record');
    }
    return res.data;
  },

  // Delete a specific water log by its ID
  async deleteWaterLog(id: string): Promise<{ id: string }> {
    const response = await fetch(`/api/v1/water/${id}`, {
      method: 'DELETE'
    });
    const res: ApiResponse<{ id: string }> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to delete water record');
    }
    return res.data;
  }
};
