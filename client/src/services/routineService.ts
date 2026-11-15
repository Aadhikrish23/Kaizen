import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { WorkoutRoutine } from '../types';

export const useRoutines = () => {
  return useQuery({
    queryKey: ['routines'],
    queryFn: async () => {
      return api.get<WorkoutRoutine[]>('/routines');
    }
  });
};

export const useCreateRoutine = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      return api.post<WorkoutRoutine>('/routines', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    }
  });
};

export const useDeleteRoutine = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/routines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    }
  });
};
