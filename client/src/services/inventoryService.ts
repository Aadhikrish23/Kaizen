import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { UserInventory, EquipmentItem } from '../types';

export const useInventory = () => {
  return useQuery<UserInventory>({
    queryKey: ['inventory'],
    queryFn: () => api.get<UserInventory>('/inventory'),
  });
};

export const useUpdateInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (equipment: EquipmentItem[]) => api.post<UserInventory>('/inventory', { equipment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

export const useUpdateWorkingWeight = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      exerciseName: string;
      exerciseId?: string;
      currentWeightKg: number;
      targetReps?: number;
      date?: string;
      rpe?: number;
    }) => api.post<UserInventory>('/inventory/working-weight', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      // A recorded weight can calibrate planned exercises that were waiting for one
      queryClient.invalidateQueries({ queryKey: ['workoutPlan'] });
    },
  });
};
