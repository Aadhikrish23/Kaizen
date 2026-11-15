# Admin panel

## Becoming an admin
There is **no API** that grants the admin role: `role` is not writable through register, login, the profile endpoints
(strict whitelist) or any other route. An operator promotes an existing account from the server:

    cd server
    npm run make-admin -- someone@example.com

(the account must already be registered; the script reads `MONGODB_URI` like the server). An admin can later promote or
demote *other* users in the Admin tab, but never themselves.

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
