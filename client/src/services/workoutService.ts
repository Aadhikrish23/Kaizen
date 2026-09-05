import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { WorkoutLog } from '../types';

export const useWorkoutLogs = (date: string) => {
  return useQuery({
    queryKey: ['workoutLogs', date],
    queryFn: () => apiClient.get(`/workouts?date=${date}`),
  });
};

export const useSplitSchedule = () => {
  return useQuery({
    queryKey: ['splitSchedule'],
    queryFn: () => apiClient.get('/workouts/split/schedule'),
  });
};

export const useAddWorkoutLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<WorkoutLog>) => apiClient.post('/workouts', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workoutLogs', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['summary', variables.date] });
    },
  });
};

export const useDeleteWorkoutLog = (date: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/workouts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutLogs', date] });
      queryClient.invalidateQueries({ queryKey: ['summary', date] });
    },
  });
};
