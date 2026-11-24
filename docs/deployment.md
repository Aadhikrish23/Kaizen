# Deployment

How to run Kaizen with Docker Compose, every environment variable in one place, and what an operator still has to do.
Status of each claim is stated plainly: nothing below was exercised on a real production host. What CI does cover: the server
against MongoDB 7 (post-merge smoke script), the real-browser E2E suite (against `vite preview`, not nginx), and, from the docker
job added with this document, a build of both images plus an nginx config, SPA-fallback and security-header check of the client
image. `docker compose up` itself is not run by CI.

## Services

`docker-compose.yml` defines four services:

| Service | Image / build | Port | Health check |
| --- | --- | --- | --- |
| `mongodb` | `mongo:7` | 27017 (published) | `mongosh` ping |
| `ai_services` | `./ai_services` (python:3.11-slim, uvicorn) | 8000 (internal) | `GET /api/health` (200 while the process is up, even if the LLM provider is down) |
| `server` | `./server` (node:20-alpine, multi-stage) | 5000 | `GET /api/v1/health` must report `"db":"up"` |
| `client` | `./client` (vite build on node:20-alpine, then `nginx:alpine` with `client/nginx.conf`) | 80 | none |

`server` waits for a healthy MongoDB; `client` waits for a healthy server.

## Quick start

```bash
cp .env.example .env
# set JWT_SECRET and JWT_REFRESH_SECRET (see "Secrets"), then:
docker compose up --build
# client: http://localhost    API: http://localhost:5000/api/v1    API docs: http://localhost:5000/api-docs
```

Compose refuses to start without the two JWT secrets. For a non-localhost deployment also set `CORS_ORIGIN` (the exact browser
origin of the client) and `VITE_API_URL` (baked into the client bundle at build time; rebuild the client after changing it).

## Environment variables

### Server (`server/`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | unset | **Always set `NODE_ENV=production` outside compose.** `production` makes the refresh cookie `Secure`, requires the JWT secrets, lowers the global rate limit to 100 and hides internal error messages. An unset value is treated as development: insecure fallback secrets (public in the source), a non-`Secure` cookie and a 5000 rate limit. Compose sets it for the server. |
| `PORT` | `5000` | HTTP port |
| `MONGODB_URI` (also `MONGO_URI`) | `mongodb://localhost:27017/kaizen_db` | MongoDB connection string. Compose sets `mongodb://mongodb:27017/kaizen` (no authentication). |
| `JWT_SECRET` | none in production | Signs access tokens (15 min). At least 16 characters; the server exits at startup without it when `NODE_ENV` is not development/test. |
| `JWT_REFRESH_SECRET` | none in production | Signs refresh tokens (7 days). Same rules; use a different value from `JWT_SECRET`. |
| `CORS_ORIGIN` | `http://localhost:5173` | Single allowed browser origin (credentials are enabled). Compose default: `http://localhost`. |
| `AI_SERVICE_URL` | `http://localhost:8000` | Base URL of the AI service. Compose: `http://ai_services:8000`. |
| `SPOONACULAR_API_KEY` | unset | Enables external recipe search; without it the app falls back to the caller's own saved recipes. |
| `API_RATE_LIMIT_MAX` | 100 (production) / 5000 | Global per-IP limit per 15 minutes on `/api`. Only raise for test environments (the post-merge smoke job sets it). |
| `AI_RATE_LIMIT_PER_MIN` | 30 | Per-user limit per minute for LLM-backed routes (chat, parse-food, insights). |
| `AI_LIGHT_RATE_LIMIT_PER_MIN` | 60 | Per-user limit per minute for search and recommendations. |
| `REMINDERS_RATE_LIMIT_PER_USER` / `_PER_IP` | 120 / 3000 | Limits per 15 minutes for the reminders router, which is exempt from the global limiter. |
| `ADMIN_RATE_LIMIT_PER_15MIN` | 300 | Per-admin limit per 15 minutes for `/api/v1/admin/*` (applied after authentication and the admin role check). |

