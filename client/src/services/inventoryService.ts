import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { UserInventory, EquipmentItem } from '../types';

export const useInventory = () => {
  return useQuery<UserInventory>({
    queryKey: ['inventory'],
    queryFn: () => apiClient.get('/inventory'),
  });
};

export const useUpdateInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (equipment: EquipmentItem[]) => apiClient.post('/inventory', { equipment }),
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
    }) => apiClient.post('/inventory/working-weight', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};
