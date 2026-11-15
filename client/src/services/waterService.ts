import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { submitOrQueue } from '../offline/offlineQueue';

const getWaterLogs = async (date: string) => {
  return apiClient.get(`/water?date=${date}`);
};

const deleteWaterLog = async (id: string) => {
  return apiClient.delete(`/water/${id}`);
};

export const useWaterLogs = (date: string) => {
  return useQuery({
    queryKey: ['waterLogs', date],
    queryFn: () => getWaterLogs(date),
  });
};

export const useAddWaterLog = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (data: { amount: number; time: string; date: string }) => submitOrQueue<unknown>(user?.id ?? '', 'water', '/water', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['waterLogs', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['summary', variables.date] });
    },
  });
};

export const useDeleteWaterLog = (date: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWaterLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waterLogs', date] });
      queryClient.invalidateQueries({ queryKey: ['summary', date] });
    },
  });
};
