import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

const getWaterLogs = async (date: string) => {
  return apiClient.get(`/water?date=${date}`);
};

const addWaterLog = async (data: { amount: number; time: string; date: string }) => {
  return apiClient.post('/water', data);
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
  return useMutation({
    mutationFn: addWaterLog,
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
