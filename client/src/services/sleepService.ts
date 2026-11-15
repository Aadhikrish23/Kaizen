import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { submitOrQueue } from '../offline/offlineQueue';
import { api } from '../api/client';
import { SleepLog, CircadianWindow } from '../types';

export const useSleepLog = (date: string) => {
  return useQuery<SleepLog | null>({
    queryKey: ['sleepLog', date],
    queryFn: () => api.get<SleepLog | null>(`/sleep?date=${date}`),
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
      return api.get<SleepLog[]>(query ? `/sleep/history?${query}` : '/sleep/history');
    }
  });
};

export const useCircadianWindows = (wakeTime: string = '07:00') => {
  return useQuery<CircadianWindow[]>({
    queryKey: ['circadianWindows', wakeTime],
    queryFn: () => api.get<CircadianWindow[]>(`/sleep/circadian?wakeTime=${encodeURIComponent(wakeTime)}`),
    enabled: !!wakeTime
  });
};

export const useSaveSleepLog = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
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
    }) => submitOrQueue<SleepLog>(user?.id ?? '', 'sleep', '/sleep', data),
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
    mutationFn: (id: string) => api.delete(`/sleep/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleepLog'] });
      queryClient.invalidateQueries({ queryKey: ['sleepHistory'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    }
  });
};
