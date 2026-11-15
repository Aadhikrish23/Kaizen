import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { WorkoutLog, WorkoutSplitSchedule } from '../types';

export const useWorkoutLogs = (date: string) => {
  return useQuery({
    queryKey: ['workoutLogs', date],
    queryFn: () => api.get<WorkoutLog | WorkoutLog[] | null>(`/workouts?date=${date}`),
  });
};

export const useSplitSchedule = () => {
  return useQuery({
    queryKey: ['splitSchedule'],
    queryFn: () => api.get<WorkoutSplitSchedule>('/workouts/split/schedule'),
  });
};

export const useAddWorkoutLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<WorkoutLog>) => api.post<WorkoutLog>('/workouts', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workoutLogs', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['summary', variables.date] });
    },
  });
};

export const useDeleteWorkoutLog = (date: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workouts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutLogs', date] });
      queryClient.invalidateQueries({ queryKey: ['summary', date] });
    },
  });
};
