import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export const useMeasurements = (date: string) => {
  return useQuery({
    queryKey: ['measurements', date],
    queryFn: async () => {
      const response = await apiClient.get(`/measurements?date=${date}`);
      return response as any;
    }
  });
};

export const useUpsertMeasurement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/measurements', data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['measurements', variables.date] });
    }
  });
};
