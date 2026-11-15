// Per-day memory of which reminders were dismissed or already announced. Pure helpers over a storage-like object so
// they are unit-testable and degrade gracefully when storage is blocked (private mode, quota, etc.).

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const DISMISSED_PREFIX = 'kaizen_reminders_dismissed:';
export const NOTIFIED_PREFIX = 'kaizen_reminders_notified:';

export const loadIds = (store: KeyValueStore | null, prefix: string, date: string): string[] => {
  try {
    const raw = store?.getItem(prefix + date);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

/** Add an id to the day's list and persist it; returns the new list even if persisting fails. */
export const addId = (store: KeyValueStore | null, prefix: string, date: string, id: string): string[] => {
  const ids = loadIds(store, prefix, date);
  if (ids.includes(id)) return ids;
  const next = [...ids, id];
  try {
    store?.setItem(prefix + date, JSON.stringify(next));
  } catch {
    /* storage unavailable: the in-memory state still hides it for this session */
  }
  return next;
};

export const filterUndismissed = <T extends { id: string }>(due: T[], dismissed: string[]): T[] => due.filter((d) => !dismissed.includes(d.id));
