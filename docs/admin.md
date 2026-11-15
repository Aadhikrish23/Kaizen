# Admin panel

## Becoming an admin
There is **no API** that grants the admin role: `role` is not writable through register, login, the profile endpoints
(strict whitelist) or any other route. An operator promotes an existing account from the server:

    cd server
    npm run make-admin -- someone@example.com          # development (ts-node)
    node dist/scripts/makeAdmin.js someone@example.com # production / Docker image

(the account must already be registered; the script reads `MONGODB_URI` like the server). The server image contains the
compiled scripts (`tsconfig` includes `src/**/*`, so `npm run build` emits `dist/scripts/*.js`), so in Docker run e.g.
`docker compose exec server node dist/scripts/makeAdmin.js someone@example.com`. An admin can later promote or
demote *other* users in the Admin tab, but never themselves, and the **last remaining active admin can never be demoted
or deactivated** (409 `LAST_ADMIN`; the other admins are counted in the same request). Residual race: two admins demoting
each other at the very same instant can both pass the check because there is no transaction; check the audit log if you
ever end up with no admin and re-run `make-admin`.

## API (`/api/v1/admin/*`)
Order of checks: authenticate (401) then admin role (403) then a per-admin rate limit (`ADMIN_RATE_LIMIT_PER_15MIN`, default 300).

| Route | Purpose |
| --- | --- |
| `GET /stats` | user count, users active in the last 7 days, log counts (total and last 7 days) per type |
| `GET /users?page&limit&q` | paged user list; `q` matches email or name literally (escaped, max 100 chars); only public fields |
| `PATCH /users/:id` | strict body: `role` (`user`/`admin`) and/or `isActive` only. An admin cannot demote or deactivate themselves |
| `GET/POST /foods`, `PATCH/DELETE /foods/:id` | CRUD for **global** foods only (`isCustom: false`); strict whitelisted bodies; users' custom foods are never touched |

Responses never include `passwordHash`, tokens or other internal fields.

## Deactivation
`isActive: false` takes effect immediately: `protect` rejects the account on the next request even with a valid access
token (401 `ACCOUNT_DISABLED`), login returns 403 `ACCOUNT_DISABLED` (after the password check), refresh fails, and all of the
user's refresh tokens are deleted. Existing users without the field count as active.

## Audit log
Every admin write (`user.update`, `food.create`, `food.update`, `food.delete`) is recorded in `AdminAuditLog`
(`adminId`, `action`, `targetType`, `targetId`, changed `before`/`after` fields, timestamp). There is no read endpoint yet;
query the collection directly.

## Client
An Admin tab (stats, users, global foods tables) appears in the dashboard navigation only when `user.role === 'admin'`.
This is cosmetic: the server enforces the role on every request.

## Production scripts
All scripts live in `server/src/scripts` and compile into `dist/scripts`. They read `MONGODB_URI` (or `MONGO_URI`).

| Purpose | Development | Production image |
| --- | --- | --- |
| Promote an admin | `npm run make-admin -- <email>` | `node dist/scripts/makeAdmin.js <email>` |
| Check for the legacy default admin | `npm run check-default-admin` | `node dist/scripts/checkDefaultAdmin.js` |
| Seed foods | `npx ts-node --transpile-only src/scripts/seedFoods.ts` | `node dist/scripts/seedFoods.js` |
| Seed exercises / videos | `npx ts-node --transpile-only src/scripts/seedComprehensiveExercises.ts` (and `seedVideos.ts`) | `node dist/scripts/seedComprehensiveExercises.js`, `node dist/scripts/seedVideos.js` |
| Assign pre-ownership records to an existing user | `npx ts-node --transpile-only src/scripts/migrateData.ts <email>` | `node dist/scripts/migrateData.js <email>` |

The seed scripts were not run as part of this change.

## UPGRADE NOTE: legacy default admin (action required)
Older versions of `migrateData.ts` created an account `admin@kaizen.com` with a fixed, publicly known password and the
`admin` role. With the admin API live, any database where that script ever ran has a publicly known admin login.
The script no longer creates any user (it now needs the e-mail of an existing account). For every existing database:

1. Run `node dist/scripts/checkDefaultAdmin.js` (read-only; exit code 3 means such an admin exists). The server also logs a
   `[Kaizen SECURITY]` line at startup when it finds one. Neither prints any secret.
2. Promote your real admin first (`makeAdmin`), then delete the legacy account or demote and deactivate it
   (Admin tab, or directly in the database).
3. Rotate its sessions: deactivating through the Admin tab deletes its refresh tokens; if you delete or demote it directly in
   MongoDB, also delete its documents from the `refreshtokens` collection (and change its password if you keep it).
