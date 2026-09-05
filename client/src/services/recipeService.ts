import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Recipe } from '../types';

export const useRecipes = () => {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const response = await apiClient.get('/recipes');
      return response as unknown as Recipe[];
    }
  });
};

export const useCreateRecipe = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (recipeData: Partial<Recipe>) => {
      return apiClient.post('/recipes', recipeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    }
  });
};

export const useDeleteRecipe = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/recipes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    }
  });
};
