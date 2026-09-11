import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { UserWorkoutPlan, PlannerPreferences, WorkoutLog } from '../types';

export const useUserPlan = () => {
  return useQuery<UserWorkoutPlan>({
    queryKey: ['workoutPlan'],
    queryFn: () => apiClient.get('/planner'),
  });
};

export const useConfigurePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preferences: PlannerPreferences) =>
      apiClient.post<UserWorkoutPlan>('/planner/configure', preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
    },
  });
};

export const useAdaptPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: { date?: string; force?: boolean }) =>
      apiClient.post<UserWorkoutPlan>('/planner/adapt', data || {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

export const useActivatePlannedDay = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { dayNumber: number; date?: string }) =>
      apiClient.post<WorkoutLog>('/planner/activate', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
  });
};

export const useSwapPlannedExercise = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { dayNumber: number; exerciseIndex: number; newExerciseId: string }) =>
      apiClient.post<UserWorkoutPlan>('/planner/swap', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
    },
  });
};

