# Production checklist

Status legend: **Done in code** = implemented and covered by tests or CI in this repository. **Operator** = must be done when
deploying; the repository cannot do it. **Open** = a known gap in the code. "Verified" means exercised by an automated check
named here; nothing below has been verified on a real production environment.

## Security

| Item | Status | Notes |
| --- | --- | --- |
| Server refuses to start without JWT secrets in production | Done in code | `config/secrets.ts` (min 16 chars); covered by `server/test/secrets.test.ts` (fail-fast, length, unset/dev fallbacks) |
| Generate strong, distinct `JWT_SECRET` / `JWT_REFRESH_SECRET` | Operator | `openssl rand -hex 32`; compose also refuses to start without them |
| Refresh tokens hashed at rest, single use, rotation atomic | Done in code | SHA-256 hash, `findOneAndDelete`; replay check in the smoke script (runs in CI against MongoDB) |
| Cookies: `httpOnly`, `SameSite=Strict`, `Secure` in production | Done in code | requires HTTPS to work in production |
| Always set `NODE_ENV=production` outside compose | Operator | an unset `NODE_ENV` is treated as development: insecure fallback JWT secrets (public in the source), non-`Secure` cookie, 5000 rate limit. Compose sets it for the server |
| Serve everything over HTTPS (TLS termination) | Operator | no TLS proxy in compose; add HSTS at the proxy |
| `CORS_ORIGIN` set to the real client origin | Operator | single exact origin |
| Request validation (zod) and strict whitelists on write bodies | Done in code | profile, routines, recipes, measurements and creates; mass-assignment audit done; ownership checks covered by unit tests and smoke |
| Per-user data scoping on every query | Done in code | audited in the recipe-privacy PR (table in PR #19); no automated guard against new unscoped queries |
| Rate limiting (global, AI, reminders, admin) | Done in code | global limit is per IP; admin limit per admin (`ADMIN_RATE_LIMIT_PER_15MIN`, default 300) |
| Express `trust proxy` for deployments behind a reverse proxy | **Open** | not set; behind a proxy all users share one IP bucket. Needs a configurable setting before putting the API behind a proxy |
| Security headers | Done in code | API: `helmet` defaults. Client image (nginx): `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` (checked by the CI docker job). No CSP anywhere (not tested; could break the app); HSTS belongs on the TLS proxy |
| Secrets in `.env` only, never committed | Operator | `.env.example` documents names only |
| Dependency audit (`npm audit`, `pip audit`) | Operator | not part of CI |
| Admin accounts | Done in code | no API can grant admin; operators run `node dist/scripts/makeAdmin.js <email>` (the `npm run make-admin` form needs ts-node, which the production image does not have). Admin routes: authenticated, role-checked, rate limited, audited; the last active admin cannot be demoted or deactivated (small race between two admins acting at the same instant, no transaction) |
| **Upgrade: legacy default admin** | Operator | older `migrateData.ts` created `admin@kaizen.com` with a publicly known password. Run `node dist/scripts/checkDefaultAdmin.js` (exit 3 = found; the server also logs a `[Kaizen SECURITY]` line at startup). Delete or demote and deactivate that account and delete its refresh tokens **before enabling the admin panel**. See `docs/admin.md` |
| Password reset | **Open** | forgot-password is a mock that logs a link; there is no email delivery |
| Email verification, 2FA, account lockout | **Open** | not implemented |

## Data

| Item | Status | Notes |
| --- | --- | --- |
| MongoDB authentication enabled | Operator | compose runs Mongo without auth and publishes 27017 |
| Do not expose MongoDB publicly | Operator | remove the port mapping |
| Backups and a tested restore | Operator | none in the repo; see `docs/deployment.md` |
| Indexes | Done in code | created by Mongoose on start. Unique: per-day logs, the XP ledger and the partial `(userId, clientRequestId)` idempotency indexes. `RefreshToken.tokenHash` has a normal (NON-unique) index for lookups; tokens are random and looked up by hash, uniqueness is not enforced by the database |
| Retention / user data export / account deletion | **Open** | no endpoints |

## Reliability and monitoring

| Item | Status | Notes |
| --- | --- | --- |
| Health endpoints | Done in code | server (`db` up/down) and AI service; compose health checks (not run by CI) |
| AI outage tolerance | Done in code | heuristic fallbacks for coach, insights, food parsing; provider layer returns `None` on failure |
| Central logging, metrics, alerting | Operator | console logs only |
| Uptime monitoring on the health endpoints | Operator | |
| Resource limits and restart policy | Operator | compose sets `restart: always` only |

## Release gates (what CI actually checks)

| Check | Where | Status |
| --- | --- | --- |
| Server and client build (`tsc`, vite) | `ci.yml` on PRs and main | Done |
| Server unit tests (`npm test`) | `ci.yml` (server job) | Done |
| Smoke test against real MongoDB 7 (`scripts/smoke.sh` + `scripts/smoke.d/*.sh`) | `smoke.yml` after merge to main | Done (post-merge, not a PR gate) |
| Real browser E2E (Playwright: chromium, firefox, webkit) | `e2e.yml` on PRs and main | Done (runs against `vite preview`, not the nginx image) |
| Docker image builds, nginx config, SPA fallback and security headers of the client image | `ci.yml` docker job | Added in this PR; see the PR for the run result |
| `docker compose up` of the whole stack | none | **Not covered by CI** |
| AI provider calls (Ollama/OpenAI/Anthropic) | none | **Never exercised against a real provider** |

## Not verified (stated honestly)
- No deployment to a real host has been done; `docker compose up` was never run in CI or by the authors of these docs.
- Real LLM providers, Spoonacular and Open Food Facts calls were never exercised end to end.
- The offline queue and cache behaviour is covered by unit tests of the pure logic and (for the user-switch flow) one E2E spec; the service worker and IndexedDB were not tested in a real offline browser.
- Seed scripts and the admin scripts were not run against a real MongoDB by these docs' authors (the admin API itself is covered by the smoke test).

## Before the first real deployment
1. Provision HTTPS, set the env vars, generate the secrets, and decide the AI provider (or run with heuristic fallbacks only).
2. Lock down MongoDB and schedule backups; do a restore drill.
3. Decide how the API sits behind your proxy (the `trust proxy` gap above).
4. Seed the exercise catalog and foods (`seedFoods` deletes all global foods: only on an empty database, see `docs/deployment.md`). Create the first admin with `makeAdmin` and run `checkDefaultAdmin`.
5. Run `scripts/smoke.sh <your API URL>` against the deployed stack (it registers a throwaway user; use a non-production database
   or clean up afterwards) and click through the app once in a real browser.
