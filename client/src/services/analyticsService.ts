import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { AnalyticsData } from '../types';

export const useAnalytics = (days: number = 30) => {
  return useQuery({
    queryKey: ['analytics', days],
    queryFn: async () => {
      return api.get<AnalyticsData>(`/analytics?days=${days}`);
    }
  });
};
