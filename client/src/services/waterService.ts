import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { DailyWater, WaterLog } from '../types';

const getWaterLogs = async (date: string) => {
  return api.get<DailyWater>(`/water?date=${date}`);
};

const addWaterLog = async (data: { amount: number; time: string; date: string }) => {
  return api.post<WaterLog>('/water', data);
};

const deleteWaterLog = async (id: string) => {
  return api.delete(`/water/${id}`);
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
