import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { MealLog } from '../types';

export const useMealLogs = (date: string) => {
  return useQuery({
    queryKey: ['mealLogs', date],
    queryFn: () => apiClient.get(`/meals?date=${date}`),
  });
};

export const useAddMealLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<MealLog, '_id' | 'createdAt' | 'updatedAt'>) => apiClient.post('/meals', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mealLogs', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['summary', variables.date] });
    },
  });
};

export const useDeleteMealLog = (date: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/meals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealLogs', date] });
      queryClient.invalidateQueries({ queryKey: ['summary', date] });
    },
  });
};
