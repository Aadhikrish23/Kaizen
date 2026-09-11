import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { SleepLog, CircadianWindow } from '../types';

export const useSleepLog = (date: string) => {
  return useQuery<SleepLog | null>({
    queryKey: ['sleepLog', date],
    queryFn: () => apiClient.get(`/sleep?date=${date}`),
    enabled: !!date
  });
};

export const useSleepHistory = (startDate?: string, endDate?: string) => {
  return useQuery<SleepLog[]>({
    queryKey: ['sleepHistory', startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const query = params.toString();
      return apiClient.get(query ? `/sleep/history?${query}` : '/sleep/history');
    }
  });
};

export const useCircadianWindows = (wakeTime: string = '07:00') => {
  return useQuery<CircadianWindow[]>({
    queryKey: ['circadianWindows', wakeTime],
    queryFn: () => apiClient.get(`/sleep/circadian?wakeTime=${encodeURIComponent(wakeTime)}`),
    enabled: !!wakeTime
  });
};

export const useSaveSleepLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      date: string;
      bedtime: string;
      wakeTime: string;
      durationMinutes?: number;
      quality?: number;
      deepSleepMinutes?: number;
      remSleepMinutes?: number;
      lightSleepMinutes?: number;
      awakeMinutes?: number;
      notes?: string;
    }) => apiClient.post<any, SleepLog>('/sleep', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sleepLog', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['sleepHistory'] });
      queryClient.invalidateQueries({ queryKey: ['summary', variables.date] });
    }
  });
};

export const useDeleteSleepLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/sleep/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleepLog'] });
      queryClient.invalidateQueries({ queryKey: ['sleepHistory'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    }
  });
};
