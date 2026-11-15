import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { MealLog, DailyMeals } from '../types';

export const useMealLogs = (date: string) => {
  return useQuery({
    queryKey: ['mealLogs', date],
    queryFn: () => api.get<DailyMeals>(`/meals?date=${date}`),
  });
};

export const useAddMealLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<MealLog, '_id' | 'createdAt' | 'updatedAt'>) => api.post<MealLog>('/meals', data),
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
