// Pure helpers deciding whether and how often to poll /reminders/due.
export interface PollPrefs {
  reminders: Array<{ enabled: boolean; times: string[] }>;
}

/** Poll only when at least one reminder is enabled and has a time. */
export const hasEnabledReminders = (prefs: PollPrefs | undefined | null): boolean =>
  !!prefs && prefs.reminders.some((r) => r.enabled && r.times.length > 0);

export const DUE_POLL_MS = 60 * 1000;

/** Poll interval for the current tab state: false pauses polling while the tab is hidden. */
export const pollInterval = (visibility: string | undefined): number | false => (visibility === 'hidden' ? false : DUE_POLL_MS);
