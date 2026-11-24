import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  /** SUCCESS, PARTIAL, FAILED, CONFIRMATION_REQUIRED (answer "yes" or "no") or CANCELLED. */
  status?: string;
  /** Data areas the assistant changed, so the screens showing them can refresh. */
  changed?: string[];
  undoAvailable?: boolean;
  confirmationRequired?: boolean;
}

// Which cached queries show each data area the assistant can change.
const QUERIES_BY_AREA: Record<string, string[][]> = {
  meals: [['mealLogs'], ['ai', 'recommendations']],
  water: [['waterLogs']],
  weight: [['weightLogs'], ['weightHistory'], ['goalProgress'], ['goalHistory']],
  sleep: [['sleepLog'], ['sleepHistory'], ['circadianWindows']],
  workouts: [['workoutLogs'], ['workouts'], ['splitSchedule']],
  planner: [['workoutPlan'], ['splitSchedule']],
  profile: [['goalProgress'], ['goalHistory'], ['inventory']],
  summary: [['summary'], ['gamification'], ['report'], ['analytics'], ['ai', 'insights'], ['reminders']],
};

/** The queries to refresh after the assistant changed the given areas (nothing when it changed nothing). */
export const queriesToRefresh = (changed: string[] | undefined): string[][] =>
  changed && changed.length > 0 ? [...changed.flatMap((area) => QUERIES_BY_AREA[area] ?? []), ['gamification'], ['summary']] : [];

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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: string | CoachMessagePayload) => {
      const data = typeof payload === 'string' ? { message: payload } : payload;
      return api.post<CoachReply>('/ai/chat', data);
    },
    // The coach is also the action assistant: when it logs or changes something, the screens showing it must refresh.
    onSuccess: (reply) => {
      for (const queryKey of queriesToRefresh(reply.changed)) queryClient.invalidateQueries({ queryKey });
    },
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
