# Offline support

## What works offline
- **Reading**: authenticated `GET` API calls are cached by the service worker (`NetworkFirst`, 4 s network timeout, max 60 entries, 24 h).
  Recently loaded screens keep showing their data. Auth routes, admin routes, `/health` and the reminders poll are never cached.
  The cache is cleared on login and logout so one user's responses are never shown to another.
- **Adding simple logs**: meals, water, weight and sleep. While offline (or when a request fails without any response) the
  entry is stored in IndexedDB with a client-generated `clientRequestId` and replayed when the connection returns (on reconnect, on
  app start, and every 30 s while items are pending). Pending and failed items are listed in the offline banner; failures (e.g. the
  server rejected the data) can be retried or discarded.

## No duplicates
Create endpoints for those four logs accept an optional `clientRequestId`. The server stores it on the document (unique partial
index on `userId` + `clientRequestId`) and a replay returns the existing document instead of creating another. Replays also do not
award gamification XP again (the award hook only runs for the first creation). Weight and sleep (upserts per day) return the stored
log on replay and do not re-apply the replayed body.

## Not queued (needs a connection)
Workouts, the planner, recipes, profile, inventory, routines and every other write fail immediately offline with a clear message
(the API client rejects non-GET requests while offline). The workouts tab shows a "needs connection" notice.

## Limits
- Queued items are tagged with the user and only replayed for that same user. If someone else signs in on the device, the first
  user's queue stays until they sign in again.
- Without IndexedDB (some private modes) the queue is kept in memory and lost on reload.
- The offline state is based on `navigator.onLine` plus request failures; a captive portal can look "online".
- Items rejected by the server (validation, auth) are not retried automatically; transient errors (network, 5xx, 408, 429) are retried
  up to 5 times, then marked failed.
- The cache serves data up to 24 hours old when the network is down; there is no background refresh of other tabs' data.
