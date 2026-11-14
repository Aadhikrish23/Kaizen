// One timezone rule: a "day" is a calendar date (YYYY-MM-DD) in the user's IANA timezone.
// See docs/timezone.md.

export const DEFAULT_TIMEZONE = 'UTC';

export const isValidTimezone = (tz: unknown): tz is string => {
  if (typeof tz !== 'string' || tz.length === 0) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const resolveTz = (tz?: string | null): string => (isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE);

/** Calendar date (YYYY-MM-DD) of an instant as seen in `tz`. Invalid/missing tz falls back to UTC. */
export const dateStringInTz = (date: Date, tz?: string | null): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: resolveTz(tz),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

/** Today's calendar date in `tz`. `now` is injectable for tests. */
export const todayInTz = (tz?: string | null, now: Date = new Date()): string => dateStringInTz(now, tz);

/**
 * Add whole calendar days to a YYYY-MM-DD string. This is pure calendar arithmetic, so it is
 * unaffected by DST (a day is never 23 or 25 hours here) and needs no timezone.
 */
export const addDaysTz = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
};

/** Day of week (0 = Sunday .. 6 = Saturday) of a YYYY-MM-DD calendar date. */
export const weekdayOfDate = (dateStr: string): number => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

/** Inclusive list of calendar dates from start to end. */
export const dateRange = (startStr: string, endStr: string): string[] => {
  const out: string[] = [];
  for (let d = startStr; d <= endStr; d = addDaysTz(d, 1)) out.push(d);
  return out;
};
