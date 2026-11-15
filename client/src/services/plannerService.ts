import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { UserWorkoutPlan, PlannerPreferences, WorkoutLog, PlannedDay, PlannedExercise } from '../types';

export const useUserPlan = () => {
  return useQuery<UserWorkoutPlan>({
    queryKey: ['workoutPlan'],
    queryFn: () => api.get<UserWorkoutPlan>('/planner'),
  });
};

export const useConfigurePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preferences: PlannerPreferences) =>
      api.post<UserWorkoutPlan>('/planner/configure', preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
    },
  });
};

export const useSaveCustomPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      programName?: string;
      daysPerWeek?: number;
      schedule: PlannedDay[];
    }) => api.put<UserWorkoutPlan>('/planner/custom', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
    },
  });
};

export const useAddExerciseToPlanDay = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { dayNumber: number; exercise: PlannedExercise }) =>
      api.post<UserWorkoutPlan>('/planner/exercise', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
    },
  });
};

export const useRemoveExerciseFromPlanDay = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { dayNumber: number; exerciseIndex: number }) =>
      api.delete<UserWorkoutPlan>('/planner/exercise', { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
    },
  });
};

export const useDeletePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<UserWorkoutPlan>('/planner'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
      queryClient.invalidateQueries({ queryKey: ['splitSchedule'] });
      queryClient.invalidateQueries({ queryKey: ['workoutLogs'] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
};

export const useAdaptPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: { date?: string; force?: boolean }) =>
      api.post<UserWorkoutPlan>('/planner/adapt', data || {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

export const useActivatePlannedDay = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { dayNumber: number; date?: string; force?: boolean }) =>
      api.post<WorkoutLog>('/planner/activate', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutLogs'] });
      queryClient.invalidateQueries({ queryKey: ['splitSchedule'] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
  });
};

export const useSwapPlannedExercise = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { dayNumber: number; exerciseIndex: number; newExerciseId: string }) =>
      api.post<UserWorkoutPlan>('/planner/swap', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
    },
  });
};


