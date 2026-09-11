import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ExternalRecipe, FoodItem, Recipe } from '../types';

export const useExternalRecipes = (query: string, diet?: string, cuisine?: string) => {
  return useQuery({
    queryKey: ['externalRecipes', query, diet, cuisine],
    queryFn: async (): Promise<ExternalRecipe[]> => {
      if (!query.trim()) return [];
      let url = `/external/recipes?q=${encodeURIComponent(query)}`;
      if (diet) url += `&diet=${encodeURIComponent(diet)}`;
      if (cuisine) url += `&cuisine=${encodeURIComponent(cuisine)}`;
      const res = await apiClient.get(url);
      return (res as any) || [];
    },
    enabled: query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
  });
};

export const useExternalFoods = (query: string) => {
  return useQuery({
    queryKey: ['externalFoods', query],
    queryFn: async (): Promise<FoodItem[]> => {
      if (!query.trim()) return [];
      const res = await apiClient.get(`/external/foods?q=${encodeURIComponent(query)}`);
      return (res as any) || [];
    },
    enabled: query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
  });
};

export const useImportRecipe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recipe: ExternalRecipe): Promise<Recipe> => {
      const res = await apiClient.post('/external/recipes/import', recipe);
      return res as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
};
