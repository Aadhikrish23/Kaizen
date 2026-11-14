import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

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

// Polled every 60 s while the app is open; the server decides what is due and already satisfied.
export const useDueReminders = () =>
  useQuery<DueReminder[]>({
    queryKey: ['reminders', 'due'],
    queryFn: async () => ((await apiClient.get('/reminders/due')) as unknown as DueReminder[]) || [],
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 30 * 1000,
  });
