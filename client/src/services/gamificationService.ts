import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export interface AchievementStatus {
  key: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface GamificationData {
  progress: { level: number; xp: number; xpIntoLevel: number; xpForNextLevel: number; percentToNext: number };
  streak: { current: number; longest: number; lastActiveDate: string | null; activeToday: boolean };
  streakAtRisk: boolean;
  achievements: AchievementStatus[];
}

export const useGamification = () =>
  useQuery<GamificationData>({
    queryKey: ['gamification'],
    queryFn: async () => api.get<GamificationData>('/gamification'),
    staleTime: 30 * 1000,
  });
