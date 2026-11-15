import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { MealLog, DailyMeals } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { submitOrQueue } from '../offline/offlineQueue';

export const useMealLogs = (date: string) => {
  return useQuery({
    queryKey: ['mealLogs', date],
    queryFn: () => api.get<DailyMeals>(`/meals?date=${date}`),
  });
};

export const useAddMealLog = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    // Queued with a clientRequestId when offline; replays are idempotent on the server
    mutationFn: (data: Omit<MealLog, '_id' | 'createdAt' | 'updatedAt'>) =>
      submitOrQueue<MealLog>(user?.id ?? '', 'meal', '/meals', data as unknown as Record<string, unknown>),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mealLogs', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['summary', variables.date] });
    },
  });
};

export const useDeleteMealLog = (date: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/meals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealLogs', date] });
      queryClient.invalidateQueries({ queryKey: ['summary', date] });
    },
  });
};
