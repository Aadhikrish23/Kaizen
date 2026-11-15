# Kaizen

AI-assisted health tracking platform: nutrition, hydration, weight, sleep and workouts in one daily dashboard, an equipment-aware
adaptive workout planner, an AI coach, reminders, reports and gamification. Named for the Japanese philosophy of *kaizen*
(continuous improvement).

**Status: pre-launch.** The core product works end to end and is covered by unit tests, a post-merge smoke test against MongoDB in
CI and a real-browser E2E workflow (chromium, firefox, webkit). It has **not** been deployed to a production environment from this repository.
Read [docs/production_checklist.md](docs/production_checklist.md) before putting it in front of users. Details:
[docs/implementation/current_state.md](docs/implementation/current_state.md), requirement status:
[docs/product/requirement_traceability_matrix.md](docs/product/requirement_traceability_matrix.md), product context:
[PRODUCT.md](PRODUCT.md), deployment: [docs/deployment.md](docs/deployment.md).

## What is in it

- **Tracking:** water, meals (foods, recipes, external recipe/food import with explicit per-100 g or per-serving basis), weight and
  goals (target date, history, pace), body measurements, sleep (estimated cycle bedtimes), workouts, routines, equipment inventory.
- **Planner:** biomechanical workout engine (14 files in `server/src/features/planner/engine/`); new users start with an empty equipment inventory and choose a preset.
- **AI:** provider-neutral LLM layer in `ai_services/` (Ollama, OpenAI-compatible, Anthropic) for coach chat, daily and weekly
  insights and food-text parsing; every AI feature has a deterministic fallback, and nutrition numbers always come from the food
  database, never from the model.
- **Also:** meal suggestions that fit your remaining macros, grouped global search, in-app reminders, daily/weekly/monthly reports,
  XP/levels/streaks/achievements, an admin panel (users and global foods, audited; [docs/admin.md](docs/admin.md)), offline support
  for simple logs (cached reads and a replay-safe write queue for meals, water, weight and sleep; [docs/offline.md](docs/offline.md)),
  one timezone rule ([docs/timezone.md](docs/timezone.md), [docs/gamification.md](docs/gamification.md)).

## Stack

| Part | Tech |
|---|---|
| `client/` | React 18, TypeScript, Vite 5, TailwindCSS, TanStack Query, React Router 7, Recharts, jsPDF, PWA manifest |
| `server/` | Express 4, TypeScript, Mongoose 8 / MongoDB, JWT (access + hashed single-use refresh tokens), Zod validation, helmet, rate limits |
| `ai_services/` | FastAPI + Pydantic v2, pluggable LLM provider (`AI_PROVIDER`), default local Ollama |
| `e2e/` | Playwright specs (chromium, firefox, webkit) |
| `scripts/` | `smoke.sh` + `smoke.d/*.sh` post-merge smoke checks |

## Architecture

Feature-first on both apps (see [project_rules.md](project_rules.md)). On the server each feature owns its routes, controller, service,
schema and model(s); shared pieces live in `middleware/`, `config/`, `utils/`:

```
server/src/
  features/   auth profile water meals foods recipes externalFood weight measurements sleep exercises workouts routines
              inventory planner analytics summary ai search reports gamification reminders goals
  middleware/  config/  utils/  docs/  scripts/
  server.ts
```

Pure logic (date rules, nutrition scaling, streaks, reminders, reports, goal pace, parsing) is kept in side-effect-free modules with
unit tests. All routes are under `/api/v1`; Swagger UI at `/api-docs` (generated from the zod schemas and covering every route, including admin; tests fail if a route is missing or the file is stale: PR #22, `ecafef7`).

## Running locally

Prerequisites: Node 20 (CI and the Docker images use it), MongoDB, Python 3.10+ (AI service, optional) and, optionally, [Ollama](https://ollama.com).

```bash
# 1. MongoDB
docker run -d --name kaizen-mongo -p 27017:27017 mongo:7

# 2. API (http://localhost:5000)
cd server && npm install
# server/.env: PORT=5000  MONGODB_URI=mongodb://localhost:27017/kaizen_db  CORS_ORIGIN=http://localhost:5173
# (JWT secrets fall back to insecure dev values outside production; set JWT_SECRET and JWT_REFRESH_SECRET to override)
npm run dev

# 3. Web app (http://localhost:5173)
cd client && npm install && npm run dev

# 4. AI service (optional, http://localhost:8000)
cd ai_services && pip install -r requirements.txt && uvicorn app.main:app --port 8000
```

Or the whole stack: `cp .env.example .env`, set the two JWT secrets, `docker compose up --build` (see
[docs/deployment.md](docs/deployment.md)). Seed data: scripts in `server/src/scripts/` (read the warning about `seedFoods` in the deployment doc first).

## Testing

```bash
cd server && npx tsc --noEmit && npm test                 # unit tests (node:test, no database needed)
cd server && npx ts-node --transpile-only src/features/planner/__tests__/plannerEngine.test.ts      # planner suites
cd server && npx ts-node --transpile-only src/features/planner/__tests__/adversarialPlanner.test.ts
cd client && npm run build
cd ai_services && python -m unittest discover tests        # needs pip install -r requirements.txt
scripts/smoke.sh http://localhost:5000/api/v1              # against a running server + MongoDB
cd e2e && npx playwright test --workers=1                  # needs the stack running, client on :5173
```

CI: `ci.yml` (builds and server tests on PRs, plus a Docker image build and nginx check), `e2e.yml` (Playwright on three browsers against a real
MongoDB), `smoke.yml` (real MongoDB smoke after merge to main). The smoke script is modular:
add a check by creating `scripts/smoke.d/NN-name.sh` (rules in the header of `scripts/smoke.sh`).

## Known gaps

Maintained in [docs/production_checklist.md](docs/production_checklist.md) and
[docs/implementation/current_state.md](docs/implementation/current_state.md). Highlights: no email delivery (password reset is a mock),
no reverse-proxy (`trust proxy`) setting, no backup or monitoring automation, `docker compose up` and AI providers never exercised in CI.
Sprint 5 work is merged: #20 `90b711d` (browser E2E in CI, nginx), #21 `40ec3cd` (admin panel), #23 `b6f852e` (offline), #22 `ecafef7` (OpenAPI, typed client), #25 `a4ebba3` (clear the client query cache when the user changes), #24 (launch docs), #26 (user-switch E2E, login error path). Token refresh is single-flight (one shared refresh for parallel 401s, Web Lock across tabs).
