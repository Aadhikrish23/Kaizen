import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { FoodItem } from '../types';

export const useSearchFoods = (query: string) => {
  return useQuery({
    queryKey: ['foods', 'search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      return api.get<FoodItem[]>(`/foods/search?q=${encodeURIComponent(query)}`);
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000 // 5 mins
  });
};

export const useCreateCustomFood = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (foodData: Partial<FoodItem>) => {
      return api.post<FoodItem, Partial<FoodItem>>('/foods', foodData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
    }
  });
};
