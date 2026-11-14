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

export interface CoachMessagePayload {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  date?: string;
}

export const useChatCoach = () => {
  return useMutation({
    mutationFn: async (payload: string | CoachMessagePayload) => {
      const data = typeof payload === 'string' ? { message: payload } : payload;
      const response = await apiClient.post('/ai/chat', data);
      return response as any;
    }
  });
};

export interface SearchResults {
  foods: Array<{ id: string; name: string; brand?: string; servingSize?: string; calories?: number }>;
  recipes: Array<{ id: string; name: string; totalCalories?: number; servings?: number }>;
  exercises: Array<{ id: string; name: string; targetMuscle?: string; equipment?: string }>;
  routines: Array<{ id: string; name: string; exercisesCount: number }>;
}

export const useSearch = (query: string) => {
  const q = query.trim();
  return useQuery<SearchResults>({
    queryKey: ['search', q],
    queryFn: async () => {
      const response = await apiClient.get(`/ai/search?q=${encodeURIComponent(q)}`);
      return response as unknown as SearchResults;
    },
    enabled: q.length >= 2,
    staleTime: 30 * 1000,
  });
};

export interface WeeklyInsight {
  insight: string;
  highlights: string[];
  sufficient: boolean;
  modelUsed?: string;
}

export const useWeeklyInsight = () => {
  return useQuery<WeeklyInsight>({
    queryKey: ['ai', 'weeklyInsight'],
    queryFn: async () => (await apiClient.get('/ai/insight/weekly')) as unknown as WeeklyInsight,
    staleTime: 10 * 60 * 1000,
  });
};
