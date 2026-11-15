import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { DailySummary } from '../types';

export const useSummary = (date: string) => {
  return useQuery({
    queryKey: ['summary', date],
    queryFn: () => api.get<DailySummary>(`/summary?date=${date}`),
  });
};
