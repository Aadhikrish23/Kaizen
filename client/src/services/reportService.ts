import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export interface Adherence {
  average: number;
  target: number;
  adherencePct: number;
  loggedDays: number;
}

export interface ReportDay {
  date: string;
  calories: number | null;
  protein: number | null;
  waterMl: number | null;
  workouts: number;
  sleepMinutes: number | null;
  weightKg: number | null;
}

export interface Report {
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  daysInPeriod: number;
  daysWithData: number;
  minDaysWithData: number;
  sufficient: boolean;
  notEnoughData: string | null;
  missing: string[];
  calories: Adherence | null;
  protein: Adherence | null;
  water: Adherence | null;
  workouts: { count: number; daysWithWorkout: number; totalVolumeKg: number } | null;
  weight: { firstKg: number; lastKg: number; changeKg: number } | null;
  sleep: { averageHours: number; loggedNights: number } | null;
  days: ReportDay[];
}

export const useReport = (period: ReportPeriod, date: string) =>
  useQuery<Report>({
    queryKey: ['report', period, date],
    queryFn: async () => api.get<Report>(`/reports?period=${period}&date=${encodeURIComponent(date)}`),
  });
