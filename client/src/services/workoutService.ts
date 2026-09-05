import { WorkoutLog, WorkoutSplitSchedule, ApiResponse } from '../types';

export const workoutService = {
  // Get Today's focus and Tomorrow's preview
  async getSplitSchedule(): Promise<WorkoutSplitSchedule> {
    const response = await fetch('/api/v1/workouts/split/schedule');
    const res: ApiResponse<WorkoutSplitSchedule> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to fetch split schedule');
    }
    return res.data;
  },

  // Get workout for a specific date
  async getWorkoutForDate(date: string): Promise<WorkoutLog | null> {
    const response = await fetch(`/api/v1/workouts?date=${date}`);
    const res: ApiResponse<WorkoutLog | null> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to fetch workout');
    }
    return res.data;
  },

  // Get recent workouts
  async getRecentWorkouts(): Promise<WorkoutLog[]> {
    const response = await fetch('/api/v1/workouts');
    const res: ApiResponse<WorkoutLog[]> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to fetch recent workouts');
    }
    return res.data;
  },

  // Save/log workout session
  async saveWorkout(workoutData: {
    date: string;
    splitName: string;
    muscleGroups: string[];
    exercises: {
      exerciseId?: string;
      exerciseName: string;
      targetMuscle: string;
      sets: {
        setNumber: number;
        weightKg: number;
        reps: number;
        rpe?: number;
        completed: boolean;
      }[];
    }[];
    durationMinutes?: number;
    notes?: string;
  }): Promise<WorkoutLog> {
    const response = await fetch('/api/v1/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workoutData)
    });
    const res: ApiResponse<WorkoutLog> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to save workout session');
    }
    return res.data;
  },

  // Delete workout
  async deleteWorkout(id: string): Promise<{ id: string }> {
    const response = await fetch(`/api/v1/workouts/${id}`, {
      method: 'DELETE'
    });
    const res: ApiResponse<{ id: string }> = await response.json();
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to delete workout session');
    }
    return res.data;
  }
};