### AI service (`ai_services/`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `AI_PROVIDER` | `nvidia` | Primary backend: `nvidia` (NVIDIA NIM), `ollama`, `openai` (any OpenAI-compatible gateway) or `anthropic`. |
| `AI_FALLBACK_PROVIDERS` | `ollama` | Comma separated providers tried in order when the primary gives no answer; empty for none. Set it empty if you do not run Ollama. |
| `AI_INTERNAL_TOKEN` | none | Shared secret (16+ characters, identical on the server and the AI service) so the AI service's calls back into the API skip the per-IP rate limit. Without it, behind one proxy address all AI traffic shares the 100 requests per 15 minutes budget. |
| `KAIZEN_API_URL` | `http://localhost:5000/api/v1` | Where the AI service reaches the API (compose sets `http://server:5000/api/v1`). |
| `NVIDIA_API_KEY` | none | Required for the `nvidia` provider (secret). Without it the NVIDIA step is skipped and the fallback chain, then the built-in heuristics, answer. |
| `NVIDIA_MODEL`, `NVIDIA_FALLBACK_MODELS`, `NVIDIA_BASE_URL` | `nvidia/nemotron-3-super-120b-a12b`, `openai/gpt-oss-20b`, `https://integrate.api.nvidia.com/v1` | Hosted models are tried in order on the same key; which models a key can use varies by account. |
| `OLLAMA_HOST`, `OLLAMA_MODEL` | `http://localhost:11434`, `phi3:mini` | Local Ollama. Compose default host: `http://host.docker.internal:11434`. |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` | empty, `https://api.openai.com/v1`, `gpt-4o-mini` | OpenAI-compatible provider. |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_VERSION` | empty, `claude-sonnet-4-5`, `https://api.anthropic.com`, `2023-06-01` | Anthropic Messages API. |
| `PORT` | `8000` | Listen port |
| `REQUEST_TIMEOUT_SECONDS` | `60` | Provider request timeout |
| `CORS_ORIGINS` | the four localhost dev origins | Comma separated; `*` is ignored. Compose maps it from `AI_CORS_ORIGINS`. |

Choosing a provider: with no provider reachable, coach replies and food parsing fall back to deterministic heuristics, so the app
works (with plainer answers) even with no LLM. Model ids are only defaults; set them for your account. Keys are read from the
environment only: never commit them.

### Client build

