import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { submitOrQueue } from '../offline/offlineQueue';

export const useWeightLogs = (date: string) => {
  return useQuery({
    queryKey: ['weightLogs', date],
    queryFn: () => apiClient.get(`/weight?date=${date}`),
  });
};

export const useWeightHistory = () => {
  return useQuery({
    queryKey: ['weightHistory'],
    queryFn: () => apiClient.get('/weight/history'),
  });
};

export const useAddWeightLog = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (data: { weight: number; date: string }) => submitOrQueue<unknown>(user?.id ?? '', 'weight', '/weight', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['weightLogs', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['weightHistory'] });
      queryClient.invalidateQueries({ queryKey: ['summary', variables.date] });
    },
  });
};
