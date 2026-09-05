import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export const useSummary = (date: string) => {
  return useQuery({
    queryKey: ['summary', date],
    queryFn: () => apiClient.get(`/summary?date=${date}`),
  });
};
