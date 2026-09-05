import { Exercise, ApiResponse } from '../types';

export const exerciseService = {
  // Get all exercises (optionally filtered by muscle)
  async getExercises(muscle?: string): Promise<Exercise[]> {
    const url = muscle ? `/api/v1/exercises?muscle=${muscle}` : '/api/v1/exercises';
    const response = await fetch(url);
    const res: ApiResponse<Exercise[]> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to fetch exercises');
    }
    return res.data;
  },

  // Create custom exercise
  async createExercise(data: {
    name: string;
    targetMuscle: 'chest' | 'back' | 'legs' | 'shoulders' | 'biceps' | 'triceps' | 'core';
    equipment?: 'dumbbell' | 'barbell' | 'bodyweight' | 'band' | 'cable' | 'machine' | 'other';
    secondaryMuscles?: string[];
    instructions?: string;
  }): Promise<Exercise> {
    const response = await fetch('/api/v1/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const res: ApiResponse<Exercise> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to create exercise');
    }
    return res.data;
  },

  // Delete exercise
  async deleteExercise(id: string): Promise<{ id: string }> {
    const response = await fetch(`/api/v1/exercises/${id}`, {
      method: 'DELETE'
    });
    const res: ApiResponse<{ id: string }> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to delete exercise');
    }
    return res.data;
  }
};
