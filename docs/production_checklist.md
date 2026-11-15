# Production checklist

Status legend: **Done in code** = implemented and covered by tests or CI in this repository. **Operator** = must be done when
deploying; the repository cannot do it. **Open** = a known gap in the code. "Verified" means exercised by an automated check
named here; nothing below has been verified on a real production environment.

## Security

| Item | Status | Notes |
| --- | --- | --- |
| Server refuses to start without JWT secrets in production | Done in code | `config/secrets.ts` (min 16 chars); unit-tested |
| Generate strong, distinct `JWT_SECRET` / `JWT_REFRESH_SECRET` | Operator | `openssl rand -hex 32`; compose also refuses to start without them |
| Refresh tokens hashed at rest, single use, rotation atomic | Done in code | SHA-256 hash, `findOneAndDelete`; replay check in the smoke script (runs in CI against MongoDB) |
| Cookies: `httpOnly`, `SameSite=Strict`, `Secure` in production | Done in code | requires HTTPS to work in production |
| Serve everything over HTTPS (TLS termination) | Operator | no TLS proxy in compose |
| `CORS_ORIGIN` set to the real client origin | Operator | single exact origin |
| Request validation (zod) and strict whitelists on write bodies | Done in code | profile, routines, recipes, measurements and creates; mass-assignment audit done; ownership checks covered by unit tests and smoke |
| Per-user data scoping on every query | Done in code | audited in the recipe-privacy PR (table in PR #19); no automated guard against new unscoped queries |
| Rate limiting (global, AI, reminders) | Done in code | global limit is per IP |
| Express `trust proxy` for deployments behind a reverse proxy | **Open** | not set; behind a proxy all users share one IP bucket. Needs a configurable setting before putting the API behind a proxy |
| Security headers | Done in code | `helmet` defaults; CSP not customised |
| Secrets in `.env` only, never committed | Operator | `.env.example` documents names only |
| Dependency audit (`npm audit`, `pip audit`) | Operator | not part of CI |
| Admin accounts | Open (PR) | the admin API and `make-admin` script are in an open PR; until merged there is no admin role in use. When merged, admins are created only with `npm run make-admin -- <email>` |
| Password reset | **Open** | forgot-password is a mock that logs a link; there is no email delivery |
| Email verification, 2FA, account lockout | **Open** | not implemented |

## Data

| Item | Status | Notes |
| --- | --- | --- |
| MongoDB authentication enabled | Operator | compose runs Mongo without auth and publishes 27017 |
| Do not expose MongoDB publicly | Operator | remove the port mapping |
| Backups and a tested restore | Operator | none in the repo; see `docs/deployment.md` |
| Indexes | Done in code | created by Mongoose on start; unique indexes on tokens, per-day logs, ledger and idempotency keys |
| Retention / user data export / account deletion | **Open** | no endpoints |

## Reliability and monitoring

| Item | Status | Notes |
| --- | --- | --- |
| Health endpoints | Done in code | server (`db` up/down) and AI service; compose health checks (YAML-parsed only in CI) |
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
| Real browser E2E (Playwright: chromium, firefox, webkit) | `e2e.yml` | Open PR (sprint-5/e2e-ci-and-cleanup); not on `main` yet |
| Docker image builds and `docker compose up` | none | **Not covered by CI** |
| AI provider calls (Ollama/OpenAI/Anthropic) | none | **Never exercised against a real provider** |

## Before the first real deployment
1. Provision HTTPS, set the env vars, generate the secrets, and decide the AI provider (or run with heuristic fallbacks only).
2. Lock down MongoDB and schedule backups; do a restore drill.
3. Decide how the API sits behind your proxy (the `trust proxy` gap above).
4. Seed the exercise catalog and foods.
5. Run `scripts/smoke.sh <your API URL>` against the deployed stack (it registers a throwaway user; use a non-production database
   or clean up afterwards) and click through the app once in a real browser.
