# Gamification: XP, levels, streaks, achievements

Source of truth: the `XpEvent` ledger. `UserProgress` (one row per user) is derived from it. The old placeholder fields
`User.xp`, `level`, `streakDays` and `healthScore` (never updated, always the defaults) were removed from the model and from
`/auth/me`. Rules live in `server/src/features/gamification/gamification.logic.ts` (pure, tested).

## Data
- `UserProgress { userId (unique), xp, level, currentStreak, longestStreak, lastActiveDate (YYYY-MM-DD, user's tz), achievements[{key, unlockedAt}] }`
- `XpEvent { userId, type, date, dedupeKey, xp, refId }` with a **unique index on (userId, dedupeKey)**. Every award inserts one
  event; a duplicate key means the award already happened, so awards are idempotent even under concurrent requests.

## XP (only for real, logged actions)
| Action | XP | Cap |
| --- | --- | --- |
| Meal logged | 10 | first 4 per day |
| Water daily goal reached | 15 | once per day |
| Weight logged | 10 | once per day |
| Sleep logged | 10 | once per day |
| Workout performed (at least one completed set) | 50 | once per day |

- Nothing for planned-but-not-performed workouts (a plan day activated into a log with no completed sets), edits, or deletes.
- Anti-farming: dedupe keys are `type:date:slot` (slot 1..cap). Deleting a log does not free its slot, so delete + re-add on the same day
  earns nothing more. Weight and sleep are upserts per day, so editing them earns nothing extra.
- XP is only awarded for **today or yesterday in the user's timezone** (late logging is fine, back-filling old days or future dates is not).
- Awards are a fire-and-forget hook (`recordActivity`) called after the create paths in the meals, water, weight, sleep and workout
  services. It is not awaited and never throws: errors are logged and the primary operation is unaffected.

## Level
`level = floor(sqrt(xp / 100)) + 1`, so XP needed for level n is `100 * (n - 1)^2` (level 2 at 100, 3 at 400, 5 at 1600, 10 at 8100).

## Streaks
A day counts if at least one rewarded action happened on that calendar day in the user's timezone (`lastActiveDate`).
- same day: unchanged; the next day: +1; a gap or first ever action: restarts at 1; an earlier date (late back-fill): unchanged.
- The displayed streak (`effectiveStreak`) is alive only if `lastActiveDate` is today or yesterday; after a missed day it shows 0
  while `longestStreak` is kept. Day arithmetic is on calendar dates, so DST changes (23/25-hour days) never break a streak.

## Achievements
Typed catalog (`ACHIEVEMENTS`) of 12: first meal, first workout, first weigh-in, 5 sleep logs, water goal on 7 days, 7-day and 30-day
streak, 10 and 50 workout days, 10 weigh-in days, level 5 and level 10. Each has a pure progress function over the stats (counts of
XP events by type, longest streak, level). Unlocks are persisted (with `unlockedAt`) and stay unlocked.

## API
`GET /api/v1/gamification` returns `{ progress: {level, xp, xpIntoLevel, xpForNextLevel, percentToNext}, streak: {current, longest,
lastActiveDate, activeToday}, streakAtRisk, achievements: [{key, title, description, target, progress, unlocked, unlockedAt}] }`.
A user with no activity gets zeros and all achievements locked (no fake data).

## Consistency
- After an XP event is inserted, `recomputeProgress` rebuilds `UserProgress` (xp, level, streak, achievements) **from the ledger**.
  It is idempotent and independent of event order, so a failed progress write loses nothing: the next award, or the next
  `GET /gamification` (which compares progress with the ledger and repairs it), restores the correct values. The streak comes
  from the set of dates with at least one event (`streakFromDates`), so back-filling yesterday after today works too.
- The progress upsert has no `$setOnInsert` on the unique `userId` key (which would stop the server from retrying a racing
  upsert) and is retried once on a duplicate-key error, so two concurrent first awards for a new user both succeed.
