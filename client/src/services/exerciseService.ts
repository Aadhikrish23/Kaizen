import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Exercise } from '../types';

export const useExercises = (muscle?: string) => {
  return useQuery({
    queryKey: ['exercises', muscle],
    queryFn: () => {
      const url = muscle ? `/exercises?muscle=${muscle}` : '/exercises';
      return api.get<Exercise[]>(url);
    },
  });
};

export const useAddExercise = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Exercise>) => api.post<Exercise, Partial<Exercise>>('/exercises', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
};
