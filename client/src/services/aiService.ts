import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api/client';

export interface ParsedFoodItem {
  name: string;
  quantity: number;
  unit: string;
  grams: number | null;
  confidence: number;
  source: 'database' | 'estimate';
  needsConfirmation: boolean;
  amount: number | null;
  amountUnit: 'g' | 'ml' | 'serving' | null;
  nutrition: { calories: number; protein: number; carbs: number; fat: number } | null;
  food: (Record<string, any> & { name: string; calories: number; protein: number; carbs: number; fat: number }) | null;
}

export interface ParseFoodResponse {
  items: ParsedFoodItem[];
  source: 'ai' | 'fallback';
  model?: string;
}

export interface DailyInsight {
  insight: string;
  category?: string;
  modelUsed?: string;
}

export interface MealSuggestion {
  id: string;
  type: 'food' | 'recipe';
  name: string;
  servingLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  reason: string;
}

export interface CoachReply {
  reply: string;
  modelUsed?: string;
  contextApplied?: boolean;
  source?: string;
}

export const useParseFood = () => {
  return useMutation({
    mutationFn: async (text: string) => {
      return api.post<ParseFoodResponse>('/ai/parse-food', { text });
    }
  });
};

export const useInsights = () => {
  return useQuery({
    queryKey: ['ai', 'insights'],
    queryFn: async () => {
      return api.get<DailyInsight>('/ai/insights');
    }
  });
};

export const useRecommendations = (date?: string, refreshKey?: number) => {
  return useQuery({
    queryKey: ['ai', 'recommendations', date, refreshKey],
    queryFn: async () => {
      return api.get<MealSuggestion[]>(`/ai/recommendations${date ? `?date=${encodeURIComponent(date)}` : ''}`);
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
      return api.post<CoachReply>('/ai/chat', data);
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
      return api.get<SearchResults>(`/ai/search?q=${encodeURIComponent(q)}`);
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
    queryFn: async () => api.get<WeeklyInsight>('/ai/insight/weekly'),
    staleTime: 10 * 60 * 1000,
  });
};
