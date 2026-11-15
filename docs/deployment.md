# Deployment

How to run Kaizen with Docker Compose, every environment variable in one place, and what an operator still has to do.
Status of each claim is stated plainly: things below were **not** exercised on a real production host from this repository's
CI (CI runs the server against MongoDB 7 and a smoke script; the Docker images and compose file are only YAML-parsed there).

## Services

`docker-compose.yml` defines four services:

| Service | Image / build | Port | Health check |
| --- | --- | --- | --- |
| `mongodb` | `mongo:7` | 27017 (published) | `mongosh` ping |
| `ai_services` | `./ai_services` (python:3.11-slim, uvicorn) | 8000 (internal) | `GET /api/health` (200 while the process is up, even if the LLM provider is down) |
| `server` | `./server` (node:18-alpine, multi-stage) | 5000 | `GET /api/v1/health` must report `"db":"up"` |
| `client` | `./client` (vite build, then nginx) | 80 | none |

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
| `NODE_ENV` | unset | `production` makes the refresh cookie `Secure`, requires the JWT secrets, and lowers the global rate limit to 100. `development`/`test`/unset allow insecure dev-only secret fallbacks. |
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

### AI service (`ai_services/`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `AI_PROVIDER` | `ollama` | `ollama`, `openai` (any OpenAI-compatible gateway) or `anthropic`. |
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
- The bundled nginx (client image) on `main` has no SPA fallback, so a page refresh on a deep link such as `/settings/profile`
  returns 404 behind it. This is fixed in an open PR (sprint-5/e2e-ci-and-cleanup); until it merges, put the SPA fallback in your own
  proxy.

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

## Seed data

Exercise catalog, foods and demo videos come from the scripts in `server/src/scripts/` (for example
`npx ts-node --transpile-only src/scripts/seedComprehensiveExercises.ts` and `seedFoods.ts`), run against the target database.
The planner also syncs its catalog into the database when a plan is generated.
