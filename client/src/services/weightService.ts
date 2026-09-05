import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export const useWeightLogs = (date: string) => {
  return useQuery({
    queryKey: ['weightLogs', date],
    queryFn: () => apiClient.get(`/weight?date=${date}`),
  });
};

export const useAddWeightLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { weight: number; date: string }) => apiClient.post('/weight', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['weightLogs', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['summary', variables.date] });
    },
  });
};
