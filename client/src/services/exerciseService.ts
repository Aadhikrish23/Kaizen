import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Exercise } from '../types';

export const useExercises = (muscle?: string) => {
  return useQuery({
    queryKey: ['exercises', muscle],
    queryFn: () => {
      const url = muscle ? `/exercises?muscle=${muscle}` : '/exercises';
      return apiClient.get(url);
    },
  });
};

export const useAddExercise = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Exercise>) => apiClient.post('/exercises', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
};
