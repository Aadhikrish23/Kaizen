import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { MeasurementLog } from '../types';

export type MeasurementInput = { date: string } & Partial<Omit<MeasurementLog, '_id' | 'date'>>;

export const useMeasurements = (date: string) => {
  return useQuery({
    queryKey: ['measurements', date],
    queryFn: async () => {
      return api.get<MeasurementLog[]>(`/measurements?date=${date}`);
    }
  });
};

export const useUpsertMeasurement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: MeasurementInput) => {
      return api.post<MeasurementLog, MeasurementInput>('/measurements', data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['measurements', variables.date] });
    }
  });
};
