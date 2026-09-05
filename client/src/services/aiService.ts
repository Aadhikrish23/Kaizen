import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export const useParseFood = () => {
  return useMutation({
    mutationFn: async (text: string) => {
      const response = await apiClient.post('/ai/parse-food', { text });
      return response as any;
    }
  });
};

export const useInsights = () => {
  return useQuery({
    queryKey: ['ai', 'insights'],
    queryFn: async () => {
      const response = await apiClient.get('/ai/insights');
      return response as any;
    }
  });
};

export const useRecommendations = () => {
  return useQuery({
    queryKey: ['ai', 'recommendations'],
    queryFn: async () => {
      const response = await apiClient.get('/ai/recommendations');
      return response as any;
    }
  });
};

export const useChatCoach = () => {
  return useMutation({
    mutationFn: async (message: string) => {
      const response = await apiClient.post('/ai/chat', { message });
      return response as any;
    }
  });
};

export const useSearch = (query: string) => {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return { foods: [], recipes: [], workouts: [] };
      const response = await apiClient.get(`/ai/search?q=${encodeURIComponent(query)}`);
      return response as any;
    },
    enabled: query.length >= 2
  });
};
