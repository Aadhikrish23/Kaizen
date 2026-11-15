import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export type GoalProgressStatus = 'no_target' | 'not_enough_data' | 'reached' | 'moving_away' | 'flat' | 'ok';

export interface GoalProgress {
  status: GoalProgressStatus;
  message: string;
  startWeightKg: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  targetDate: string | null;
  remainingKg: number | null;
  percentComplete: number | null;
  requiredWeeklyChangeKg: number | null;
  actualWeeklyChangeKg: number | null;
  estimatedDate: string | null;
  onTrack: boolean | null;
}

export interface GoalHistoryEntry {
  _id: string;
  goal: string | null;
  targetWeightKg: number | null;
  targetDate: string | null;
  startWeightKg: number | null;
  changed: string[];
  createdAt: string;
}

export const useGoalProgress = () =>
  useQuery<GoalProgress>({
    queryKey: ['goalProgress'],
    queryFn: async () => (await apiClient.get('/profile/goal-progress')) as unknown as GoalProgress,
  });

export const useGoalHistory = () =>
  useQuery<GoalHistoryEntry[]>({
    queryKey: ['goalHistory'],
    queryFn: async () => (await apiClient.get('/profile/goal-history')) as unknown as GoalHistoryEntry[],
  });
