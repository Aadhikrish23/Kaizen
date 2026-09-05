import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { FoodItem } from '../types';

export const useSearchFoods = (query: string) => {
  return useQuery({
    queryKey: ['foods', 'search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const response = await apiClient.get(`/foods/search?q=${encodeURIComponent(query)}`);
      return response as unknown as FoodItem[];
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000 // 5 mins
  });
};

export const useCreateCustomFood = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (foodData: Partial<FoodItem>) => {
      return apiClient.post('/foods', foodData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
    }
  });
};