| Argument | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:5000/api/v1` | API base URL baked into the bundle (compose build arg). |

## Secrets

Generate two different random values (32+ bytes) and keep them out of git:

```bash
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET
```

Rotating `JWT_SECRET` invalidates all access tokens (users get a new one through refresh); rotating `JWT_REFRESH_SECRET` signs
everyone out. Refresh tokens are stored only as SHA-256 hashes and are single-use.

## CORS, cookies and HTTPS

- The refresh token is an `httpOnly`, `SameSite=Strict` cookie, `Secure` when `NODE_ENV=production`. A production deployment
  therefore **must be served over HTTPS**, or the browser will not send the cookie and sessions will not refresh.
- `CORS_ORIGIN` must equal the exact origin the browser uses (scheme, host, port).
- Terminate TLS in front of the stack (reverse proxy or load balancer) and forward to the `client` (80) and `server` (5000)
  containers. The compose file does not include a TLS proxy.
- **Reverse proxy and client IPs:** the server does not currently set Express `trust proxy`. Behind a proxy every request appears
  to come from the proxy's IP, so the per-IP rate limits would be shared by all users. Until a configurable `trust proxy` setting
  exists (see the production checklist), run the server so that it sees real client addresses or raise `API_RATE_LIMIT_MAX`.
- The client image serves the SPA with `client/nginx.conf`: deep links and refreshes fall back to `index.html`, hashed `/assets/`
  are cached for a year, and `index.html`, `sw.js`, `registerSW.js` and the manifest are never cached (so a new deploy is picked up).
  It also sends `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` and `Referrer-Policy: strict-origin-when-cross-origin`
  (`client/security-headers.conf`). There is deliberately **no Content-Security-Policy**: a strict one could break the app and
  has not been tested; add one at your proxy only after testing it. Add HSTS at the TLS-terminating proxy.

## MongoDB

- Compose runs MongoDB **without authentication** and publishes 27017 on the host. For anything beyond local use, remove the port
  mapping (or bind to localhost), enable authentication and put the credentials in `MONGODB_URI`.
- Data lives in the `mongodb_data` volume. There is **no backup automation** in this repository. Take regular dumps, e.g.
  `docker compose exec mongodb mongodump --archive --gzip > backup.archive` (restore with `mongorestore --archive --gzip`), and test
  a restore.
- Indexes are created automatically by Mongoose at startup (a deploy that adds a unique index, such as the refresh-token and
  idempotency indexes, builds it on first start).

## Health checks, logs, monitoring

- Server: `GET /api/v1/health` returns `{"success":true,"data":{"status":"ok","db":"up"|"down"}}` (not rate limited, no auth).
- AI service: `GET /api/health` returns 200 with `provider`, `model` and `reachable` (200 even when the provider is down).
- Logs are plain `console` output (`docker compose logs -f server`); there is no structured logging, metrics endpoint or alerting.
  Wire your own log shipping and uptime checks against the health endpoints.

## Upgrade and rollback

```bash
git pull && docker compose build && docker compose up -d      # upgrade
git checkout <previous-tag-or-sha> && docker compose build && docker compose up -d   # roll back the code
```

Rolling back the code does not roll back data. Schema changes so far are additive (new optional fields and indexes), but take a
backup before upgrading. Notable data-affecting changes: refresh tokens are stored hashed (existing sessions were invalidated once),
new users start with an empty equipment inventory, and the gamification `UserProgress` documents are derived data that is rebuilt from the `XpEvent` ledger.

## Admin accounts

There is no API to become an admin; an operator promotes an existing, registered user. The production image has no `ts-node`
(production dependencies only), so use the compiled scripts, not `npm run make-admin`:

```bash
docker compose exec server node dist/scripts/makeAdmin.js someone@example.com
docker compose exec server node dist/scripts/checkDefaultAdmin.js   # exit code 3 = legacy default admin found
```

**Upgrade note (action required if the database ever ran the old `migrateData.ts`):** that script used to create an admin
account `admin@kaizen.com` with a publicly known password. Delete it or demote and deactivate it (and delete its refresh tokens)
before exposing the admin panel; the server logs a `[Kaizen SECURITY]` warning at startup while such an active admin exists. Details:
[admin.md](admin.md). The last active admin cannot be demoted or deactivated.

## Seed data

Seeding is an operator task run from a **checkout with dev dependencies** (`cd server && npm ci`), because the server image has no
`ts-node`. All three seed scripts read `MONGODB_URI`, falling back to `MONGO_URI`, then to a localhost default, so point one of
them at the target database:

```bash
cd server
MONGODB_URI=mongodb://<host>:27017/<db> npx ts-node --transpile-only src/scripts/seedComprehensiveExercises.ts
MONGODB_URI=mongodb://<host>:27017/<db> npx ts-node --transpile-only src/scripts/seedFoods.ts      # DESTRUCTIVE, see below
MONGODB_URI=mongodb://<host>:27017/<db> npx ts-node --transpile-only src/scripts/seedVideos.ts
```

(Inside the production image the compiled equivalents are `node dist/scripts/seedFoods.js` and so on, with the same variables.)

**`seedFoods` deletes every global food (`isCustom: false`) before re-seeding.** That includes cached Open Food Facts foods and
any foods created by admins. Run it once on an empty database; do not re-run it on a live one without a backup. Users' own custom
foods are not touched. The planner also syncs its exercise catalog into the database when a plan is generated.

The seed scripts were not run as part of writing this document.
