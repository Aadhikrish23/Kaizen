# Timezone rule

**A "day" is a calendar date (`YYYY-MM-DD`) in the user's IANA timezone.**

- Every user has `timezone` (IANA name, default `UTC`). It is validated with `Intl.DateTimeFormat`
  (`isValidTimezone` in `server/src/utils/dates.ts`) in the model and in the register, login and profile-update schemas.
- The client sends the browser's timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) on register and login,
  and on session restore when the stored value is still the default `UTC`. Login only adopts it while the account is on
  the default, so a timezone changed later through the profile endpoint is not overwritten.
- The client works with local calendar dates (`client/src/utils/date.ts`: `localDateString`, `parseLocalDate`). Because the
  stored timezone follows the browser, client and server agree on what "today" is.
  Never use `toISOString().split('T')[0]` for a user-facing date: it is the UTC date, which differs from the local
  date for part of every day. Never parse `'YYYY-MM-DD'` with `new Date(str)` and then use local getters: it is UTC midnight.
- The server derives "today" and buckets by day only through `server/src/utils/dates.ts`:
  - `todayInTz(tz)` / `dateStringInTz(date, tz)`: the calendar date of an instant in `tz`.
  - `addDaysTz(dateStr, n)`: calendar-day arithmetic on date strings (DST-proof: a day is a date, not 24 hours).
  - `weekdayOfDate`, `dateRange`: weekday and inclusive date lists for a date string.
  - `todayForUser(userId)` / `getUserTimezone(userId)` (`utils/userTimezone.ts`) look up the user's zone.
- Used by: analytics (window and per-day buckets), AI context default date, planner default dates, working-weight
  log dates and the workout split schedule (today's weekday). Endpoints that take an explicit `date` from the client
  (meals, water, weight, summary, sleep) store it as given; the client supplies its local date.
- An invalid or missing timezone falls back to `UTC`.
- Known limitation: instants stored as `createdAt` remain UTC timestamps; only the `date` strings follow this rule.
