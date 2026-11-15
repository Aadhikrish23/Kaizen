import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { pollInterval } from '../utils/reminderPolling';

export type ReminderType = 'water' | 'meal' | 'weight' | 'workout' | 'sleep';

export interface Reminder {
  type: ReminderType;
  enabled: boolean;
  times: string[];
  days?: number[];
}

export interface ReminderPrefs {
  reminders: Reminder[];
  quietHours: { enabled: boolean; start: string; end: string };
}

export interface DueReminder {
  id: string;
  type: ReminderType;
  time: string;
  date: string;
  message: string;
}

export const useReminderPrefs = () =>
  useQuery<ReminderPrefs>({
    queryKey: ['reminderPrefs'],
    queryFn: async () => (await apiClient.get('/reminders')) as unknown as ReminderPrefs,
    // Fetched once and kept: saving in settings updates this cache directly (see useSaveReminderPrefs)
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export const useSaveReminderPrefs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: ReminderPrefs) => (await apiClient.put('/reminders', prefs)) as unknown as ReminderPrefs,
    onSuccess: (data) => {
      queryClient.setQueryData(['reminderPrefs'], data);
      queryClient.invalidateQueries({ queryKey: ['reminders', 'due'] });
    },
  });
};

/**
 * Polled every 60 s, but only when `enabled` (the saved prefs have a reminder on) and never while the tab is hidden:
 * the interval returns false when hidden, and coming back to the tab triggers a refetch (focus) before polling resumes.
 */
export const useDueReminders = (enabled: boolean) =>
  useQuery<DueReminder[]>({
    queryKey: ['reminders', 'due'],
    queryFn: async () => ((await apiClient.get('/reminders/due')) as unknown as DueReminder[]) || [],
    enabled,
    refetchInterval: () => pollInterval(typeof document !== 'undefined' ? document.visibilityState : undefined),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  });
