import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export const useAnalytics = (days: number = 30) => {
  return useQuery({
    queryKey: ['analytics', days],
    queryFn: async () => {
      const response = await apiClient.get(`/analytics?days=${days}`);
      return response as any;
    }
  });
};
